'use client';
import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import TourModal from '@/components/TourModal';
import HotelModal from '@/components/HotelModal';
import SelectWithOther from '@/components/SelectWithOther';
import { backupCustomerById } from '@/lib/backup';

export default function EditCustomerPage({ params }) {
  const { id: itemId } = use(params);
  const router = useRouter();
  const [dropdowns, setDropdowns] = useState({});
  const [form, setForm] = useState({ guestName: '', nationality: '', customerType: '', customerDetail: '', salePerson: '' });
  const [customerId, setCustomerId] = useState(null);
  const [tourBlocks, setTourBlocks] = useState([]);
  const [hotelBlocks, setHotelBlocks] = useState([]);
  const [showTourModal, setShowTourModal] = useState(false);
  const [showHotelModal, setShowHotelModal] = useState(false);
  const [editingTourIdx, setEditingTourIdx] = useState(null);
  const [editingHotelIdx, setEditingHotelIdx] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDropdowns(); loadCustomer(); }, []);

  // honour the "เพิ่มรายการ" (＋) link from the home page: /customers/<id>?add=true auto-opens the Tour modal
  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('add') === 'true') { setEditingTourIdx(null); setShowTourModal(true); }
  }, [loading]);

  async function loadDropdowns() { const { data } = await supabase.from('dropdowns').select('*').order('sort_order'); const grouped = {}; (data || []).forEach(d => { if (!grouped[d.category]) grouped[d.category] = []; grouped[d.category].push(d.value); }); setDropdowns(grouped); }

  async function loadCustomer() {
    try {
      const { data: cust } = await supabase.from('customers').select('*').eq('item_id', itemId).single();
      if (!cust) { toast.error('ไม่พบข้อมูลลูกค้า'); router.push('/'); return; }
      setCustomerId(cust.id);
      setForm({ guestName: cust.guest_name || '', nationality: cust.nationality || '', customerType: cust.customer_type || '', customerDetail: cust.customer_detail || '', salePerson: cust.sale_person || '' });
      const { data: toursData } = await supabase.from('tours').select('*').eq('customer_id', cust.id).eq('status', 'active');
      setTourBlocks((toursData || []).map(t => ({ dbId: t.id, tourId: t.tour_id, tourDate: t.tour_date || '', tourDetail: t.tour_detail || '', tourName: t.tour_name || '', companyName: t.company_name || '', adult: t.adult || '', child: t.child || '', pickupTime: t.pickup_time || '', hotelName: t.hotel_name || '', roomNumber: t.room_number || '', note: t.note || '', operatorContact: t.operator_contact || '', saleAmount: t.sale_amount || '', netAmount: t.net_amount || '' })));
      const { data: hotelsData } = await supabase.from('hotels').select('*').eq('customer_id', cust.id).eq('status', 'active');
      setHotelBlocks((hotelsData || []).map(h => ({ dbId: h.id, hotelId: h.hotel_id, checkIn: h.check_in || '', checkOut: h.check_out || '', totalNight: h.total_night || '', hotelName: h.hotel_name || '', roomName: h.room_name || '', totalRoom: h.total_room || 1, confirmationNumber: h.confirmation_number || '', bookingType: h.booking_type || '', note: h.note || '', breakfast: h.breakfast || '', saleAmount: h.sale_amount || '', netAmount: h.net_amount || '' })));
    } catch (err) {
      toast.error('โหลดข้อมูลไม่สำเร็จ: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) { setForm(prev => ({ ...prev, [e.target.name]: e.target.value })); }
  function addTour(d) { if (editingTourIdx !== null) { setTourBlocks(prev => prev.map((t, i) => i === editingTourIdx ? { ...t, ...d } : t)); setEditingTourIdx(null); } else { setTourBlocks(prev => [...prev, d]); } setShowTourModal(false); }
  function addHotel(d) { if (editingHotelIdx !== null) { setHotelBlocks(prev => prev.map((h, i) => i === editingHotelIdx ? { ...h, ...d } : h)); setEditingHotelIdx(null); } else { setHotelBlocks(prev => [...prev, d]); } setShowHotelModal(false); }

  async function removeTour(idx) {
    const t = tourBlocks[idx];
    if (t.dbId) {
      const r = await Swal.fire({ title: 'ลบ Tour นี้?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'ลบ' });
      if (!r.isConfirmed) return;
      // soft-delete: keep the row for history, just flip status so it's filtered out everywhere
      const { error } = await supabase.from('tours').update({ status: 'cancelled' }).eq('id', t.dbId);
      if (error) { toast.error('ลบไม่สำเร็จ: ' + error.message); return; }
    }
    setTourBlocks(prev => prev.filter((_, i) => i !== idx));
  }

  async function removeHotel(idx) {
    const h = hotelBlocks[idx];
    if (h.dbId) {
      const r = await Swal.fire({ title: 'ลบ Hotel นี้?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'ลบ' });
      if (!r.isConfirmed) return;
      // soft-delete: keep the row for history, just flip status so it's filtered out everywhere
      const { error } = await supabase.from('hotels').update({ status: 'cancelled' }).eq('id', h.dbId);
      if (error) { toast.error('ลบไม่สำเร็จ: ' + error.message); return; }
    }
    setHotelBlocks(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.guestName.trim()) { toast.error('กรุณาใส่ชื่อลูกค้า'); return; }
    setSaving(true);
    try {
      const { error: custErr } = await supabase.from('customers').update({ guest_name: form.guestName.trim(), nationality: form.nationality, customer_type: form.customerType, customer_detail: form.customerDetail, sale_person: form.salePerson, updated_at: new Date().toISOString() }).eq('id', customerId);
      if (custErr) throw custErr;
      for (const t of tourBlocks) {
        const row = { tour_date: t.tourDate || null, tour_detail: t.tourDetail, tour_name: t.tourName, company_name: t.companyName, adult: parseInt(t.adult) || 0, child: parseInt(t.child) || 0, pickup_time: t.pickupTime, hotel_name: t.hotelName, room_number: t.roomNumber, note: t.note, operator_contact: t.operatorContact, sale_amount: parseFloat(t.saleAmount) || 0, net_amount: parseFloat(t.netAmount) || 0 };
        if (t.dbId) { const { error } = await supabase.from('tours').update(row).eq('id', t.dbId); if (error) throw error; }
        else { const { data: tid, error: idErr } = await supabase.rpc('next_id', { p_prefix: 'TOUR', p_counter: 'tour' }); if (idErr) throw idErr; const { error } = await supabase.from('tours').insert({ ...row, tour_id: tid, customer_id: customerId }); if (error) throw error; }
      }
      for (const h of hotelBlocks) {
        const row = { check_in: h.checkIn || null, check_out: h.checkOut || null, total_night: parseInt(h.totalNight) || 0, hotel_name: h.hotelName, room_name: h.roomName, total_room: parseInt(h.totalRoom) || 1, confirmation_number: h.confirmationNumber, booking_type: h.bookingType, note: h.note, breakfast: h.breakfast, sale_amount: parseFloat(h.saleAmount) || 0, net_amount: parseFloat(h.netAmount) || 0 };
        if (h.dbId) { const { error } = await supabase.from('hotels').update(row).eq('id', h.dbId); if (error) throw error; }
        else { const { data: hid, error: idErr } = await supabase.rpc('next_id', { p_prefix: 'HTL', p_counter: 'hotel' }); if (idErr) throw idErr; const { error } = await supabase.from('hotels').insert({ ...row, hotel_id: hid, customer_id: customerId }); if (error) throw error; }
      }
      backupCustomerById(itemId); // สำรองขึ้น Google Sheet (fire-and-forget)
      await Swal.fire({ title: 'บันทึกสำเร็จ!', icon: 'success', timer: 1500, showConfirmButton: false });
      router.push('/');
    } catch (err) { toast.error('Error: ' + err.message); } finally { setSaving(false); }
  }

  async function handleDeleteCustomer() {
    const r = await Swal.fire({ title: 'ลบลูกค้านี้?', text: 'Tour และ Hotel ทั้งหมดจะถูกลบ', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'ลบ' });
    if (!r.isConfirmed) return;
    // tours/hotels are removed automatically via the customer_id FK (ON DELETE CASCADE)
    const { error } = await supabase.from('customers').delete().eq('id', customerId);
    if (error) { toast.error('ลบไม่สำเร็จ: ' + error.message); return; }
    await Swal.fire({ title: 'ลบเรียบร้อย', icon: 'success', timer: 1500, showConfirmButton: false });
    router.push('/');
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><button onClick={() => router.push('/')} className="btn btn-ghost">← กลับ</button><h2 className="text-2xl font-bold">แก้ไขลูกค้า</h2><span className="badge badge-tour font-semibold">{itemId}</span></div>
        <button onClick={handleDeleteCustomer} className="btn btn-danger">🗑️ ลบลูกค้า</button>
      </div>
      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <h3 className="font-semibold text-base text-[var(--color-text-secondary)]">ข้อมูลลูกค้า</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><label className="label">ชื่อลูกค้า</label><input className="input" name="guestName" value={form.guestName} onChange={handleChange} /></div>
          <div><label className="label">สัญชาติ</label><select className="input" name="nationality" value={form.nationality} onChange={handleChange}><option value="">--- เลือก ---</option>{(dropdowns.nationality || []).map(v => <option key={v} value={v}>{v}</option>)}</select></div>
          <div><label className="label">ประเภทลูกค้า</label><SelectWithOther options={dropdowns.customer_type || []} value={form.customerType} onChange={v => setForm(prev => ({ ...prev, customerType: v }))} /></div>
          <div><label className="label">รายละเอียด</label><input className="input" name="customerDetail" value={form.customerDetail} onChange={handleChange} /></div>
          <div><label className="label">พนักงานขาย</label><SelectWithOther options={dropdowns.sale_person || []} value={form.salePerson} onChange={v => setForm(prev => ({ ...prev, salePerson: v }))} /></div>
        </div>
        <hr className="border-[var(--color-border)]" />
        <div className="flex flex-col sm:flex-row gap-2">
          <button type="button" className="btn btn-outline-primary w-full sm:w-auto justify-center" onClick={() => { setEditingTourIdx(null); setShowTourModal(true); }}>🚌 เพิ่ม Tour</button>
          <button type="button" className="btn btn-outline-primary w-full sm:w-auto justify-center" onClick={() => { setEditingHotelIdx(null); setShowHotelModal(true); }}>🏨 เพิ่ม Hotel</button>
        </div>
        {tourBlocks.length > 0 && <div className="space-y-3"><h4 className="font-semibold text-sm text-[var(--color-text-secondary)]">🗺️ Tour Bookings</h4>{tourBlocks.map((t, i) => (<div key={i} className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]"><div><p className="font-medium">{t.tourName || 'Tour'} — {t.tourDate || 'No date'}</p><p className="text-sm text-[var(--color-text-secondary)]">{t.companyName} · {t.adult || 0}A {t.child || 0}C</p>{t.tourId && <p className="text-xs text-[var(--color-text-muted)] mt-1">{t.tourId}</p>}</div><div className="flex gap-1"><button type="button" className="action-btn" onClick={() => { setEditingTourIdx(i); setShowTourModal(true); }}>✏️</button><button type="button" className="action-btn text-[var(--color-danger)]" onClick={() => removeTour(i)}>✕</button></div></div>))}</div>}
        {hotelBlocks.length > 0 && <div className="space-y-3"><h4 className="font-semibold text-sm text-[var(--color-text-secondary)]">🏨 Hotel Bookings</h4>{hotelBlocks.map((h, i) => (<div key={i} className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]"><div><p className="font-medium">{h.hotelName || 'Hotel'} — {h.roomName || ''}</p><p className="text-sm text-[var(--color-text-secondary)]">{h.checkIn || '?'} → {h.checkOut || '?'} · {h.totalNight || 0}N</p>{h.hotelId && <p className="text-xs text-[var(--color-text-muted)] mt-1">{h.hotelId}</p>}</div><div className="flex gap-1"><button type="button" className="action-btn" onClick={() => { setEditingHotelIdx(i); setShowHotelModal(true); }}>✏️</button><button type="button" className="action-btn text-[var(--color-danger)]" onClick={() => removeHotel(i)}>✕</button></div></div>))}</div>}
        <div className="text-right pt-4"><button type="submit" disabled={saving} className="btn btn-success text-base px-8 py-3">{saving ? 'กำลังบันทึก...' : '💾 บันทึกการแก้ไข'}</button></div>
      </form>
      {showTourModal && <TourModal dropdowns={dropdowns} initial={editingTourIdx !== null ? tourBlocks[editingTourIdx] : null} onSave={addTour} onClose={() => { setShowTourModal(false); setEditingTourIdx(null); }} />}
      {showHotelModal && <HotelModal dropdowns={dropdowns} initial={editingHotelIdx !== null ? hotelBlocks[editingHotelIdx] : null} onSave={addHotel} onClose={() => { setShowHotelModal(false); setEditingHotelIdx(null); }} />}
    </div>
  );
}
