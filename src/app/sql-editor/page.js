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
            <button onClick={() => setSql(MIGRATE_SQL)} className="btn btn-ghost text-sm px-3 py-2">
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
          <p>1. กดปุ่ม <strong>"โหลด SQL ลูกค้า"</strong> เพื่อโหลด SQL สำหรับ import ลูกค้า 76 รายการ</p>
          <p>2. กด <strong>"Run (Direct Insert)"</strong> เพื่อรันโดยตรงผ่าน Supabase JS (รองรับเฉพาะ INSERT INTO customers และ UPDATE id_counters เท่านั้น)</p>
          <p>3. ถ้าต้องการรัน SQL อื่น (CREATE TABLE, ALTER, ฯลฯ) ให้ใช้ <strong>Supabase Dashboard → SQL Editor</strong> แทน</p>
        </div>
      </div>
    </div>
  );
}

const MIGRATE_SQL = `UPDATE id_counters SET current_value = 78 WHERE counter_name = 'customer';

INSERT INTO customers (item_id, guest_name, nationality, customer_type, customer_detail, sale_person, created_at) VALUES
('VC-000001', 'Mr.Ghamran Almarar', 'UAE', 'Agency Booking', '2AD+1CH (7 years old)', 'Khun Eve Bkk', '2025-10-10'),
('VC-000002', 'Phuntasanya Pasuphan', 'Thai', 'Agency Booking', '2AD THAI', 'Fon CEI', '2025-10-12'),
('VC-000003', 'Mr.Abdulla Almannai', 'Other', 'Agency Booking', '2AD', 'Sama Travel', '2025-10-11'),
('VC-000004', 'Mr.Mohamed Al Abi', 'Other', 'Agency Booking', '2AD', 'Fon SeaPearl', '2025-10-12'),
('VC-000005', 'วริษา', 'Thai', 'Agency Booking', '4AD+1CH', '', '2025-10-12'),
('VC-000006', 'Mr.Rami Arafat', 'Other', 'Agency Booking', '2AD', 'P''Nee Taxi', '2025-10-12'),
('VC-000007', 'Mr.Abdulla Aljneibi', 'UAE', 'New: Customer Recom', '2AD+3CH+1INF', 'Paula', '2025-10-13'),
('VC-000008', 'Mrs.Layal Gebara', 'UAE', 'Agency Booking', '2AD', 'Sama Travel', '2025-10-13'),
('VC-000009', 'William Lewis', 'Other', 'New : Other', '3AD', 'Viator', '2025-10-13'),
('VC-000010', 'Dr.Saud Bin Askar', 'Saudi', 'Royalty', '1AD', 'Paula', '2025-10-13'),
('VC-000011', 'Mr.Badrul Hisham Irwan', 'Other', 'Agency Booking', '2AD', 'P''Nee Taxi', '2025-10-14'),
('VC-000012', 'Mr.Akash Rajanna', 'India', 'Agency Booking', '30Pax', '', '2025-10-14'),
('VC-000013', 'รตอ มีชัย ศุภางค์จรัส', 'Thai', 'Agency Booking', '', 'Other', '2025-10-14'),
('VC-000014', 'Mr.Abdullah Aljneibi', '', '', '', '', '2025-10-15'),
('VC-000015', 'Mr.Abdulla Aljneibi', 'UAE', 'New: Customer Recom', '4Pax', 'Paula', '2025-11-03'),
('VC-000016', 'Abdullah', 'Other', 'Agency Booking', '2AD', 'Other', '2025-10-15'),
('VC-000017', 'Mr.Behnam Savadkouhi', 'Other', 'New : Other', '4AD', 'Paula', '2025-10-16'),
('VC-000018', 'Musaed Almanea', 'Kuwait', 'Returning', '2AD', 'Paula', '2025-10-20'),
('VC-000019', 'Mr.Fadi Chiha', 'Other', 'Agency Booking', '2AD', 'Sama Travel', '2025-10-16'),
('VC-000020', 'Mr.Sufyan Abdulmajeed', 'Other', 'New : Other', '2AD', 'Paula', '2025-10-16'),
('VC-000021', 'คุณกนกพร ธรรมวัฒน์', 'Thai', 'Agency Booking', '2AD+1CH', 'Jedar', '2025-10-16'),
('VC-000022', 'Dr.Abdulla Dawaishan', 'Other', 'Agency Booking', '2Ad', 'Fon SeaPearl', '2025-10-16'),
('VC-000023', 'Ms.Elham Abdulaziz', 'Other', 'Agency Booking', '2AD', 'Sama Travel', '2025-10-17'),
('VC-000024', 'Mr.Abdullah Aljneibi', 'UAE', 'New: Customer Recom', '3+3Pax', 'Paula', '2025-10-20'),
('VC-000025', 'Fahad Aldoseri', 'Kuwait', 'New: Customer Recom', '4AD', 'Paula', '2025-10-17'),
('VC-000026', 'Abdalla Alnaqbi', 'UAE', 'Returning', '2AD', 'Paula', '2025-10-20'),
('VC-000027', 'Mr.Rashid Alali', 'UAE', 'Returning', '1AD', 'Paula', '2025-10-18'),
('VC-000028', 'Ms.Wadhha Alhameli', 'UAE', 'Agency Booking', '8Pax', 'Khun Eve Bkk', '2025-10-19'),
('VC-000029', 'Mr.Mohamed Al Ali', 'UAE', 'Returning', '2AD', 'Paula', '2025-10-20'),
('VC-000030', 'คุณนภพร ไอยรา', 'Thai', 'Agency Booking', '1+1Pax', 'Other', '2025-10-19'),
('VC-000031', 'กรณิศ ฉลาดแฉลม', 'Thai', 'Agency Booking', '3AD+3CH', 'Jedar', '2025-10-19'),
('VC-000032', 'Mr.Jayesh', 'India', 'Agency Booking', '5AD', 'Other', '2025-10-19'),
('VC-000033', 'Dr.Saud Bin Askar', 'Saudi', 'Royalty', '1', 'Paula', '2025-11-12'),
('VC-000034', 'Noor', 'Kuwait', 'Agency Booking', 'AccaTour', 'Other', '2025-10-20'),
('VC-000035', 'Bharanish Reddy', 'Other', 'New : Other', '2AD+1INF', 'Other', '2025-10-20'),
('VC-000036', 'Wadhha Alhameli', 'UAE', 'Agency Booking', '8', '', '2025-10-20'),
('VC-000037', 'Wadhha Alhameli', 'UAE', 'Agency Booking', '8', 'Khun Eve Bkk', '2025-10-20'),
('VC-000038', 'Mr.Yusif Alhamar & Mr.Esam Alrayes', 'Bahrain', 'Royalty', '2', 'Paula', '2025-10-23'),
('VC-000039', 'Mr.Umesh Prakash', 'India', 'Agency Booking', '8', 'P Pum', '2025-10-20'),
('VC-000040', 'Mr.Srirama Krishnan', 'India', 'Agency Booking', '4AD', 'P Pum', '2025-10-20'),
('VC-000041', 'MINESH PATEL', 'India', 'Agency Booking', 'Vistor', 'Viator', '2025-10-21'),
('VC-000042', 'Mr.Saif Alshibli', 'UAE', 'New : Other', 'Ref 2509/47', 'Paula', '2025-10-21'),
('VC-000043', 'Dawoud', 'Kuwait', 'Agency Booking', 'Ref2510/13', 'Other', '2025-10-21'),
('VC-000044', 'สุชาดา โชคธวัชชัย', 'Thai', 'Agency Booking', '5AD', 'Jedar', '2025-10-21'),
('VC-000045', 'สุรศักดิ์ โรจน์ชะยะ', 'Thai', 'Agency Booking', '1AD', 'Other', '2025-10-22'),
('VC-000046', 'Hasan Alali', 'Other', 'Agency Booking', '2', 'Sama Travel', '2025-10-22'),
('VC-000047', 'Mr.Fahad Almazyad', 'Saudi', 'New: Customer Recom', '4AD', 'Paula', '2025-10-25'),
('VC-000048', 'Tabasom', 'UAE', 'New: Customer Recom', '1', 'Paula', '2025-10-23'),
('VC-000049', 'Tarek', 'Other', 'Agency Booking', '37Pax', 'Sama Travel', '2025-10-23'),
('VC-000050', 'Mr.Kailash Metharam', 'India', 'Agency Booking', '9Pax', 'P Pum', '2025-10-24'),
('VC-000051', 'ทศพล', 'Thai', 'Agency Booking', '', 'Jedar', '2025-10-25'),
('VC-000052', 'ณิลินยา', 'Thai', 'Agency Booking', '', 'Paula', '2025-10-25'),
('VC-000053', 'Mr. Youssef Abdulrahman', 'UAE', 'New: Customer Recom', '', 'Paula', '2025-10-25'),
('VC-000054', 'Mr.Nitin dhande', 'India', 'Agency Booking', '2AD', 'P Pum', '2025-10-26'),
('VC-000055', 'Saeed', 'UAE', 'New: Customer Recom', '5AD', 'Joseph', '2025-10-26'),
('VC-000056', 'Raed Ali Alnasser', 'Oman', 'Agency Booking', '2AD', 'FuFu', '2025-10-27'),
('VC-000057', 'Bolosnejke', 'Other', 'Agency Booking', '3AD', 'Jedar', '2025-10-27'),
('VC-000058', 'Ibrahim Alanazi', 'Saudi', 'New: Snap', '4AD', 'Paula', '2025-10-28'),
('VC-000059', 'Fadhel Saliman', 'India', 'New : Other', '2AD', 'Joseph', '2025-10-28'),
('VC-000060', 'Sonia Fernandes', 'Other', 'Agency Booking', '4AD', 'Joseph', '2025-10-28'),
('VC-000061', 'Lynnene Wiltshire', 'Other', 'Agency Booking', '2AD', 'Joseph', '2025-10-28'),
('VC-000062', 'Vlad', 'Other', 'Agency Booking', '2AD', 'Joseph', '2025-10-28'),
('VC-000063', 'Jayesh Patel', 'India', 'Agency Booking', '5+1Pax', 'Joseph', '2025-10-28'),
('VC-000064', 'Abdulla', 'Oman', 'Agency Booking', '2AD', 'FuFu', '2025-10-28'),
('VC-000066', 'Basit Mohammed', 'Bahrain', 'New : Other', '2AD', 'Paula', '2025-10-29'),
('VC-000067', 'Manish', 'India', 'Agency Booking', '2 AD + 1 CH (2AD use ComVoucher)', 'Joseph', '2025-10-30'),
('VC-000068', 'Mr.Youssef Aldulrahman', 'UAE', 'New : Other', '3AD', 'Paula', '2025-10-30'),
('VC-000069', 'Mr. Yousif Alhamar', 'Bahrain', 'Royalty', '', 'Paula', '2025-10-30'),
('VC-000070', 'Roberto', 'Other', 'Agency Booking', '10AD', 'Taxi(Other)', '2025-11-02'),
('VC-000071', 'Mouniya Hrimch, Fahad Alnuaimi', 'Morroco', 'New: Customer Recom', '2 AD', 'Paula', '2025-11-01'),
('VC-000073', 'Ethel Wolka Co', 'Other', 'Agency Booking', '', 'Other', '2025-11-01'),
('VC-000074', 'Surinee', 'Thai', 'Paula''s Friend', '3', 'Paula', '2025-11-01'),
('VC-000075', 'Bharesh', 'India', 'Agency Booking', '6+3Pax', 'Joseph', '2025-11-02'),
('VC-000076', 'Mohamad', 'Saudi', 'Agency Booking', '1', 'Joseph', '2025-11-02'),
('VC-000077', 'Bansi', 'India', 'Agency Booking', '2AD', 'Joseph', '2025-11-02'),
('VC-000078', 'Jessica Walker', 'Other', 'Agency Booking', '', '', '2025-11-02')
ON CONFLICT (item_id) DO NOTHING;`;
