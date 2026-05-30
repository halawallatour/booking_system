'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';

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
  { key: 'themepark', label: 'Theme Park Report', icon: '🎡' },
  { key: 'yearly', label: 'Yearly Report', icon: '📈' },
];
const WORKING_ITEMS = [
  { key: 'dailyops', label: 'Daily Ops', icon: '🚐' },
  { key: 'taxi', label: 'Taxi Booking', icon: '🚕' },
  { key: 'paymentdue', label: 'Payment Due', icon: '💳' },
  { key: 'package', label: 'Create Package', icon: '📦' },
];
const REPORT_KEYS = REPORT_ITEMS.map(i => i.key);
const WORKING_KEYS = WORKING_ITEMS.map(i => i.key);

export default function DashboardPage() {
  const [view, setView] = useState('overview');
  const [tours, setTours] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [custCount, setCustCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [month, setMonth] = useState('');   // YYYY-MM
  const [year, setYear] = useState('');     // YYYY
  const [opsDate, setOpsDate] = useState(''); // YYYY-MM-DD

  async function loadAll() {
    setLoading(true);
    try {
      const [{ count }, { data: t }, { data: h }] = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('tours').select('*, customers(item_id, guest_name)').eq('status', 'active'),
        supabase.from('hotels').select('*, customers(item_id, guest_name)').eq('status', 'active'),
      ]);
      setCustCount(count || 0);
      setTours(t || []);
      setHotels(h || []);
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
      {view === 'themepark' && <ThemeParkReport tours={tours} month={month} setMonth={setMonth} />}
      {view === 'yearly' && <YearlyReport tours={tours} hotels={hotels} year={year} setYear={setYear} />}
      {view === 'dailyops' && <DailyOps tours={tours} hotels={hotels} opsDate={opsDate} setOpsDate={setOpsDate} />}
      {view === 'taxi' && <TaxiBooking tours={tours} />}
      {view === 'paymentdue' && <PaymentDue tours={tours} hotels={hotels} />}
      {view === 'package' && <CreatePackage />}
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
function NoteBanner({ children }) {
  return <p className="text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg px-3 py-2">ℹ️ {children}</p>;
}

/* ---------- OVERVIEW (interim — รอ pic1) ---------- */
function OverviewView({ tours, hotels, custCount }) {
  const revenue = sum(tours, saleOf) + sum(hotels, saleOf);
  const profit = sum(tours, profitOf) + sum(hotels, profitOf);
  return (
    <div className="space-y-5">
      <NoteBanner>หน้า Overview นี้เป็นภาพรวม KPI ชั่วคราว — รอรูป <b>pic1</b> เพื่อปรับให้ตรงดีไซน์</NoteBanner>
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
          <label className="font-semibold text-sm">Select Month:</label>
          <input type="month" className="input w-auto" value={month} onChange={e => setMonth(e.target.value)} />
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

/* ---------- THEME PARK REPORT (grouped by attraction — interpretation) ---------- */
function ThemeParkReport({ tours, month, setMonth }) {
  const grouped = useMemo(() => {
    const mTours = tours.filter(t => (t.tour_date || '').startsWith(month));
    const map = {};
    mTours.forEach(t => {
      const name = t.tour_name || t.tour_detail || '(ไม่ระบุชื่อ)';
      if (!map[name]) map[name] = { name, count: 0, pax: 0, sale: 0, profit: 0 };
      map[name].count += 1;
      map[name].pax += (parseInt(t.adult) || 0) + (parseInt(t.child) || 0);
      map[name].sale += saleOf(t);
      map[name].profit += profitOf(t);
    });
    return Object.values(map).sort((a, b) => b.profit - a.profit);
  }, [tours, month]);

  return (
    <div className="space-y-5">
      <NoteBanner>Theme Park Report ตีความเป็น “สรุปทัวร์แยกตามชื่อสถานที่/สวนสนุก” ของเดือนที่เลือก — ถ้าต้องการกรองเฉพาะสวนสนุกจริง ๆ ต้องเพิ่มแท็กประเภททัวร์ใน DropDown</NoteBanner>
      <div className="card p-5 flex items-center gap-3">
        <label className="font-semibold text-sm">Select Month:</label>
        <input type="month" className="input w-auto" value={month} onChange={e => setMonth(e.target.value)} />
      </div>
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-sm tracking-wide">THEME PARK / ATTRACTION SUMMARY</h3><CountPill n={grouped.length} /></div>
        <div className="table-container"><table><thead><tr><th>สถานที่ / สวนสนุก</th><th className="text-right">จำนวนครั้ง</th><th className="text-right">Pax</th><th className="text-right">ยอดขาย</th><th className="text-right">กำไร</th></tr></thead><tbody>
          {grouped.length === 0 ? <tr><td colSpan={5} className="text-center text-[var(--color-text-muted)] py-8">ไม่มีข้อมูลในเดือนนี้</td></tr> : grouped.map((g, i) => (
            <tr key={i}><td className="font-medium">{g.name}</td><td className="text-right">{g.count}</td><td className="text-right">{g.pax}</td><td className="text-right">{money(g.sale)}</td><td className="text-right font-semibold text-[var(--color-success)]">{money(g.profit)}</td></tr>
          ))}
        </tbody></table></div>
      </div>
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
  const years = [];
  const nowY = year ? parseInt(year) : new Date().getFullYear();
  for (let y = nowY + 1; y >= nowY - 5; y--) years.push(y);

  return (
    <div className="space-y-5">
      <div className="card p-5 flex items-center gap-3">
        <label className="font-semibold text-sm">Select Year:</label>
        <select className="input w-auto" value={year} onChange={e => setYear(e.target.value)}>
          {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
        </select>
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
          <input type="date" className="input w-auto" value={opsDate} onChange={e => setOpsDate(e.target.value)} />
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

/* ---------- TAXI BOOKING (interpretation: company contains "taxi") ---------- */
function TaxiBooking({ tours }) {
  const taxiTours = useMemo(
    () => tours.filter(t => (t.company_name || '').toLowerCase().includes('taxi'))
      .sort((a, b) => (b.tour_date || '').localeCompare(a.tour_date || '')),
    [tours]
  );
  return (
    <div className="space-y-5">
      <NoteBanner>Taxi Booking ตีความเป็น “ทัวร์/รับส่งที่บริษัทมีคำว่า taxi” (เช่น Krit Taxi) — ถ้าต้องการแยกระบบแท็กซี่จริง ๆ ต้องเพิ่มตาราง/field ใหม่</NoteBanner>
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-sm tracking-wide">TAXI BOOKING</h3><CountPill n={taxiTours.length} /></div>
        <div className="table-container"><table><thead><tr><th>วันที่</th><th>Voucher</th><th>Guest</th><th>บริษัท</th><th className="text-right">Pax</th><th className="text-right">กำไร</th></tr></thead><tbody>
          {taxiTours.length === 0 ? <tr><td colSpan={6} className="text-center text-[var(--color-text-muted)] py-8">ไม่มีรายการแท็กซี่</td></tr> : taxiTours.map(t => (
            <tr key={t.id}><td>{t.tour_date || '-'}</td><td><span className="font-semibold text-[var(--color-brand)]">{t.customers?.item_id || '-'}</span></td><td className="font-medium">{t.customers?.guest_name || '-'}</td><td>{t.company_name}</td><td className="text-right">{(parseInt(t.adult) || 0) + (parseInt(t.child) || 0)}</td><td className="text-right font-semibold text-[var(--color-success)]">{money(profitOf(t))}</td></tr>
          ))}
        </tbody></table></div>
      </div>
    </div>
  );
}

/* ---------- PAYMENT DUE (interim: upcoming bookings) ---------- */
function PaymentDue({ tours, hotels }) {
  const today = localYMD(new Date());
  const items = useMemo(() => {
    const a = tours.filter(t => (t.tour_date || '') >= today).map(t => ({
      id: 't' + t.id, date: t.tour_date, type: 'Tour', key: t.customers?.item_id, guest: t.customers?.guest_name,
      name: t.tour_name || t.tour_detail || 'Tour', net: parseFloat(t.net_amount) || 0, sale: saleOf(t),
    }));
    const b = hotels.filter(h => (h.check_in || '') >= today).map(h => ({
      id: 'h' + h.id, date: h.check_in, type: 'Hotel', key: h.customers?.item_id, guest: h.customers?.guest_name,
      name: h.hotel_name || 'Hotel', net: parseFloat(h.net_amount) || 0, sale: saleOf(h),
    }));
    return [...a, ...b].sort((x, y) => (x.date || '').localeCompare(y.date || ''));
  }, [tours, hotels, today]);
  const totalNet = sum(items, i => i.net);

  return (
    <div className="space-y-5">
      <NoteBanner>Payment Due (ชั่วคราว) แสดง “รายการที่กำลังจะถึง” เรียงตามวันที่ พร้อมยอดต้นทุนที่ต้องจ่ายซัพพลายเออร์ — ถ้าต้องการติดตามสถานะจ่าย/ค้างจ่ายจริง ต้องเพิ่ม field (เช่น payment_status, due_date) ใน DB</NoteBanner>
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-sm tracking-wide">PAYMENT DUE — รายการที่กำลังจะถึง</h3><span className="text-sm font-semibold">รวมต้นทุน {money(totalNet)}</span></div>
        <div className="table-container"><table><thead><tr><th>วันที่</th><th>ประเภท</th><th>Voucher</th><th>Guest</th><th>รายการ</th><th className="text-right">ต้นทุน (Net)</th></tr></thead><tbody>
          {items.length === 0 ? <tr><td colSpan={6} className="text-center text-[var(--color-text-muted)] py-8">ไม่มีรายการที่กำลังจะถึง</td></tr> : items.map(it => (
            <tr key={it.id}><td>{it.date || '-'}</td><td><span className={`badge ${it.type === 'Tour' ? 'badge-tour' : 'badge-hotel'}`}>{it.type}</span></td><td><span className="font-semibold text-[var(--color-brand)]">{it.key || '-'}</span></td><td className="font-medium">{it.guest || '-'}</td><td>{it.name}</td><td className="text-right font-semibold">{money(it.net)}</td></tr>
          ))}
        </tbody></table></div>
      </div>
    </div>
  );
}

/* ---------- CREATE PACKAGE (interpretation: shortcut to new multi-item booking) ---------- */
function CreatePackage() {
  return (
    <div className="card p-8 text-center space-y-4">
      <NoteBanner>Create Package ตีความเป็น “สร้างการจองใหม่ที่รวมหลายรายการ (ทัวร์+โรงแรม) ในลูกค้าเดียว” ซึ่งใช้ฟอร์มสร้างการจองเดิม — ถ้าต้องการระบบ Package แบบเทมเพลตสำเร็จรูป แจ้งรายละเอียดได้</NoteBanner>
      <div className="text-5xl">📦</div>
      <h3 className="text-xl font-bold">สร้างแพ็กเกจ / การจองใหม่</h3>
      <p className="text-[var(--color-text-secondary)] text-sm">สร้างลูกค้าใหม่แล้วเพิ่มได้ทั้งทัวร์และโรงแรมในรายการเดียว</p>
      <Link href="/customers/new" className="btn btn-primary inline-flex">＋ ไปสร้างการจองใหม่</Link>
    </div>
  );
}
