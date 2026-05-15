'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import TourModal from '@/components/TourModal';
import HotelModal from '@/components/HotelModal';

export default function NewCustomerPage() {
  const router = useRouter();
  const [dropdowns, setDropdowns] = useState({});
  const [form, setForm] = useState({ guestName: '', nationality: '', customerType: '', customerDetail: '', salePerson: '' });
  const [tourBlocks, setTourBlocks] = useState([]);
  const [hotelBlocks, setHotelBlocks] = useState([]);
  const [showTourModal, setShowTourModal] = useState(false);
  const [showHotelModal, setShowHotelModal] = useState(false);
  const [editingTourIdx, setEditingTourIdx] = useState(null);
  const [editingHotelIdx, setEditingHotelIdx] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadDropdowns(); }, []);

  async function loadDropdowns() {
    const { data } = await supabase.from('dropdowns').select('*').order('sort_order');
    const grouped = {};
    (data || []).forEach(d => {
      if (!grouped[d.category]) grouped[d.category] = [];
      grouped[d.category].push(d.value);
    });
    setDropdowns(grouped);
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function addTour(tourData) {
    if (editingTourIdx !== null) {
      setTourBlocks(prev => prev.map((t, i) => i === editingTourIdx ? tourData : t));
      setEditingTourIdx(null);
    } else {
      setTourBlocks(prev => [...prev, tourData]);
    }
    setShowTourModal(false);
  }

  function addHotel(hotelData) {
    if (editingHotelIdx !== null) {
      setHotelBlocks(prev => prev.map((h, i) => i === editingHotelIdx ? hotelData : h));
      setEditingHotelIdx(null);
    } else {
      setHotelBlocks(prev => [...prev, hotelData]);
    }
    setShowHotelModal(false);
  }

  function removeTour(idx) { setTourBlocks(prev => prev.filter((_, i) => i !== idx)); }
  function removeHotel(idx) { setHotelBlocks(prev => prev.filter((_, i) => i !== idx)); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.guestName.trim()) { toast.error('กรุณาใส่ชื่อลูกค้า'); return; }
    setSaving(true);
    try {
      const { data: itemIdData } = await supabase.rpc('next_id', { p_prefix: 'VC', p_counter: 'customer' });
      const { data: customer, error: custErr } = await supabase.from('customers').insert({
        item_id: itemIdData,
        guest_name: form.guestName.trim(),
        nationality: form.nationality,
        customer_type: form.customerType,
        customer_detail: form.customerDetail,
        sale_person: form.salePerson,
      }).select('id').single();
      if (custErr) throw custErr;

      for (const t of tourBlocks) {
        const { data: tourIdData } = await supabase.rpc('next_id', { p_prefix: 'TOUR', p_counter: 'tour' });
        await supabase.from('tours').insert({
          tour_id: tourIdData, customer_id: customer.id,
          tour_date: t.tourDate || null, tour_detail: t.tourDetail, tour_name: t.tourName,
          company_name: t.companyName, adult: parseInt(t.adult) || 0, child: parseInt(t.child) || 0,
          pickup_time: t.pickupTime, hotel_name: t.hotelName, room_number: t.roomNumber,
          note: t.note, operator_contact: t.operatorContact,
          sale_amount: parseFloat(t.saleAmount) || 0, net_amount: parseFloat(t.netAmount) || 0,
        });
      }

      for (const h of hotelBlocks) {
        const { data: hotelIdData } = await supabase.rpc('next_id', { p_prefix: 'HTL', p_counter: 'hotel' });
        await supabase.from('hotels').insert({
          hotel_id: hotelIdData, customer_id: customer.id,
          check_in: h.checkIn || null, check_out: h.checkOut || null,
          total_night: parseInt(h.totalNight) || 0, hotel_name: h.hotelName, room_name: h.roomName,
          total_room: parseInt(h.totalRoom) || 1, confirmation_number: h.confirmationNumber,
          booking_type: h.bookingType, note: h.note, breakfast: h.breakfast,
          sale_amount: parseFloat(h.saleAmount) || 0, net_amount: parseFloat(h.netAmount) || 0,
        });
      }

      await Swal.fire({ title: 'บันทึกสำเร็จ!', text: `สร้างลูกค้า ${itemIdData} เรียบร้อย`, icon: 'success', timer: 1500, showConfirmButton: false });
      router.push('/');
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/')} className="btn btn-ghost">← กลับ</button>
        <h2 className="text-2xl font-bold">สร้างการจองใหม่</h2>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <h3 className="font-semibold text-base text-[var(--color-text-secondary)]">ข้อมูลลูกค้า</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="label">ชื่อลูกค้า (Guest Name)</label>
            <input className="input" name="guestName" value={form.guestName} onChange={handleChange} />
          </div>
          <div>
            <label className="label">สัญชาติ (Nationality)</label>
            <select className="input" name="nationality" value={form.nationality} onChange={handleChange}>
              <option value="">--- เลือก ---</option>
              {(dropdowns.nationality || []).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label">ประเภทลูกค้า</label>
            <select className="input" name="customerType" value={form.customerType} onChange={handleChange}>
              <option value="">--- เลือก ---</option>
              {(dropdowns.customer_type || []).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label">รายละเอียดลูกค้า</label>
            <input className="input" name="customerDetail" value={form.customerDetail} onChange={handleChange} />
          </div>
          <div>
            <label className="label">พนักงานขาย</label>
            <select className="input" name="salePerson" value={form.salePerson} onChange={handleChange}>
              <option value="">--- เลือก ---</option>
              {(dropdowns.sale_person || []).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>

        <hr className="border-[var(--color-border)]" />

        <div className="flex gap-2">
          <button type="button" className="btn btn-outline-primary" onClick={() => { setEditingTourIdx(null); setShowTourModal(true); }}>➕ เพิ่ม Tour</button>
          <button type="button" className="btn btn-outline-primary" onClick={() => { setEditingHotelIdx(null); setShowHotelModal(true); }}>🏨 เพิ่ม Hotel</button>
        </div>

        {tourBlocks.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-[var(--color-text-secondary)]">🗺️ Tour Bookings</h4>
            {tourBlocks.map((t, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                <div>
                  <p className="font-medium">{t.tourName || 'Tour'} — {t.tourDate || 'No date'}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t.companyName} · {t.adult || 0}A {t.child || 0}C · {t.pickupTime || '-'}</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" className="action-btn" onClick={() => { setEditingTourIdx(i); setShowTourModal(true); }}>✏️</button>
                  <button type="button" className="action-btn text-[var(--color-danger)]" onClick={() => removeTour(i)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {hotelBlocks.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-[var(--color-text-secondary)]">🏨 Hotel Bookings</h4>
            {hotelBlocks.map((h, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                <div>
                  <p className="font-medium">{h.hotelName || 'Hotel'} — {h.roomName || ''}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">{h.checkIn || '?'} → {h.checkOut || '?'} · {h.totalNight || 0}N · {h.breakfast || '-'}</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" className="action-btn" onClick={() => { setEditingHotelIdx(i); setShowHotelModal(true); }}>✏️</button>
                  <button type="button" className="action-btn text-[var(--color-danger)]" onClick={() => removeHotel(i)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-right pt-4">
          <button type="submit" disabled={saving} className="btn btn-primary text-base px-8 py-3">
            {saving ? 'กำลังบันทึก...' : '✅ ยืนยันและบันทึก'}
          </button>
        </div>
      </form>

      {showTourModal && (
        <TourModal dropdowns={dropdowns} initial={editingTourIdx !== null ? tourBlocks[editingTourIdx] : null}
          onSave={addTour} onClose={() => { setShowTourModal(false); setEditingTourIdx(null); }} />
      )}
      {showHotelModal && (
        <HotelModal dropdowns={dropdowns} initial={editingHotelIdx !== null ? hotelBlocks[editingHotelIdx] : null}
          onSave={addHotel} onClose={() => { setShowHotelModal(false); setEditingHotelIdx(null); }} />
      )}
    </div>
  );
}
