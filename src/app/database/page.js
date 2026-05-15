'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';

const CATEGORIES = [
  { key: 'nationality', label: 'สัญชาติ (Nationality)' },
  { key: 'customer_type', label: 'ประเภทลูกค้า (Customer Type)' },
  { key: 'sale_person', label: 'พนักงานขาย (Sale Person)' },
  { key: 'tour_name', label: 'ชื่อทัวร์ (Tour Name)' },
  { key: 'company_name', label: 'บริษัท (Company Name)' },
  { key: 'hotel_name', label: 'โรงแรม (Hotel Name)' },
  { key: 'room_name', label: 'ประเภทห้อง (Room Name)' },
  { key: 'booking_type', label: 'ช่องทางจอง (Booking Type)' },
];

export default function DatabasePage() {
  const [data, setData] = useState({});
  const [activeTab, setActiveTab] = useState('nationality');
  const [newValue, setNewValue] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const { data: rows } = await supabase.from('dropdowns').select('*').order('sort_order').order('id');
    const grouped = {};
    CATEGORIES.forEach(c => grouped[c.key] = []);
    (rows || []).forEach(r => {
      if (grouped[r.category]) grouped[r.category].push(r);
    });
    setData(grouped);
    setLoading(false);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!newValue.trim()) return;
    const maxOrder = (data[activeTab] || []).reduce((m, d) => Math.max(m, d.sort_order || 0), 0);
    const { error } = await supabase.from('dropdowns').insert({ category: activeTab, value: newValue.trim(), sort_order: maxOrder + 1 });
    if (error) { toast.error(error.message); return; }
    setNewValue('');
    toast.success('เพิ่มแล้ว');
    loadAll();
  }

  async function handleDelete(id) {
    await supabase.from('dropdowns').delete().eq('id', id);
    toast.success('ลบแล้ว');
    loadAll();
  }

  const items = data[activeTab] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">📋 ฐานข้อมูล Dropdown</h2>
        <Link href="/" className="btn btn-outline-primary">← กลับหน้าหลัก</Link>
      </div>

      <div className="card p-6">
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => setActiveTab(c.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === c.key ? 'bg-[var(--color-brand)] text-white' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleAdd} className="flex gap-2 mb-6">
          <input className="input flex-1" placeholder="เพิ่มรายการใหม่..." value={newValue} onChange={e => setNewValue(e.target.value)} />
          <button type="submit" className="btn btn-primary">＋ เพิ่ม</button>
        </form>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-3 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-[var(--color-text-muted)] py-8">ยังไม่มีข้อมูล</p>
        ) : (
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={item.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[var(--color-text-muted)] w-6">{idx + 1}.</span>
                  <span className="font-medium">{item.value}</span>
                </div>
                <button onClick={() => handleDelete(item.id)} className="action-btn text-[var(--color-danger)]">🗑️</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
