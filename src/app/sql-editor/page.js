'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function SqlEditorPage() {
  const [sql, setSql] = useState('');
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);

  async function runDirectInsert() {
    if (!sql.trim()) return;
    setRunning(true);
    setResult(null);

    const lines = sql.split('\n');
    const newLog = [];
    let successCount = 0;
    let errorCount = 0;

    let currentStmt = '';
    const statements = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('--')) continue;
      currentStmt += ' ' + trimmed;
      if (trimmed.endsWith(';')) {
        statements.push(currentStmt.trim().replace(/;$/, ''));
        currentStmt = '';
      }
    }
    if (currentStmt.trim()) {
      statements.push(currentStmt.trim().replace(/;$/, ''));
    }

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (!stmt) continue;

      const upperStmt = stmt.toUpperCase().trim();

      try {
        if (upperStmt.startsWith('UPDATE ID_COUNTERS')) {
          const match = stmt.match(/SET\s+current_value\s*=\s*(\d+)\s+WHERE\s+counter_name\s*=\s*'(\w+)'/i);
          if (match) {
            const { error } = await supabase.from('id_counters').update({ current_value: parseInt(match[1]) }).eq('counter_name', match[2]);
            if (error) throw error;
            newLog.push({ idx: i + 1, status: 'ok', sql: stmt.slice(0, 80), message: 'OK - counter updated' });
            successCount++;
            continue;
          }
        }

        if (upperStmt.startsWith('INSERT INTO CUSTOMERS')) {
          const valuesMatch = stmt.match(/VALUES\s*\n?([\s\S]+)$/i);
          if (valuesMatch) {
            const rowRegex = /\(\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*\)/g;
            let rowMatch;
            let inserted = 0;
            const rawValues = valuesMatch[1];

            const rows = rawValues.split(/\),\s*\n?\s*\(/);
            for (const row of rows) {
              const clean = row.replace(/^\(/, '').replace(/\).*$/, '');
              const parts = [];
              let current = '';
              let inQuote = false;
              for (let c = 0; c < clean.length; c++) {
                const ch = clean[c];
                if (ch === "'" && !inQuote) { inQuote = true; continue; }
                if (ch === "'" && inQuote) {
                  if (clean[c + 1] === "'") { current += "'"; c++; continue; }
                  inQuote = false; continue;
                }
                if (ch === ',' && !inQuote) { parts.push(current.trim()); current = ''; continue; }
                if (inQuote || ch !== ' ') current += ch;
              }
              parts.push(current.trim());

              if (parts.length >= 7) {
                const { error } = await supabase.from('customers').upsert({
                  item_id: parts[0],
                  guest_name: parts[1],
                  nationality: parts[2],
                  customer_type: parts[3],
                  customer_detail: parts[4],
                  sale_person: parts[5],
                  created_at: parts[6],
                }, { onConflict: 'item_id' });

                if (error) {
                  newLog.push({ idx: i + 1, status: 'error', sql: `INSERT ${parts[0]}`, message: error.message });
                  errorCount++;
                } else {
                  inserted++;
                }
              }
            }
            newLog.push({ idx: i + 1, status: 'ok', sql: 'INSERT INTO customers', message: `OK - ${inserted} rows inserted` });
            successCount++;
            continue;
          }
        }

        newLog.push({ idx: i + 1, status: 'error', sql: stmt.slice(0, 80), message: 'ไม่รองรับคำสั่งนี้ — ใช้ Supabase Dashboard SQL Editor แทน' });
        errorCount++;

      } catch (err) {
        newLog.push({ idx: i + 1, status: 'error', sql: stmt.slice(0, 60), message: err.message });
        errorCount++;
      }
    }

    setLog(newLog);
    setResult({ total: statements.length, success: successCount, errors: errorCount });
    setRunning(false);
    if (errorCount === 0) toast.success(`รัน ${successCount} คำสั่งสำเร็จ`);
    else toast.error(`สำเร็จ ${successCount} / ผิดพลาด ${errorCount}`);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">🛠️ SQL Editor</h2>
        <Link href="/" className="btn btn-outline-primary">← กลับหน้าหลัก</Link>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--color-text-secondary)]">
            วาง SQL แล้วกด Run เพื่อ import ข้อมูลเข้า Supabase
          </p>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                try { setSql(await (await fetch('/migrate-customers.sql')).text()); }
                catch { toast.error('โหลดไฟล์ migrate-customers.sql ไม่สำเร็จ'); }
              }}
              className="btn btn-ghost text-sm px-3 py-2"
            >
              📋 โหลด SQL ลูกค้า
            </button>
          </div>
        </div>

        <textarea
          className="input font-mono text-sm"
          rows={16}
          value={sql}
          onChange={e => setSql(e.target.value)}
          placeholder="วาง SQL ที่นี่..."
          style={{ resize: 'vertical' }}
        />

        <div className="flex gap-2">
          <button onClick={runDirectInsert} disabled={running || !sql.trim()} className="btn btn-primary">
            {running ? '⏳ กำลังรัน...' : '▶️ Run (Direct Insert)'}
          </button>
          <button onClick={() => { setSql(''); setLog([]); setResult(null); }} className="btn btn-ghost">
            🗑️ Clear
          </button>
        </div>

        {result && (
          <div className={`p-4 rounded-xl border ${result.errors === 0 ? 'border-[var(--color-success)] bg-[var(--color-success-light)]' : 'border-[var(--color-warning)] bg-[var(--color-warning-light)]'}`}>
            <p className="font-semibold">ผลลัพธ์: {result.success} สำเร็จ / {result.errors} ผิดพลาด (จาก {result.total} คำสั่ง)</p>
          </div>
        )}

        {log.length > 0 && (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {log.map((l, i) => (
              <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm font-mono ${l.status === 'ok' ? 'bg-[var(--color-success-light)]' : 'bg-[var(--color-danger-light)]'}`}>
                <span className="shrink-0">{l.status === 'ok' ? '✅' : '❌'}</span>
                <div className="min-w-0">
                  <span className="text-[var(--color-text-muted)]">#{l.idx}</span>{' '}
                  <span className="break-all">{l.message}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-6">
        <h3 className="font-semibold mb-3">📖 วิธีใช้</h3>
        <div className="text-sm text-[var(--color-text-secondary)] space-y-2">
          <p>1. กดปุ่ม <strong>"โหลด SQL ลูกค้า"</strong> เพื่อโหลด SQL สำหรับ import ลูกค้าทั้งหมด (จากไฟล์ <code>migrate-customers.sql</code>)</p>
          <p>2. กด <strong>"Run (Direct Insert)"</strong> เพื่อรันโดยตรงผ่าน Supabase JS (รองรับเฉพาะ INSERT INTO customers และ UPDATE id_counters เท่านั้น)</p>
          <p>3. ต้องการ import <strong>Tour / Hotel</strong> ครบทั้งหมด หรือรัน SQL อื่น (CREATE TABLE, ALTER, ฯลฯ) ให้รันไฟล์ <code>import-old-data.sql</code> ใน <strong>Supabase Dashboard → SQL Editor</strong></p>
        </div>
      </div>
    </div>
  );
}
