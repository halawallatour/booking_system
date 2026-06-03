'use client';
import { useState, useEffect } from 'react';
import { DateRangeField } from './DateField';
import Combobox from './Combobox';

export default function HotelModal({ dropdowns, initial, onSave, onClose }) {
  const [form, setForm] = useState({ checkIn: '', checkOut: '', totalNight: '', hotelName: '', roomName: '', totalRoom: 1, confirmationNumber: '', bookingType: '', note: '', breakfast: '', saleAmount: '', netAmount: '' });

  useEffect(() => {
    if (initial) {
      setForm({ checkIn: initial.checkIn || '', checkOut: initial.checkOut || '', totalNight: initial.totalNight || '', hotelName: initial.hotelName || '', roomName: initial.roomName || '', totalRoom: initial.totalRoom || 1, confirmationNumber: initial.confirmationNumber || '', bookingType: initial.bookingType || '', note: initial.note || '', breakfast: initial.breakfast || '', saleAmount: initial.saleAmount || '', netAmount: initial.netAmount || '' });
    }
  }, [initial]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleStayChange(checkIn, checkOut) {
    setForm(prev => {
      const next = { ...prev, checkIn, checkOut };
      if (checkIn && checkOut) {
        const diff = Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
        next.totalNight = diff > 0 ? diff : 0;
      } else {
        next.totalNight = '';
      }
      return next;
    });
  }

  function handleSubmit(e) { e.preventDefault(); onSave({ ...form }); }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-[var(--color-success)]">🏨 {initial ? 'Edit' : 'Add'} Hotel</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><label className="label">Check In — Check Out</label><DateRangeField start={form.checkIn} end={form.checkOut} onChange={handleStayChange} placeholder="เลือกวันเช็คอิน–เช็คเอาท์" /></div>
            <div><label className="label">Total Night (Auto)</label><input type="number" className="input bg-[var(--color-surface-alt)]" name="totalNight" value={form.totalNight} readOnly /></div>
            <div><label className="label">Hotel Name</label><Combobox options={dropdowns.hotel_name || []} value={form.hotelName} onChange={v => setForm(prev => ({ ...prev, hotelName: v }))} /></div>
            <div><label className="label">Room Name</label><Combobox options={dropdowns.room_name || []} value={form.roomName} onChange={v => setForm(prev => ({ ...prev, roomName: v }))} /></div>
            <div><label className="label">Total Room</label><input type="number" className="input" name="totalRoom" min="1" value={form.totalRoom} onChange={handleChange} /></div>
            <div><label className="label">Confirmation Number</label><input className="input" name="confirmationNumber" value={form.confirmationNumber} onChange={handleChange} /></div>
            <div><label className="label">Booking Type</label><select className="input" name="bookingType" value={form.bookingType} onChange={handleChange}><option value="">--- Choose ---</option>{(dropdowns.booking_type || []).map(v => <option key={v} value={v}>{v}</option>)}</select></div>
          </div>
          <div><label className="label">Note</label><input className="input" name="note" value={form.note} onChange={handleChange} /></div>
          <div><label className="label">Breakfast</label>
            <div className="flex gap-3 mt-1">
              <label className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${form.breakfast === 'Breakfast' ? 'border-[var(--color-success)] bg-[var(--color-success-light)]' : 'border-[var(--color-border)]'}`}><input type="radio" name="breakfast" value="Breakfast" checked={form.breakfast === 'Breakfast'} onChange={handleChange} className="hidden" /><span>🍳 Breakfast</span></label>
              <label className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${form.breakfast === 'No Breakfast' ? 'border-[var(--color-danger)] bg-[var(--color-danger-light)]' : 'border-[var(--color-border)]'}`}><input type="radio" name="breakfast" value="No Breakfast" checked={form.breakfast === 'No Breakfast'} onChange={handleChange} className="hidden" /><span>✕ No Breakfast</span></label>
            </div>
          </div>
          <hr className="border-[var(--color-border)]" />
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Net Amount</label><input type="number" step="0.01" className="input" name="netAmount" value={form.netAmount} onChange={handleChange} placeholder="0.00" /></div>
            <div><label className="label">Sale Amount</label><input type="number" step="0.01" className="input" name="saleAmount" value={form.saleAmount} onChange={handleChange} placeholder="0.00" /></div>
          </div>
          <div className="text-right pt-2"><button type="button" className="btn btn-ghost mr-2" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-success">✅ Save Hotel</button></div>
        </form>
      </div>
    </div>
  );
}
