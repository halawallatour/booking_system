'use client';
import { useState, useEffect } from 'react';

export default function TourModal({ dropdowns, initial, onSave, onClose }) {
  const [form, setForm] = useState({ tourDate: '', tourDetail: '', tourName: '', companyName: '', adult: '', child: '', pickupTimeFrom: '', pickupTimeTo: '', hotelName: '', roomNumber: '', note: '', operatorContact: '', saleAmount: '', netAmount: '' });

  useEffect(() => {
    if (initial) {
      let fromTime = '', toTime = '';
      if (initial.pickupTime && initial.pickupTime.includes(' - ')) { [fromTime, toTime] = initial.pickupTime.split(' - '); }
      else if (initial.pickupTime) { fromTime = initial.pickupTime; toTime = initial.pickupTime; }
      setForm({ tourDate: initial.tourDate || '', tourDetail: initial.tourDetail || '', tourName: initial.tourName || '', companyName: initial.companyName || '', adult: initial.adult || '', child: initial.child || '', pickupTimeFrom: fromTime, pickupTimeTo: toTime, hotelName: initial.hotelName || '', roomNumber: initial.roomNumber || '', note: initial.note || '', operatorContact: initial.operatorContact || '', saleAmount: initial.saleAmount || '', netAmount: initial.netAmount || '' });
    }
  }, [initial]);

  function handleChange(e) { setForm(prev => ({ ...prev, [e.target.name]: e.target.value })); }

  function handleSubmit(e) {
    e.preventDefault();
    const f = form.pickupTimeFrom || form.pickupTimeTo;
    const t = form.pickupTimeTo || form.pickupTimeFrom;
    const pickupTime = f ? `${f} - ${t}` : '';
    onSave({ tourDate: form.tourDate, tourDetail: form.tourDetail, tourName: form.tourName, companyName: form.companyName, adult: form.adult, child: form.child, pickupTime, hotelName: form.hotelName, roomNumber: form.roomNumber, note: form.note, operatorContact: form.operatorContact, saleAmount: form.saleAmount, netAmount: form.netAmount });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-[var(--color-brand)]">🗺️ {initial ? 'Edit' : 'Add'} Tour</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="label">Tour Date</label><input type="date" className="input" name="tourDate" value={form.tourDate} onChange={handleChange} /></div>
            <div><label className="label">Tour Detail</label><input className="input" name="tourDetail" value={form.tourDetail} onChange={handleChange} /></div>
            <div><label className="label">Tour Name</label><select className="input" name="tourName" value={form.tourName} onChange={handleChange}><option value="">--- Choose ---</option>{(dropdowns.tour_name || []).map(v => <option key={v} value={v}>{v}</option>)}</select></div>
            <div><label className="label">Company Name</label><select className="input" name="companyName" value={form.companyName} onChange={handleChange}><option value="">--- Choose ---</option>{(dropdowns.company_name || []).map(v => <option key={v} value={v}>{v}</option>)}</select></div>
            <div><label className="label">Adult</label><input type="number" className="input" name="adult" min="0" value={form.adult} onChange={handleChange} /></div>
            <div><label className="label">Child</label><input type="number" className="input" name="child" min="0" value={form.child} onChange={handleChange} /></div>
            <div><label className="label">Pickup Time From</label><input type="time" className="input" name="pickupTimeFrom" value={form.pickupTimeFrom} onChange={handleChange} /></div>
            <div><label className="label">Pickup Time To</label><input type="time" className="input" name="pickupTimeTo" value={form.pickupTimeTo} onChange={handleChange} /></div>
            <div><label className="label">Hotel Name</label><input className="input" name="hotelName" value={form.hotelName} onChange={handleChange} list="hotelListTour" /><datalist id="hotelListTour">{(dropdowns.hotel_name || []).map(v => <option key={v} value={v} />)}</datalist></div>
            <div><label className="label">Room Number</label><input className="input" name="roomNumber" value={form.roomNumber} onChange={handleChange} /></div>
          </div>
          <div><label className="label">Note</label><input className="input" name="note" value={form.note} onChange={handleChange} /></div>
          <div><label className="label">Operator Contact</label><input className="input" name="operatorContact" value={form.operatorContact} onChange={handleChange} /></div>
          <hr className="border-[var(--color-border)]" />
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Net Amount</label><input type="number" step="0.01" className="input" name="netAmount" value={form.netAmount} onChange={handleChange} placeholder="0.00" /></div>
            <div><label className="label">Sale Amount</label><input type="number" step="0.01" className="input" name="saleAmount" value={form.saleAmount} onChange={handleChange} placeholder="0.00" /></div>
          </div>
          <div className="text-right pt-2"><button type="button" className="btn btn-ghost mr-2" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary">✅ Save Tour</button></div>
        </form>
      </div>
    </div>
  );
}
