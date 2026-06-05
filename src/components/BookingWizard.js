'use client';
import { useState } from 'react';
import { DateField, DateRangeField, TimeField } from './DateField';
import Combobox from './Combobox';
import SelectWithOther from './SelectWithOther';
import toast from 'react-hot-toast';

/* ประเภทงาน Airport Transfer (pic4) */
const TRANSFER_TYPES = [
  ['arrival_dom', 'Arrival (Dom) - รับเข้าดอม'],
  ['departure_dom', 'Departure (Dom) - ส่งออกดอม'],
  ['arrival_inter', 'Arrival (Inter) - รับเข้าอินเตอร์'],
  ['departure_inter', 'Departure (Inter) - ส่งออกอินเตอร์'],
];

/* ---------- blank drafts ---------- */
const BLANK_TOUR = {
  tourDate: '', tourDetail: '', tourName: '', companyName: '', adult: 2, child: 0, infant: 0,
  operatorContact: '', cashOnTour: '', pickupType: 'tour', hotelName: '', roomNumber: '',
  pickupTime: '', vehicleType: '', note: '', bookingType: '', netAmount: '', saleAmount: '',
  addToTaxi: false,
  // airport transfer (pic4)
  transferType: 'arrival_dom', origin: '', dropoff: '', flightNo: '',
};
const BLANK_HOTEL = {
  checkIn: '', checkOut: '', totalNight: '', hotelName: '', roomName: '', totalRoom: 1,
  adult: 2, child: 0, confirmationNumber: '', detail: '', note: '', breakfast: '',
  bookingType: '', netAmount: '', saleAmount: '',
};

const money = (n) => '฿' + Math.round(parseFloat(n) || 0).toLocaleString();

/* ============================================================
 * BookingWizard — ฟอร์มสร้าง/แก้ไขการจอง 2 ขั้นตอน (pic1/2/3)
 * ใช้ร่วมกันทั้งหน้า "สร้างใหม่" และ "แก้ไขลูกค้า"
 * props:
 *   mode: 'create' | 'edit'
 *   dropdowns, itemId, salesLabel
 *   initialCustomer, initialTours, initialHotels
 *   onCancel(), onDelete?()  // onDelete เฉพาะ edit
 *   onSave({customer, tours, hotels}, action)  // action: 'home' | 'voucher' ; คืน Promise
 *   busy
 * ============================================================ */
export default function BookingWizard({
  mode, dropdowns = {}, itemId, salesLabel,
  initialCustomer, initialTours = [], initialHotels = [],
  onCancel, onDelete, onSave, busy,
}) {
  const [step, setStep] = useState(1);
  const [customer, setCustomer] = useState(initialCustomer || {
    guestName: '', phone: '', nationality: '', customerType: '', customerDetail: '', salePerson: '',
  });
  const [tours, setTours] = useState(initialTours);
  const [hotels, setHotels] = useState(initialHotels);

  const [addingType, setAddingType] = useState('hotel'); // 'hotel' | 'tour'
  const [draft, setDraft] = useState(BLANK_HOTEL);
  const [editingIdx, setEditingIdx] = useState(null);

  const setC = (k, v) => setCustomer((p) => ({ ...p, [k]: v }));
  const setD = (k, v) => setDraft((p) => ({ ...p, [k]: v }));

  const total = tours.length + hotels.length;

  /* ----- step 1 → 2 ----- */
  function goStep2() {
    if (!customer.guestName.trim()) { toast.error('กรุณาใส่ชื่อ-นามสกุล'); return; }
    if (!customer.salePerson) { toast.error('กรุณาเลือกเซลล์ (Sales Person)'); return; }
    setStep(2);
  }

  /* ----- add / edit item ----- */
  function switchType(t) {
    if (editingIdx !== null) return; // ระหว่างแก้ไขอย่าสลับ
    setAddingType(t);
    setDraft(t === 'hotel' ? BLANK_HOTEL : BLANK_TOUR);
  }

  function addToBill() {
    if (addingType === 'hotel') {
      if (!draft.hotelName?.trim()) { toast.error('กรุณาใส่ชื่อโรงแรม'); return; }
      setHotels((prev) => editingIdx !== null ? prev.map((h, i) => i === editingIdx ? draft : h) : [...prev, draft]);
    } else {
      if (!draft.tourName?.trim() && !draft.tourDetail?.trim()) { toast.error('กรุณาใส่ลักษณะทัวร์ หรือ กิจกรรม/แพ็คเกจ'); return; }
      setTours((prev) => editingIdx !== null ? prev.map((t, i) => i === editingIdx ? draft : t) : [...prev, draft]);
    }
    toast.success(editingIdx !== null ? 'แก้ไขรายการแล้ว' : 'เพิ่มลงบิลแล้ว');
    resetDraft();
  }

  function resetDraft() {
    setEditingIdx(null);
    setDraft(addingType === 'hotel' ? BLANK_HOTEL : BLANK_TOUR);
  }

  function editItem(type, idx) {
    setAddingType(type);
    setDraft(type === 'hotel' ? { ...hotels[idx] } : { ...tours[idx] });
    setEditingIdx(idx);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function removeItem(type, idx) {
    if (type === 'hotel') setHotels((p) => p.filter((_, i) => i !== idx));
    else setTours((p) => p.filter((_, i) => i !== idx));
    if (editingIdx === idx && addingType === type) resetDraft();
  }

  async function handleSave(action) {
    if (total === 0) { toast.error('ยังไม่มีรายการในบิล — เพิ่มโรงแรมหรือทัวร์ก่อน'); return; }
    await onSave({ customer, tours, hotels }, action);
  }

  /* ============ STEP 1: ข้อมูลลูกค้า (pic1) ============ */
  if (step === 1) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card p-6 sm:p-8 space-y-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">ขั้นตอนที่ 1: ข้อมูลลูกค้า</h2>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">ระบุข้อมูลผู้จองหลัก สำหรับออกเอกสาร Voucher</p>
            </div>
            <button onClick={onCancel} className="btn btn-ghost shrink-0">← ยกเลิก (กลับหน้าหลัก)</button>
          </div>
          <hr className="border-[var(--color-border)]" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div><label className="label">👤 ชื่อ-นามสกุล</label><input className="input" placeholder="e.g. Mohamed" value={customer.guestName} onChange={(e) => setC('guestName', e.target.value)} /></div>
            <div><label className="label">📞 เบอร์โทรศัพท์</label><input className="input" placeholder="08X-XXX-XXXX" value={customer.phone} onChange={(e) => setC('phone', e.target.value)} /></div>
            <div><label className="label">สัญชาติ (Nationality)</label><SelectWithOther options={dropdowns.nationality || []} value={customer.nationality} onChange={(v) => setC('nationality', v)} /></div>
          </div>

          <div className="rounded-2xl border border-[var(--color-brand)]/30 bg-[var(--color-brand-bg)]/50 p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="label text-[var(--color-brand)]">ประเภทลูกค้า (Customer Type)</label>
              <p className="text-xs text-[var(--color-text-muted)] mb-1.5">* ข้อมูลภายใน (ไม่แสดงบน Voucher)</p>
              <SelectWithOther options={dropdowns.customer_type || []} value={customer.customerType} onChange={(v) => setC('customerType', v)} />
            </div>
            <div>
              <label className="label text-[var(--color-info)]">👤 เซลล์ (Sales Person) <span className="text-[var(--color-danger)]">*</span></label>
              <p className="text-xs text-[var(--color-text-muted)] mb-1.5">พนักงานขายที่ดูแลบิลนี้</p>
              <SelectWithOther options={dropdowns.sale_person || []} value={customer.salePerson} onChange={(v) => setC('salePerson', v)} />
            </div>
          </div>

          <div><label className="label">หมายเหตุ (Special Requests)</label><textarea className="input" rows={3} placeholder="เช่น ฮันนีมูน, มีเด็กเล็ก 1 คน..." value={customer.customerDetail} onChange={(e) => setC('customerDetail', e.target.value)} /></div>

          <div className="flex justify-end">
            <button onClick={goStep2} className="btn btn-primary text-base px-7 py-3">ขั้นตอนต่อไป: จัดทริป/บริการ →</button>
          </div>
        </div>
      </div>
    );
  }

  /* ============ STEP 2: จัดการรายการบริการ (pic2/pic3) ============ */
  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-4">
      {/* header */}
      <div className="card p-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">ขั้นตอนที่ 2: จัดการรายการบริการ (Itinerary)</h2>
          <div className="text-sm text-[var(--color-text-muted)] mt-1 flex items-center gap-2 flex-wrap">
            <span>ลูกค้า: <b className="text-[var(--color-text-primary)]">{customer.guestName || '-'}</b>{itemId ? ` (${itemId})` : ''}</span>
            {(salesLabel || customer.salePerson) && <span className="badge bg-[var(--color-brand-bg)] text-[var(--color-brand)]">Sales: {salesLabel || customer.salePerson}</span>}
          </div>
        </div>
        <button onClick={() => setStep(1)} className="text-sm text-[var(--color-brand)] hover:underline shrink-0">← กลับไปแก้ข้อมูลลูกค้า</button>
      </div>

      {/* add panel */}
      <div className="card p-5 sm:p-6 space-y-5">
        <div className="flex gap-3">
          <button onClick={() => switchType('hotel')} disabled={editingIdx !== null && addingType !== 'hotel'}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${addingType === 'hotel' ? 'bg-[var(--color-brand)] text-white' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] cursor-pointer'}`}>🏨 + เพิ่มโรงแรม / ที่พัก</button>
          <button onClick={() => switchType('tour')} disabled={editingIdx !== null && addingType !== 'tour'}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${addingType === 'tour' ? 'bg-[var(--color-success)] text-white' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] cursor-pointer'}`}>🗺️ + เพิ่มแพ็คเกจทัวร์</button>
        </div>
        <hr className="border-[var(--color-border)]" />

        {addingType === 'hotel'
          ? <HotelForm draft={draft} setD={setD} setDraft={setDraft} dropdowns={dropdowns} />
          : <TourForm draft={draft} setD={setD} dropdowns={dropdowns} />}

        <div className="flex justify-end">
          <button onClick={addToBill} className={`btn ${editingIdx !== null ? 'btn-primary' : 'btn-outline-primary'}`}>✓ {editingIdx !== null ? 'บันทึกการแก้ไขรายการ' : 'เพิ่มรายการนี้ลงบิล'}</button>
          {editingIdx !== null && <button onClick={resetDraft} className="btn btn-ghost ml-2">ยกเลิกแก้ไข</button>}
        </div>
      </div>

      {/* bill list */}
      {total > 0 && (
        <div className="card p-5 space-y-3">
          <h3 className="font-bold text-sm">รายการในบิล ({total})</h3>
          {hotels.map((h, i) => (
            <BillRow key={'h' + i} icon="🏨" color="var(--color-brand)"
              title={h.hotelName || 'โรงแรม'} sub={`${h.roomName || ''} · ${h.checkIn || '?'} → ${h.checkOut || '?'} · ${h.totalNight || 0} คืน`}
              amount={h.saleAmount} onEdit={() => editItem('hotel', i)} onRemove={() => removeItem('hotel', i)} />
          ))}
          {tours.map((t, i) => (
            <BillRow key={'t' + i} icon="🗺️" color="var(--color-success)"
              title={t.tourName || t.tourDetail || 'ทัวร์'} sub={`${t.companyName || ''} · ${t.tourDate || 'ไม่ระบุวันที่'} · ${(parseInt(t.adult) || 0)}A ${(parseInt(t.child) || 0)}C${t.addToTaxi ? ' · 🚕 ส่งเข้า Taxi' : ''}`}
              amount={t.saleAmount} onEdit={() => editItem('tour', i)} onRemove={() => removeItem('tour', i)} />
          ))}
        </div>
      )}

      {/* bottom action bar */}
      <div className="rounded-2xl bg-[var(--color-text-primary)] text-white p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="font-bold flex items-center gap-2">✓ เสร็จสิ้นการจัดทริป <span className="opacity-90">(Total: {total} รายการ)</span></div>
          <div className="text-xs text-white/60 mt-0.5">ตรวจสอบรายการดำเนินงานให้ครบถ้วนก่อนบันทึกข้อมูล</div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {mode === 'edit' && onDelete && <button onClick={onDelete} disabled={busy} className="btn btn-danger">🗑️ ลบลูกค้า</button>}
          <button onClick={() => handleSave('home')} disabled={busy} className="btn bg-white/15 text-white hover:bg-white/25">📋 {busy ? 'กำลังบันทึก...' : 'บันทึก & กลับหน้าแรก'}</button>
          <button onClick={() => handleSave('voucher')} disabled={busy} className="btn btn-primary">🖨️ {busy ? 'กำลังบันทึก...' : 'บันทึก & เปิดดู Voucher ทันที'}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- bill row ---------- */
function BillRow({ icon, color, title, sub, amount, onEdit, onRemove }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
      <div className="flex items-center gap-3 min-w-0">
        <span className="stat-icon shrink-0" style={{ width: 36, height: 36, background: color, color: '#fff' }}>{icon}</span>
        <div className="min-w-0">
          <div className="font-semibold truncate">{title}</div>
          <div className="text-xs text-[var(--color-text-muted)] truncate">{sub}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-bold text-[var(--color-success)]">{money(amount)}</span>
        <button onClick={onEdit} className="action-btn" title="แก้ไข">✏️</button>
        <button onClick={onRemove} className="action-btn text-[var(--color-danger)]" title="ลบ">🗑️</button>
      </div>
    </div>
  );
}

/* ---------- pricing box (yellow) — ตัวช่วยคำนวณ ไม่เก็บโหมด ---------- */
function PriceBox({ net, sale, count, unitLabel, onNet, onSale, bookingNode }) {
  const [mode, setMode] = useState('total');
  const [unit, setUnit] = useState('');
  const c = Math.max(0, parseInt(count) || 0);

  function pickMode(m) {
    if (m === 'unit') setUnit(c > 0 && sale ? String(Math.round((parseFloat(sale) || 0) / c)) : '');
    setMode(m);
  }
  function changeUnit(v) {
    setUnit(v);
    onSale(c > 0 ? Math.round((parseFloat(v) || 0) * c) : (parseFloat(v) || 0));
  }

  return (
    <div className="rounded-2xl border border-[var(--color-warning)]/40 bg-[var(--color-warning-light)]/60 p-5 space-y-4">
      <h4 className="font-bold text-sm">ส่วนจัดการราคาและช่องทาง (ระบบหลังบ้าน)</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">ช่องทางการจอง (Booking Source)</label>
          {bookingNode}
        </div>
        <div>
          <label className="label">รูปแบบการคิดราคา</label>
          <div className="inline-flex p-1 rounded-xl bg-white border border-[var(--color-border)] w-full">
            <button type="button" onClick={() => pickMode('total')} className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${mode === 'total' ? 'bg-[var(--color-warning)] text-white' : 'text-[var(--color-text-secondary)]'}`}>ราคารวมทั้งหมด (Total)</button>
            <button type="button" onClick={() => pickMode('unit')} className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${mode === 'unit' ? 'bg-[var(--color-warning)] text-white' : 'text-[var(--color-text-secondary)]'}`}>{unitLabel}</button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Net Amount (ต้นทุน)</label>
          <input type="number" step="0.01" className="input" placeholder="฿ 0.00" value={net} onChange={(e) => onNet(e.target.value)} />
        </div>
        <div>
          <label className="label">Sale Amount (ราคาขาย){mode === 'unit' ? ` — ${unitLabel}` : ''}</label>
          {mode === 'total'
            ? <input type="number" step="0.01" className="input" placeholder="฿ 0.00" value={sale} onChange={(e) => onSale(e.target.value)} />
            : <>
                <input type="number" step="0.01" className="input" placeholder="฿ ต่อหน่วย" value={unit} onChange={(e) => changeUnit(e.target.value)} />
                <p className="text-xs text-[var(--color-text-muted)] mt-1">รวม {c} หน่วย = <b className="text-[var(--color-text-primary)]">{money(sale)}</b></p>
              </>}
        </div>
      </div>
    </div>
  );
}

/* ---------- HOTEL add-form (pic2) ---------- */
function HotelForm({ draft, setD, setDraft, dropdowns }) {
  function onStay(checkIn, checkOut) {
    setDraft((p) => {
      const next = { ...p, checkIn, checkOut };
      if (checkIn && checkOut) { const d = Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000); next.totalNight = d > 0 ? d : 0; }
      else next.totalNight = '';
      return next;
    });
  }
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
        <div><label className="label">Stay Period (เช็คอิน - เช็คเอาท์)</label><DateRangeField start={draft.checkIn} end={draft.checkOut} onChange={onStay} placeholder="คลิกเลือกวัน เช็คอิน - เช็คเอาท์" /></div>
        <div className="md:pl-4 md:border-l border-[var(--color-border)]"><label className="label">Total Night (Auto)</label><div className="text-2xl font-bold text-[var(--color-brand)]">{draft.totalNight || 0} <span className="text-base font-medium text-[var(--color-text-secondary)]">Nights</span></div></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="label">Hotel Name</label><Combobox options={dropdowns.hotel_name || []} value={draft.hotelName} onChange={(v) => setD('hotelName', v)} placeholder="พิมพ์ค้นหา หรือเลือกโรงแรม..." /></div>
        <div><label className="label">Room Name</label><Combobox options={dropdowns.room_name || []} value={draft.roomName} onChange={(v) => setD('roomName', v)} placeholder="พิมพ์ค้นหา หรือเลือกประเภทห้อง..." /></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div><label className="label">Total Room</label><input type="number" min="1" className="input" value={draft.totalRoom} onChange={(e) => setD('totalRoom', e.target.value)} /></div>
        <div><label className="label">Adults</label><input type="number" min="0" className="input" value={draft.adult} onChange={(e) => setD('adult', e.target.value)} /></div>
        <div><label className="label">Children</label><input type="number" min="0" className="input" value={draft.child} onChange={(e) => setD('child', e.target.value)} /></div>
        <div><label className="label">Confirmation Number</label><input className="input" placeholder="e.g. HTL-1234" value={draft.confirmationNumber} onChange={(e) => setD('confirmationNumber', e.target.value)} /></div>
      </div>
      <div><label className="label">Detail (แสดงบน Voucher คอลัมน์ DETAIL)</label><input className="input" placeholder="เช่น Room Near to Each Other" value={draft.detail} onChange={(e) => setD('detail', e.target.value)} /></div>
      <div><label className="label">Note (แสดงบน Voucher คอลัมน์ NOTE)</label><input className="input" placeholder="เช่น Extra bed, High floor..." value={draft.note} onChange={(e) => setD('note', e.target.value)} /></div>
      <div>
        <label className="label">Breakfast Option</label>
        <div className="flex gap-3">
          {[['Breakfast', '✅ Breakfast', 'var(--color-success)'], ['No Breakfast', '❌ No Breakfast', 'var(--color-danger)']].map(([val, lbl, col]) => (
            <button type="button" key={val} onClick={() => setD('breakfast', val)} className={`px-4 py-2.5 rounded-lg border text-sm font-semibold cursor-pointer transition-colors ${draft.breakfast === val ? '' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'}`} style={draft.breakfast === val ? { borderColor: col, color: col, background: col === 'var(--color-success)' ? 'var(--color-success-light)' : 'var(--color-danger-light)' } : {}}>{lbl}</button>
          ))}
        </div>
      </div>
      <PriceBox net={draft.netAmount} sale={draft.saleAmount} count={draft.totalNight} unitLabel="ราคาต่อคืน (Per Night)" onNet={(v) => setD('netAmount', v)} onSale={(v) => setD('saleAmount', v)}
        bookingNode={<BookingSourceSelect value={draft.bookingType} onChange={(v) => setD('bookingType', v)} dropdowns={dropdowns} />} />
    </div>
  );
}

/* ---------- TOUR add-form (pic3 / pic4) ---------- */
function TourForm({ draft, setD, dropdowns }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-4">
        <div><label className="label">วันที่เดินทาง (Travel Date)</label><DateField value={draft.tourDate} onChange={(v) => setD('tourDate', v)} placeholder="เลือกวันที่เดินทาง" /></div>
        <div><label className="label">ผู้ใหญ่ (ADULTS)</label><input type="number" min="0" className="input text-center" value={draft.adult} onChange={(e) => setD('adult', e.target.value)} /></div>
        <div><label className="label">เด็ก (CHILDREN)</label><input type="number" min="0" className="input text-center" value={draft.child} onChange={(e) => setD('child', e.target.value)} /></div>
        <div><label className="label">ทารก (INFANTS)</label><input type="number" min="0" className="input text-center" value={draft.infant} onChange={(e) => setD('infant', e.target.value)} /></div>
      </div>
      <div><label className="label">ลักษณะทัวร์ (พิมพ์คำอธิบายสั้นๆ - โชว์บน Voucher)</label><input className="input" placeholder="e.g. Program: Full Day Tour Speedboat..." value={draft.tourDetail} onChange={(e) => setD('tourDetail', e.target.value)} /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="label">กิจกรรม / แพ็คเกจ (Internal)</label><Combobox options={dropdowns.tour_name || []} value={draft.tourName} onChange={(v) => setD('tourName', v)} placeholder="พิมพ์ค้นหา หรือเลือกกิจกรรม..." /></div>
        <div><label className="label">บริษัททัวร์ (Company Name)</label><Combobox options={dropdowns.company_name || []} value={draft.companyName} onChange={(v) => setD('companyName', v)} placeholder="พิมพ์ค้นหา หรือเลือกบริษัททัวร์..." /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="label">เบอร์ติดต่อบริษัท (Operator Phone)</label><input className="input" placeholder="e.g. 08X-XXX-XXXX" value={draft.operatorContact} onChange={(e) => setD('operatorContact', e.target.value)} /></div>
        <div><label className="label text-[var(--color-danger)]">Cash on Tour (เก็บเงินหน้างาน)</label><input type="number" step="0.01" className="input" style={{ background: 'var(--color-danger-light)' }} placeholder="฿ ระบุจำนวนเงิน (ถ้ามี)..." value={draft.cashOnTour} onChange={(e) => setD('cashOnTour', e.target.value)} /></div>
      </div>

      <hr className="border-[var(--color-border)] border-dashed" />

      {/* taxi toggle — ก่อนข้อมูลการรับส่ง */}
      <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--color-warning)]/40 bg-[var(--color-warning-light)]/50">
        <div>
          <div className="font-semibold text-sm flex items-center gap-2">🚕 เพิ่มงานนี้เข้า Taxi Booking ด้วยมั้ย?</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-0.5">เปิดไว้ ระบบจะสร้างงาน "รอจัดรถ" ให้อัตโนมัติเมื่อกดบันทึก (ดึงข้อมูลรับส่งเท่าที่มี)</div>
        </div>
        <button type="button" onClick={() => setD('addToTaxi', !draft.addToTaxi)} aria-pressed={draft.addToTaxi}
          className="relative w-12 h-6 rounded-full transition-colors shrink-0 cursor-pointer"
          style={{ background: draft.addToTaxi ? 'var(--color-success)' : 'var(--color-border)' }}>
          <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform" style={{ transform: draft.addToTaxi ? 'translateX(24px)' : 'none' }} />
        </button>
      </div>

      {/* pickup details */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h4 className="font-bold text-sm text-[var(--color-brand)] flex items-center gap-2">🗺️ ข้อมูลการรับส่ง (Pickup Details)</h4>
          <div className="inline-flex p-1 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
            {[['tour', '🚩 Tour Pick up'], ['airport', '✈️ Airport Transfer']].map(([val, lbl]) => (
              <button type="button" key={val} onClick={() => setD('pickupType', val)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${draft.pickupType === val ? 'bg-[var(--color-brand)] text-white' : 'text-[var(--color-text-secondary)]'}`}>{lbl}</button>
            ))}
          </div>
        </div>
        {draft.pickupType === 'airport' ? (
          /* ----- Airport Transfer (pic4) ----- */
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="label">ประเภท (Type)</label>
                <select className="input" value={draft.transferType} onChange={(e) => setD('transferType', e.target.value)}>
                  {TRANSFER_TYPES.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
                </select>
              </div>
              <div><label className="label">สถานที่รับต้นทาง (Origin)</label><input className="input" placeholder="e.g. Phuket Airport (HKT)..." value={draft.origin} onChange={(e) => setD('origin', e.target.value)} /></div>
              <div><label className="label">สถานที่ส่งปลายทาง (Drop off)</label><input className="input" placeholder="e.g. Centara Grand..." value={draft.dropoff} onChange={(e) => setD('dropoff', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="label">เที่ยวบิน (Flight No.)</label><input className="input" placeholder="e.g. TG205" value={draft.flightNo} onChange={(e) => setD('flightNo', e.target.value)} /></div>
              <div><label className="label">เวลารับ / เครื่องลง (Time)</label><input className="input" placeholder="e.g. 14:30" value={draft.pickupTime} onChange={(e) => setD('pickupTime', e.target.value)} /></div>
              <div><label className="label text-[var(--color-success)]">ประเภทรถ (ซ่อนใน Voucher)</label><Combobox options={dropdowns.taxi_vehicle_type || []} value={draft.vehicleType} onChange={(v) => setD('vehicleType', v)} placeholder="เลือก/พิมพ์ประเภทรถ..." /></div>
            </div>
            <div><label className="label">หมายเหตุ (Note)</label><input className="input" placeholder="e.g. Please wait at Gate 2..." value={draft.note} onChange={(e) => setD('note', e.target.value)} /></div>
          </>
        ) : (
          /* ----- Tour Pick up (pic3) ----- */
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="label">โรงแรมที่รอรับ (Pickup Hotel)</label><Combobox options={dropdowns.hotel_name || []} value={draft.hotelName} onChange={(v) => setD('hotelName', v)} placeholder="พิมพ์ค้นหา หรือเลือกโรงแรม..." /></div>
              <div><label className="label">เบอร์ห้อง (Room Number)</label><input className="input" placeholder="e.g. 1012 หรือ TBA" value={draft.roomNumber} onChange={(e) => setD('roomNumber', e.target.value)} /></div>
              <div><label className="label">เวลารับ (Pick up Time)</label><input className="input" placeholder="e.g. 08:00 - 08:30" value={draft.pickupTime} onChange={(e) => setD('pickupTime', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="label text-[var(--color-success)]">ประเภทรถ (ซ่อนใน Voucher)</label><Combobox options={dropdowns.taxi_vehicle_type || []} value={draft.vehicleType} onChange={(v) => setD('vehicleType', v)} placeholder="เลือก/พิมพ์ประเภทรถ..." /></div>
              <div><label className="label">หมายเหตุการรับส่ง (Pickup Note / Operator Contact)</label><input className="input" style={{ background: 'var(--color-success-light)' }} placeholder="Please wait at the lobby during the pickup time." value={draft.note} onChange={(e) => setD('note', e.target.value)} /></div>
            </div>
          </>
        )}
      </div>

      <PriceBox net={draft.netAmount} sale={draft.saleAmount} count={draft.adult} unitLabel="ราคาต่อผู้ใหญ่ (Per Adult)" onNet={(v) => setD('netAmount', v)} onSale={(v) => setD('saleAmount', v)}
        bookingNode={<BookingSourceSelect value={draft.bookingType} onChange={(v) => setD('bookingType', v)} dropdowns={dropdowns} />} />
    </div>
  );
}

function BookingSourceSelect({ value, onChange, dropdowns }) {
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">-- เลือกช่องทาง --</option>
      {(dropdowns.booking_type || []).map((v) => <option key={v} value={v}>{v}</option>)}
    </select>
  );
}
