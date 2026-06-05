'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  arrayMove, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// หมวด dropdown แยกตามประเภทการใช้งาน (จองทัวร์ / จองโรงแรม / ข้อมูลลูกค้า / Taxi)
const CATEGORY_GROUPS = [
  { group: 'จองทัวร์', icon: '🗺️', items: [
    { key: 'tour_name', label: 'ชื่อทัวร์' }, { key: 'company_name', label: 'บริษัท' },
  ] },
  { group: 'จองโรงแรม', icon: '🏨', items: [
    { key: 'hotel_name', label: 'โรงแรม' }, { key: 'room_name', label: 'ประเภทห้อง' },
    { key: 'booking_type', label: 'ช่องทางจอง' },
  ] },
  { group: 'ข้อมูลลูกค้า', icon: '👤', items: [
    { key: 'nationality', label: 'สัญชาติ' }, { key: 'customer_type', label: 'ประเภทลูกค้า' },
    { key: 'sale_person', label: 'พนักงานขาย' },
  ] },
  { group: 'Taxi Booking', icon: '🚕', items: [
    { key: 'taxi_job_type', label: 'ประเภทงานแท็กซี่' }, { key: 'taxi_vehicle_type', label: 'ประเภทรถแท็กซี่' },
    { key: 'taxi_location', label: 'สถานที่รับ-ส่ง (แท็กซี่)' },
  ] },
];
// แบนเป็นลิสต์เดียวสำหรับ init/loadAll และหา meta ของแท็บที่เลือก
const CATEGORIES = CATEGORY_GROUPS.flatMap(g => g.items.map(it => ({ ...it, group: g.group, icon: g.icon })));

function SortableRow({ item, index, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : undefined };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between px-3 sm:px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button type="button" {...attributes} {...listeners} className="drag-handle shrink-0 cursor-grab active:cursor-grabbing touch-none text-[var(--color-text-muted)]" aria-label="ลากเพื่อจัดลำดับ">≡</button>
        <span className="text-sm text-[var(--color-text-muted)] w-6 shrink-0">{index + 1}.</span>
        <span className="font-medium truncate">{item.value}</span>
      </div>
      <button onClick={() => onDelete(item.id)} className="action-btn text-[var(--color-danger)] shrink-0">🗑️</button>
    </div>
  );
}

export default function DatabasePage() {
  const [data, setData] = useState({});
  const [activeTab, setActiveTab] = useState('nationality');
  const [newValue, setNewValue] = useState('');
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const { data: rows } = await supabase.from('dropdowns').select('*').order('sort_order').order('id');
    const grouped = {};
    CATEGORIES.forEach(c => grouped[c.key] = []);
    (rows || []).forEach(r => { if (grouped[r.category]) grouped[r.category].push(r); });
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

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const items = data[activeTab] || [];
    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(items, oldIndex, newIndex);
    setData(prev => ({ ...prev, [activeTab]: reordered })); // optimistic
    // persist new sort_order (1-based) for every row in this category
    const updates = reordered.map((it, idx) => supabase.from('dropdowns').update({ sort_order: idx + 1 }).eq('id', it.id));
    const results = await Promise.all(updates);
    if (results.some(r => r.error)) { toast.error('บันทึกลำดับไม่สำเร็จ'); loadAll(); }
  }

  const items = data[activeTab] || [];
  const activeMeta = CATEGORIES.find(c => c.key === activeTab) || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold">⚙️ ตั้งค่า Dropdown</h2>
        <Link href="/" className="btn btn-outline-primary w-full sm:w-auto justify-center">← กลับหน้าหลัก</Link>
      </div>
      <div className="card p-4 sm:p-6">
        <div className="space-y-4 mb-6">
          {CATEGORY_GROUPS.map(g => (
            <div key={g.group}>
              <div className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <span>{g.icon}</span> {g.group}
              </div>
              <div className="flex flex-wrap gap-2">
                {g.items.map(c => (<button key={c.key} onClick={() => setActiveTab(c.key)} className={`cursor-pointer px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === c.key ? 'bg-[var(--color-brand)] text-white' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'}`}>{c.label}</button>))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm mb-3 px-1">
          <span className="text-[var(--color-text-muted)]">กำลังตั้งค่า:</span>
          <span className="font-semibold text-[var(--color-brand)]">{activeMeta.icon} {activeMeta.group}</span>
          <span className="text-[var(--color-text-muted)]">›</span>
          <span className="font-semibold">{activeMeta.label}</span>
        </div>
        <form onSubmit={handleAdd} className="flex gap-2 mb-6">
          <input className="input flex-1 min-w-0" placeholder="เพิ่มรายการใหม่..." value={newValue} onChange={e => setNewValue(e.target.value)} />
          <button type="submit" className="btn btn-primary shrink-0">＋ เพิ่ม</button>
        </form>
        {loading ? <div className="flex justify-center py-12"><div className="w-7 h-7 border-3 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" /></div>
        : items.length === 0 ? <p className="text-center text-[var(--color-text-muted)] py-8">ยังไม่มีข้อมูล</p>
        : <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {items.map((item, idx) => (<SortableRow key={item.id} item={item} index={idx} onDelete={handleDelete} />))}
              </div>
            </SortableContext>
          </DndContext>
        }
      </div>
    </div>
  );
}
