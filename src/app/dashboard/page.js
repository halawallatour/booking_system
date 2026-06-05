'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import Link from 'next/link';
import { DateField, TimeField, MonthField, YearField } from '@/components/DateField';
import Combobox from '@/components/Combobox';

/* ---------- helpers ---------- */
const profitOf = (r) => (parseFloat(r.sale_amount) || 0) - (parseFloat(r.net_amount) || 0);
const saleOf = (r) => parseFloat(r.sale_amount) || 0;
const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);
const money = (n) => '฿' + Math.round(n || 0).toLocaleString();
function localYMD(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const REPORT_ITEMS = [
  { key: 'monthly', label: 'Monthly Report', icon: '📅' },
  { key: 'yearly', label: 'Yearly Report', icon: '📈' },
];
const WORKING_ITEMS = [
  { key: 'dailyops', label: 'Daily Ops', icon: '🚐' },
  { key: 'taxi', label: 'Taxi Booking', icon: '🚕' },
  { key: 'paymentdue', label: 'Payment Due', icon: '💳' },
];
const REPORT_KEYS = REPORT_ITEMS.map(i => i.key);
const WORKING_KEYS = WORKING_ITEMS.map(i => i.key);

export default function DashboardPage() {
  const [view, setView] = useState('overview');
  const [tours, setTours] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [custCount, setCustCount] = useState(0);
  const [dropdowns, setDropdowns] = useState({});
  const [loading, setLoading] = useState(true);

  const [month, setMonth] = useState('');   // YYYY-MM
  const [year, setYear] = useState('');     // YYYY
  const [opsDate, setOpsDate] = useState(''); // YYYY-MM-DD

  async function loadAll() {
    setLoading(true);
    try {
      const [{ count }, { data: t }, { data: h }, { data: dd }] = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('tours').select('*, customers(item_id, guest_name)').eq('status', 'active'),
        supabase.from('hotels').select('*, customers(item_id, guest_name)').eq('status', 'active'),
        supabase.from('dropdowns').select('*').order('sort_order'),
      ]);
      setCustCount(count || 0);
      setTours(t || []);
      setHotels(h || []);
      const grouped = {}; (dd || []).forEach(d => { (grouped[d.category] ||= []).push(d.value); });
      setDropdowns(grouped);
      window.dispatchEvent(new CustomEvent('app:updated'));
    } catch (err) {
      toast.error('โหลด Dashboard ไม่สำเร็จ: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const now = new Date();
    setMonth(localYMD(now).slice(0, 7));
    setYear(localYMD(now).slice(0, 4));
    setOpsDate(localYMD(now));
    loadAll();
  }, []);

  // global header Refresh button
  useEffect(() => {
    const onRefresh = () => loadAll();
    window.addEventListener('app:refresh', onRefresh);
    return () => window.removeEventListener('app:refresh', onRefresh);
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <SubNav view={view} setView={setView} />
      {view === 'overview' && <OverviewView tours={tours} hotels={hotels} custCount={custCount} />}
      {view === 'monthly' && <MonthlyReport tours={tours} hotels={hotels} month={month} setMonth={setMonth} />}
      {view === 'yearly' && <YearlyReport tours={tours} hotels={hotels} year={year} setYear={setYear} />}
      {view === 'dailyops' && <DailyOps tours={tours} hotels={hotels} opsDate={opsDate} setOpsDate={setOpsDate} />}
      {view === 'taxi' && <TaxiBooking dropdowns={dropdowns} />}
      {view === 'paymentdue' && <PaymentDue tours={tours} hotels={hotels} reload={loadAll} />}
    </div>
  );
}

/* ---------- sub navigation ---------- */
function SubNav({ view, setView }) {
  const [openMenu, setOpenMenu] = useState(null); // 'report' | 'working' | null
  const ref = useRef(null);
  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpenMenu(null); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const reportActive = REPORT_KEYS.includes(view);
  const workingActive = WORKING_KEYS.includes(view);
  const pick = (k) => { setView(k); setOpenMenu(null); };

  return (
    <div className="card px-3 py-2.5 flex items-center gap-2 relative" ref={ref}>
      <button
        onClick={() => { setView('overview'); setOpenMenu(null); }}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${view === 'overview' ? 'bg-[var(--color-brand)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'}`}
      >📊 ภาพรวม (Overview)</button>

      {/* Report dropdown */}
      <div className="relative">
        <button
          onClick={() => setOpenMenu(openMenu === 'report' ? null : 'report')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${reportActive ? 'bg-[var(--color-brand)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'}`}
        >📄 Report <span className="text-xs">▾</span></button>
        {openMenu === 'report' && (
          <Menu items={REPORT_ITEMS} view={view} onPick={pick} />
        )}
      </div>

      {/* Working dropdown */}
      <div className="relative">
        <button
          onClick={() => setOpenMenu(openMenu === 'working' ? null : 'working')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${workingActive ? 'bg-[var(--color-info)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'}`}
        >🧳 Working <span className="text-xs">▾</span></button>
        {openMenu === 'working' && (
          <Menu items={WORKING_ITEMS} view={view} onPick={pick} />
        )}
      </div>
    </div>
  );
}

function Menu({ items, view, onPick }) {
  return (
    <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-[var(--color-border)] py-2 z-30">
      {items.map(it => (
        <button
          key={it.key}
          onClick={() => onPick(it.key)}
          className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${view === it.key ? 'text-[var(--color-brand)] font-semibold bg-[var(--color-brand-bg)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'}`}
        ><span>{it.icon}</span>{it.label}</button>
      ))}
    </div>
  );
}

/* ---------- reusable bits ---------- */
function CountPill({ n }) {
  return <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--color-brand-bg)] text-[var(--color-brand)]">{n} รายการ</span>;
}

/* ---------- OVERVIEW (interim — รอ pic1) ---------- */
function OverviewView({ tours, hotels, custCount }) {
  const revenue = sum(tours, saleOf) + sum(hotels, saleOf);
  const profit = sum(tours, profitOf) + sum(hotels, profitOf);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card"><div className="stat-icon bg-[var(--color-brand-bg)] text-[var(--color-brand)]">👥</div><div><div className="stat-label">Customers</div><div className="stat-value">{custCount}</div></div></div>
        <div className="stat-card"><div className="stat-icon bg-[var(--color-info-light)] text-[var(--color-info)]">🗺️</div><div><div className="stat-label">Active Tours</div><div className="stat-value">{tours.length}</div></div></div>
        <div className="stat-card"><div className="stat-icon bg-[var(--color-purple-light)] text-[var(--color-purple)]">🏨</div><div><div className="stat-label">Active Hotels</div><div className="stat-value">{hotels.length}</div></div></div>
        <div className="stat-card"><div className="stat-icon bg-[var(--color-success-light)] text-[var(--color-success)]">💰</div><div><div className="stat-label">ยอดขายรวม</div><div className="stat-value">{money(revenue)}</div></div></div>
        <div className="stat-card"><div className="stat-icon bg-[var(--color-warning-light)] text-[var(--color-warning)]">💵</div><div><div className="stat-label">กำไรรวม</div><div className="stat-value">{money(profit)}</div></div></div>
      </div>
    </div>
  );
}

/* ---------- MONTHLY REPORT (pic2) ---------- */
function MonthlyReport({ tours, hotels, month, setMonth }) {
  const mTours = useMemo(() => tours.filter(t => (t.tour_date || '').startsWith(month)), [tours, month]);
  const mHotels = useMemo(() => hotels.filter(h => (h.check_in || '').startsWith(month)), [hotels, month]);
  const totalTour = sum(mTours, profitOf);
  const totalHotel = sum(mHotels, profitOf);
  const grand = totalTour + totalHotel;

  return (
    <div className="space-y-5">
      <div className="card p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="font-semibold text-sm">เลือกเดือน:</label>
          <div className="w-52"><MonthField value={month} onChange={setMonth} /></div>
        </div>
        <div className="flex flex-wrap gap-3">
          <TotalCard label="TOTAL TOUR" value={totalTour} />
          <TotalCard label="TOTAL HOTEL" value={totalHotel} />
          <TotalCard label="GRAND TOTAL" value={grand} filled />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SummaryTable
          title="TOUR SUMMARY" count={mTours.length}
          head={['Voucher ID', 'Guest Name', 'Company', 'Profit']}
          rows={mTours.map(t => [t.customers?.item_id || '-', t.customers?.guest_name || '-', t.company_name || '-', t])}
        />
        <SummaryTable
          title="HOTEL SUMMARY" count={mHotels.length}
          head={['Voucher ID', 'Guest Name', 'Hotel Name', 'Profit']}
          rows={mHotels.map(h => [h.customers?.item_id || '-', h.customers?.guest_name || '-', h.hotel_name || '-', h])}
        />
      </div>
    </div>
  );
}

function TotalCard({ label, value, filled }) {
  return (
    <div className={`rounded-xl px-5 py-3 min-w-[130px] text-center border ${filled ? 'bg-[var(--color-brand)] border-[var(--color-brand)] text-white' : 'bg-[var(--color-brand-bg)] border-[var(--color-brand-bg)] text-[var(--color-brand)]'}`}>
      <div className={`text-[11px] font-semibold tracking-wide ${filled ? 'text-white/80' : ''}`}>{label}</div>
      <div className="text-xl font-bold">{money(value)}</div>
    </div>
  );
}

// rows: array of [col1, col2, col3, recordForProfit]
function SummaryTable({ title, count, head, rows }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm tracking-wide">{title}</h3>
        <CountPill n={count} />
      </div>
      <div className="table-container"><table><thead><tr>
        {head.map((h, i) => <th key={i} className={i === head.length - 1 ? 'text-right' : ''}>{h}</th>)}
      </tr></thead><tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={head.length} className="text-center text-[var(--color-text-muted)] py-8">ไม่มีข้อมูลในเดือนนี้</td></tr>
        ) : rows.map((r, i) => (
          <tr key={i}>
            <td><span className="font-semibold text-[var(--color-brand)]">{r[0]}</span></td>
            <td className="font-medium">{r[1]}</td>
            <td>{r[2]}</td>
            <td className="text-right font-semibold text-[var(--color-success)]">{money(profitOf(r[3]))}</td>
          </tr>
        ))}
      </tbody></table></div>
    </div>
  );
}

/* ---------- YEARLY REPORT ---------- */
function YearlyReport({ tours, hotels, year, setYear }) {
  const rows = useMemo(() => {
    return TH_MONTHS.map((label, idx) => {
      const mm = `${year}-${String(idx + 1).padStart(2, '0')}`;
      const tProfit = sum(tours.filter(t => (t.tour_date || '').startsWith(mm)), profitOf);
      const hProfit = sum(hotels.filter(h => (h.check_in || '').startsWith(mm)), profitOf);
      return { label, tProfit, hProfit, total: tProfit + hProfit };
    });
  }, [tours, hotels, year]);
  const grand = { t: sum(rows, r => r.tProfit), h: sum(rows, r => r.hProfit), all: sum(rows, r => r.total) };

  return (
    <div className="space-y-5">
      <div className="card p-5 flex items-center gap-3">
        <label className="font-semibold text-sm">เลือกปี:</label>
        <div className="w-44"><YearField value={year} onChange={v => v && setYear(v)} /></div>
      </div>
      <div className="card p-5">
        <h3 className="font-bold text-sm tracking-wide mb-3">YEARLY REPORT — กำไรรายเดือน {year}</h3>
        <div className="table-container"><table><thead><tr><th>เดือน</th><th className="text-right">กำไร Tour</th><th className="text-right">กำไร Hotel</th><th className="text-right">รวม</th></tr></thead><tbody>
          {rows.map((r, i) => (
            <tr key={i}><td className="font-medium">{r.label}</td><td className="text-right">{money(r.tProfit)}</td><td className="text-right">{money(r.hProfit)}</td><td className="text-right font-semibold text-[var(--color-success)]">{money(r.total)}</td></tr>
          ))}
          <tr className="font-bold bg-[var(--color-surface-alt)]"><td>รวมทั้งปี</td><td className="text-right">{money(grand.t)}</td><td className="text-right">{money(grand.h)}</td><td className="text-right text-[var(--color-brand)]">{money(grand.all)}</td></tr>
        </tbody></table></div>
      </div>
    </div>
  );
}

/* ---------- DAILY OPS (pic3) ---------- */
function DailyOps({ tours, hotels, opsDate, setOpsDate }) {
  const dayTours = tours.filter(t => t.tour_date === opsDate);
  const dayCheckins = hotels.filter(h => h.check_in === opsDate);
  const shiftDay = (delta) => { const d = new Date(opsDate + 'T00:00:00'); d.setDate(d.getDate() + delta); setOpsDate(localYMD(d)); };

  return (
    <div className="space-y-5">
      <div className="card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h3 className="text-lg font-bold">รายการปฏิบัติงาน (Daily Operation)</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => shiftDay(-1)} className="btn btn-ghost px-3 py-2">‹</button>
          <div className="w-44"><DateField value={opsDate} onChange={v => v && setOpsDate(v)} /></div>
          <button onClick={() => shiftDay(1)} className="btn btn-ghost px-3 py-2">›</button>
          <button onClick={() => setOpsDate(localYMD(new Date()))} className="btn btn-outline-primary px-3 py-2 text-sm">วันนี้</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <OpsColumn
          title="ทัวร์ (Tours)" icon="🚐" iconBg="bg-[var(--color-info-light)] text-[var(--color-info)]"
          count={dayTours.length} emptyText="ไม่มีรายการทัวร์ในวันที่เลือก"
          items={dayTours.map(t => ({
            id: t.id, key: t.customers?.item_id, guest: t.customers?.guest_name,
            title: t.tour_name || t.tour_detail || 'Tour',
            sub: [t.company_name, `${(parseInt(t.adult) || 0)}A ${(parseInt(t.child) || 0)}C`, t.pickup_time && `รับ ${t.pickup_time}`].filter(Boolean).join(' · '),
          }))}
        />
        <OpsColumn
          title="เช็คอินโรงแรม (Check-ins)" icon="🏨" iconBg="bg-[var(--color-purple-light)] text-[var(--color-purple)]" badgePurple
          count={dayCheckins.length} emptyText="ไม่มีรายการเช็คอินโรงแรมในวันที่เลือก"
          items={dayCheckins.map(h => ({
            id: h.id, key: h.customers?.item_id, guest: h.customers?.guest_name,
            title: h.hotel_name || 'Hotel',
            sub: [h.room_name, `${h.check_in || '?'} → ${h.check_out || '?'}`, h.total_room && `${h.total_room} ห้อง`].filter(Boolean).join(' · '),
          }))}
        />
      </div>
    </div>
  );
}

function OpsColumn({ title, icon, iconBg, count, emptyText, items, badgePurple }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold flex items-center gap-2"><span className={`stat-icon ${iconBg}`} style={{ width: 32, height: 32 }}>{icon}</span>{title}</h4>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${badgePurple ? 'bg-[var(--color-purple-light)] text-[var(--color-purple)]' : 'bg-[var(--color-info-light)] text-[var(--color-info)]'}`}>{count} รายการ</span>
      </div>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-muted)]">
          <span className="text-3xl opacity-40 mb-2">{icon}</span>
          <span className="text-sm">{emptyText}</span>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(it => (
            <div key={it.id} className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{it.title}</span>
                {it.key && <Link href={`/customers/${it.key}`} className="text-xs text-[var(--color-brand)] font-medium hover:underline shrink-0">{it.key} →</Link>}
              </div>
              <div className="text-sm text-[var(--color-text-secondary)] mt-0.5">{it.guest || '-'}</div>
              {it.sub && <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{it.sub}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- TAXI BOOKING (pic2) — ระบบบันทึกงานแท็กซี่ ---------- */
const BLANK_TAXI = { job_date: '', pickup_time: '', customer_name: '', pax: 1, job_type: '', vehicle_type: '', trip_scope: 'domestic', pickup_location: '', pickup_detail: '', dropoff_location: '', note: '', price: '' };

function TaxiBooking({ dropdowns }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [form, setForm] = useState(BLANK_TAXI);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const { data } = await supabase.from('taxi_bookings').select('*').order('job_date', { ascending: true }).order('pickup_time');
    setList(data || []);
    setLoading(false);
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const resetForm = () => { setForm(BLANK_TAXI); setEditingId(null); };

  async function save(e) {
    e.preventDefault();
    if (!form.customer_name.trim()) { toast.error('กรุณาใส่ชื่อลูกค้า'); return; }
    setSaving(true);
    const row = { ...form, pax: parseInt(form.pax) || 1, price: parseFloat(form.price) || 0, job_date: form.job_date || null };
    const { error } = editingId
      ? await supabase.from('taxi_bookings').update(row).eq('id', editingId)
      : await supabase.from('taxi_bookings').insert({ ...row, status: 'pending' });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? 'แก้ไขแล้ว' : 'บันทึกการจองแล้ว');
    resetForm(); load();
  }

  function edit(b) {
    setEditingId(b.id);
    setForm({ job_date: b.job_date || '', pickup_time: b.pickup_time || '', customer_name: b.customer_name || '', pax: b.pax || 1, job_type: b.job_type || '', vehicle_type: b.vehicle_type || '', trip_scope: b.trip_scope || 'domestic', pickup_location: b.pickup_location || '', pickup_detail: b.pickup_detail || '', dropoff_location: b.dropoff_location || '', note: b.note || '', price: b.price ?? '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function setStatus(b, status) {
    const { error } = await supabase.from('taxi_bookings').update({ status }).eq('id', b.id);
    if (error) { toast.error(error.message); return; }
    load();
  }

  async function remove(b) {
    const r = await Swal.fire({ title: 'ลบงานนี้?', text: b.customer_name, icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'ลบ', cancelButtonText: 'ยกเลิก' });
    if (!r.isConfirmed) return;
    const { error } = await supabase.from('taxi_bookings').delete().eq('id', b.id);
    if (error) { toast.error(error.message); return; }
    if (editingId === b.id) resetForm();
    load();
  }

  const pending = list.filter(b => b.status === 'pending');
  const cleared = list.filter(b => b.status === 'cleared');
  const shown = tab === 'pending' ? pending : cleared;

  function copyChat() {
    if (pending.length === 0) { toast('ไม่มีงานรอจัดรถ', { icon: 'ℹ️' }); return; }
    const lines = pending.map((b, i) => {
      const scope = b.trip_scope === 'international' ? 'อินเตอร์' : 'ในประเทศ';
      const route = `${b.pickup_location || '-'}${b.pickup_detail ? ` (${b.pickup_detail})` : ''} → ${b.dropoff_location || '-'}`;
      return [
        `งานที่ ${i + 1}: ${b.customer_name} (${b.pax || 1} ท่าน)`,
        `🗓️ ${dmy(b.job_date)} ${b.pickup_time || ''} น.`.trim(),
        `🚗 ${[b.vehicle_type, b.job_type].filter(Boolean).join(' · ')} (${scope})`,
        `📍 ${route}`,
        b.note ? `📝 ${b.note}` : '',
        `💰 เก็บเงิน ${Math.round(b.price || 0).toLocaleString()} บาท`,
      ].filter(Boolean).join('\n');
    });
    const text = `🚖 งานแท็กซี่ (รอจัดรถ ${pending.length} งาน)\n\n${lines.join('\n\n')}`;
    navigator.clipboard.writeText(text).then(() => toast.success('คัดลอกข้อความแล้ว')).catch(() => toast.error('คัดลอกไม่สำเร็จ'));
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_1fr] gap-5 items-start">
      {/* ---- LEFT: form ---- */}
      <form onSubmit={save} className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[var(--color-brand)] flex items-center gap-2">＋ {editingId ? 'แก้ไขงานจอง' : 'เพิ่มงานจองใหม่ (New Booking)'}</h3>
          {editingId && <button type="button" onClick={resetForm} className="text-xs text-[var(--color-text-muted)] hover:underline">ยกเลิกแก้ไข</button>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">📅 วันที่จอง</label><DateField value={form.job_date} onChange={v => set('job_date', v)} placeholder="เลือกวันที่" /></div>
          <div><label className="label">🕐 เวลารับ (24 ชม.)</label><TimeField value={form.pickup_time} onChange={v => set('pickup_time', v)} /></div>
          <div><label className="label">👤 ชื่อลูกค้า</label><input className="input" placeholder="เช่น คุณสมชาย" value={form.customer_name} onChange={e => set('customer_name', e.target.value)} /></div>
          <div><label className="label">👥 คน (Pax)</label><input type="number" min="1" className="input" value={form.pax} onChange={e => set('pax', e.target.value)} /></div>
          <div><label className="label">🧳 ประเภทงาน</label><Combobox options={dropdowns.taxi_job_type || []} value={form.job_type} onChange={v => set('job_type', v)} /></div>
          <div><label className="label">🚐 ประเภทรถ</label><Combobox options={dropdowns.taxi_vehicle_type || []} value={form.vehicle_type} onChange={v => set('vehicle_type', v)} /></div>
        </div>

        <div>
          <label className="label">ปลายทาง</label>
          <div className="inline-flex p-1 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] w-full">
            {[['domestic', '🏠 ในประเทศ (ดอม)'], ['international', '🌍 ต่างประเทศ (อินเตอร์)']].map(([val, lbl]) => (
              <button
                type="button" key={val} onClick={() => set('trip_scope', val)}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${form.trip_scope === val ? 'bg-[var(--color-brand)] text-white shadow-sm' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
              >{lbl}</button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] p-3 space-y-3">
          <div><label className="label text-[var(--color-success)]">📍 สถานที่รับ (Pickup)</label><Combobox options={dropdowns.taxi_location || []} value={form.pickup_location} onChange={v => set('pickup_location', v)} /></div>
          <input className="input" placeholder="ห้อง / เที่ยวบิน (ถ้ามี)..." value={form.pickup_detail} onChange={e => set('pickup_detail', e.target.value)} />
          <div><label className="label text-[var(--color-danger)]">🏁 สถานที่ส่ง (Dropoff)</label><Combobox options={dropdowns.taxi_location || []} value={form.dropoff_location} onChange={v => set('dropoff_location', v)} /></div>
        </div>

        <div><label className="label">📝 เงื่อนไขเพิ่มเติม / ป้ายชื่อ</label><textarea className="input" rows={2} placeholder="เช่น ป้ายชื่อรับสนามบิน, ต้องการคาร์ซีทเด็ก..." value={form.note} onChange={e => set('note', e.target.value)} /></div>
        <div><label className="label">💰 ค่างาน (บาท)</label><input type="number" step="0.01" className="input" placeholder="ยอดเงิน (เว้นว่างได้ถ้ายอมรับหน้างาน)" value={form.price} onChange={e => set('price', e.target.value)} /></div>

        <button type="submit" disabled={saving} className="btn btn-primary w-full justify-center text-base py-3">＋ {saving ? 'กำลังบันทึก...' : (editingId ? 'บันทึกการแก้ไข' : 'บันทึกการจอง')}</button>
      </form>

      {/* ---- RIGHT: list ---- */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex gap-2">
            <button onClick={() => setTab('pending')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'pending' ? 'bg-[var(--color-brand)] text-white' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)]'}`}>📋 รอจัดรถ ({pending.length})</button>
            <button onClick={() => setTab('cleared')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'cleared' ? 'bg-[var(--color-brand)] text-white' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)]'}`}>✓ เคลียร์แล้ว ({cleared.length})</button>
          </div>
          <button onClick={copyChat} className="btn btn-success justify-center"><span>📑</span> คัดลอกข้อความส่งแชท</button>
        </div>

        {loading ? <div className="flex justify-center py-16"><div className="w-7 h-7 border-3 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" /></div>
        : shown.length === 0 ? <div className="card p-10 text-center text-[var(--color-text-muted)]">{tab === 'pending' ? 'ไม่มีงานรอจัดรถ' : 'ยังไม่มีงานที่เคลียร์'}</div>
        : <div className="space-y-3">{shown.map((b, i) => (
            <TaxiCard key={b.id} b={b} index={i} onEdit={() => edit(b)} onClear={() => setStatus(b, b.status === 'pending' ? 'cleared' : 'pending')} onDelete={() => remove(b)} />
          ))}</div>
        }
      </div>
    </div>
  );
}

function TaxiCard({ b, index, onEdit, onClear, onDelete }) {
  const scope = b.trip_scope === 'international' ? 'อินเตอร์' : 'ในประเทศ';
  return (
    <div className="card p-4 border-l-4 border-l-[var(--color-brand)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold bg-[var(--color-brand-bg)] text-[var(--color-brand)] rounded px-2 py-0.5">งานที่ {index + 1}</span>
          <span className="font-bold">{b.customer_name}</span>
          <span className="text-sm text-[var(--color-text-muted)]">({b.pax || 1} ท่าน)</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={onEdit} className="action-btn" title="แก้ไข">✏️</button>
          <button onClick={onDelete} className="action-btn text-[var(--color-danger)]" title="ลบ">🗑️</button>
          <button
            onClick={onClear}
            className={`ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${b.status === 'cleared'
              ? 'border-[var(--color-border)] text-[var(--color-text-secondary)] bg-[var(--color-surface-alt)] hover:bg-[var(--color-surface-hover)]'
              : 'border-[var(--color-success)] text-[var(--color-success)] bg-[var(--color-success-light)] hover:bg-[var(--color-success)] hover:text-white'}`}
            title={b.status === 'cleared' ? 'กลับไปรอจัดรถ' : 'ทำเครื่องหมายว่าจัดรถแล้ว'}
          >{b.status === 'cleared' ? '↩ กลับไปรอ' : '✓ เคลียร์งาน'}</button>
        </div>
      </div>
      <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-sm mt-2">
        <span className="text-[var(--color-text-secondary)]">🗓️ {dmy(b.job_date)} {b.pickup_time} น.</span>
        {b.vehicle_type && <span className="text-[var(--color-text-secondary)]">🚗 {b.vehicle_type}</span>}
        {b.job_type && <span className="text-[var(--color-text-secondary)]">🧳 {b.job_type}</span>}
        <span className="font-bold text-[var(--color-success)] ml-auto">฿ {Math.round(b.price || 0).toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-2 text-sm mt-1.5">
        <span className="text-[var(--color-success)]">📍 {b.pickup_location || '-'}{b.pickup_detail ? ` (${b.pickup_detail})` : ''}</span>
        <span className="text-[var(--color-text-muted)]">→</span>
        <span className="text-[var(--color-danger)]">🏁 {b.dropoff_location || '-'}</span>
      </div>
      <div className="text-xs text-[var(--color-text-muted)] mt-1.5 flex items-center gap-2 flex-wrap">
        <span className="badge bg-[var(--color-warning-light)] text-[var(--color-warning)]">{scope}</span>
        <span>เก็บเงิน {Math.round(b.price || 0).toLocaleString()} บาท</span>
        {b.note && <span>· {b.note}</span>}
      </div>
    </div>
  );
}

/* ---------- PAYMENT DUE (pic1) — ติดตามสถานะจ่ายซัพพลายเออร์ / รับเงินลูกค้า ---------- */
const dmy = (ymd) => { if (!ymd) return ''; const [y, m, d] = ymd.split('-'); return `${d}/${m}/${y}`; };

function PaymentDue({ tours, hotels, reload }) {
  const today = localYMD(new Date());
  const items = useMemo(() => {
    const map = (rows, table, dateKey, nameOf, icon) => rows.map(r => ({
      uid: table + r.id, table, id: r.id, date: r[dateKey] || '', icon,
      ref: r.customers?.item_id || '-', guest: r.customers?.guest_name || '-',
      name: nameOf(r), company: table === 'tours' ? r.company_name : r.room_name,
      sale: r.sale_person, // tours/hotels don't store sale_person on the row; kept for layout parity
      supplier_paid: !!r.supplier_paid, supplier_paid_date: r.supplier_paid_date || '',
      customer_paid: !!r.customer_paid, customer_paid_date: r.customer_paid_date || '',
    }));
    const list = [
      ...map(tours, 'tours', 'tour_date', t => t.tour_name || t.tour_detail || 'Tour', '🚗'),
      ...map(hotels, 'hotels', 'check_in', h => h.hotel_name || 'Hotel', '🏨'),
    ];
    // upcoming (>= today) soonest-first on top; past after, most-recent first
    return list.sort((a, b) => {
      const af = a.date >= today, bf = b.date >= today;
      if (af !== bf) return af ? -1 : 1;
      return af ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
    });
  }, [tours, hotels, today]);

  const [openId, setOpenId] = useState(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 className="text-lg font-bold">รายการค้างชำระ / รอตรวจสอบ</h3>
        <span className="text-xs text-[var(--color-warning)] bg-[var(--color-warning-light)] border border-[var(--color-warning)]/30 rounded-full px-3 py-1.5 self-start sm:self-auto">รายการที่ใกล้ถึงวันเที่ยว/วันเช็คอิน จะอยู่ด้านบน</span>
      </div>
      {items.length === 0 ? (
        <div className="card p-10 text-center text-[var(--color-text-muted)]">ไม่มีรายการ</div>
      ) : (
        <div className="space-y-2.5">
          {items.map(it => (
            <PaymentRow key={it.uid} item={it} open={openId === it.uid}
              onToggle={() => setOpenId(openId === it.uid ? null : it.uid)} reload={reload} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatusLabel({ title, paid, date }) {
  return (
    <div className="text-right">
      <div className="text-[11px] text-[var(--color-text-muted)]">{title}</div>
      <div className={`text-sm font-bold ${paid ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>{paid ? 'Paid' : 'Unpaid'}</div>
      {paid && date && <div className="text-[11px] text-[var(--color-text-muted)]">({dmy(date)})</div>}
    </div>
  );
}

function PayToggle({ paid, onChange, color }) {
  return (
    <div className="flex items-center gap-2.5 text-sm font-semibold">
      <span className={paid ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-danger)]'}>Unpaid</span>
      <button type="button" onClick={() => onChange(!paid)} aria-pressed={paid}
        className="relative w-11 h-6 rounded-full transition-colors shrink-0"
        style={{ background: paid ? color : 'var(--color-border)' }}>
        <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
          style={{ transform: paid ? 'translateX(20px)' : 'none' }} />
      </button>
      <span className={paid ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}>Paid</span>
    </div>
  );
}

function PaymentRow({ item, open, onToggle, reload }) {
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  // initialise the editable draft when the row is expanded
  useEffect(() => {
    if (open) setDraft({
      supplier_paid: item.supplier_paid, supplier_paid_date: item.supplier_paid_date,
      customer_paid: item.customer_paid, customer_paid_date: item.customer_paid_date,
    });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function setPaid(side, paid) {
    setDraft(d => {
      const next = { ...d, [`${side}_paid`]: paid };
      // default the date to today when marking Paid with no date yet
      if (paid && !next[`${side}_paid_date`]) next[`${side}_paid_date`] = localYMD(new Date());
      return next;
    });
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from(item.table).update({
      supplier_paid: draft.supplier_paid, supplier_paid_date: draft.supplier_paid_date || null,
      customer_paid: draft.customer_paid, customer_paid_date: draft.customer_paid_date || null,
    }).eq('id', item.id);
    setSaving(false);
    if (error) { toast.error('บันทึกไม่สำเร็จ: ' + error.message); return; }
    toast.success('บันทึกแล้ว');
    onToggle();        // collapse
    reload && reload();
  }

  return (
    <div className="card overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-[var(--color-surface-alt)] transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <span className="stat-icon bg-[var(--color-brand-bg)] text-[var(--color-brand)] shrink-0" style={{ width: 36, height: 36 }}>{item.icon}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold bg-[var(--color-text-primary)] text-white rounded px-1.5 py-0.5">{item.ref}</span>
              <span className="font-bold truncate">{item.guest}</span>
            </div>
            <div className="text-xs text-[var(--color-text-secondary)] truncate mt-0.5">
              {[item.name, item.company].filter(Boolean).join(' , ')} {item.date && <span className="font-medium">- {dmy(item.date)}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-5 shrink-0">
          <StatusLabel title="ซัพพลายเออร์" paid={item.supplier_paid} date={item.supplier_paid_date} />
          <StatusLabel title="ลูกค้า" paid={item.customer_paid} date={item.customer_paid_date} />
        </div>
      </button>

      {open && draft && (
        <div className="px-4 pb-4 pt-1 border-t border-[var(--color-border)] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
            <div className="rounded-xl border-2 border-[var(--color-brand)] p-4 space-y-3">
              <h4 className="font-bold text-sm">การจ่ายเงินซัพพลายเออร์</h4>
              <div className="flex items-center justify-between"><span className="text-sm text-[var(--color-text-secondary)]">สถานะ</span><PayToggle paid={draft.supplier_paid} onChange={p => setPaid('supplier', p)} color="var(--color-brand)" /></div>
              <DateField value={draft.supplier_paid_date} onChange={v => setDraft(d => ({ ...d, supplier_paid_date: v }))} placeholder="วันที่จ่าย" />
            </div>
            <div className="rounded-xl border-2 border-[var(--color-warning)] p-4 space-y-3">
              <h4 className="font-bold text-sm">การรับเงินจากลูกค้า</h4>
              <div className="flex items-center justify-between"><span className="text-sm text-[var(--color-text-secondary)]">สถานะ</span><PayToggle paid={draft.customer_paid} onChange={p => setPaid('customer', p)} color="var(--color-warning)" /></div>
              <DateField value={draft.customer_paid_date} onChange={v => setDraft(d => ({ ...d, customer_paid_date: v }))} placeholder="วันที่รับเงิน" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={save} disabled={saving} className="btn bg-[var(--color-text-primary)] text-white">{saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า (Save)'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

