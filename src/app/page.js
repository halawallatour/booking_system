'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';

const PAGE_SIZE = 20;

export default function VoucherManagementPage() {
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({ salesToday: 0, salesMonth: 0, profitTotal: 0, totalCustomers: 0 });
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { count: custCount } = await supabase.from('customers').select('*', { count: 'exact', head: true });
      setConnected(true);
      const today = new Date().toISOString().slice(0, 10);
      const monthStart = today.slice(0, 7) + '-01';
      const { data: allTours } = await supabase.from('tours').select('tour_date, sale_amount, net_amount').eq('status', 'active');
      const { data: allHotels } = await supabase.from('hotels').select('check_in, sale_amount, net_amount').eq('status', 'active');
      let salesToday = 0, salesMonth = 0, profitTotal = 0;
      (allTours || []).forEach(t => { const s = parseFloat(t.sale_amount) || 0; const n = parseFloat(t.net_amount) || 0; profitTotal += (s - n); if (t.tour_date === today) salesToday += s; if (t.tour_date >= monthStart && t.tour_date <= today) salesMonth += s; });
      (allHotels || []).forEach(h => { const s = parseFloat(h.sale_amount) || 0; const n = parseFloat(h.net_amount) || 0; profitTotal += (s - n); if (h.check_in === today) salesToday += s; if (h.check_in >= monthStart && h.check_in <= today) salesMonth += s; });
      setStats({ salesToday, salesMonth, profitTotal, totalCustomers: custCount || 0 });

      let query = supabase.from('customers').select('*, tours(*), hotels(*)', { count: 'exact' }).order('created_at', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      // strip characters that have special meaning in PostgREST's .or() filter so a stray "," or "()" can't break the request
      const term = appliedSearch.replace(/[,()]/g, ' ').trim();
      if (term) query = query.or(`guest_name.ilike.%${term}%,item_id.ilike.%${term}%`);
      const { data, count } = await query;
      setCustomers(data || []);
      setTotalCount(count || 0);
    } catch (err) { setConnected(false); }
    setLoading(false);
  }, [page, appliedSearch]);

  useEffect(() => { loadData(); }, [loadData]);

  // commit the search box into appliedSearch and reset to page 0; the effect above re-fetches once
  function handleSearch(e) { e.preventDefault(); setPage(0); setAppliedSearch(search.trim()); }

  async function handleDelete(cust) {
    const r = await Swal.fire({ title: 'ลบลูกค้า?', text: `${cust.item_id} — ${cust.guest_name}`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'ลบ', cancelButtonText: 'ยกเลิก' });
    if (!r.isConfirmed) return;
    // tours/hotels are removed automatically via the customer_id FK (ON DELETE CASCADE)
    const { error } = await supabase.from('customers').delete().eq('id', cust.id);
    if (error) { toast.error('ลบไม่สำเร็จ: ' + error.message); return; }
    toast.success('ลบเรียบร้อย');
    loadData();
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  function formatMoney(n) { return '฿' + Math.round(n).toLocaleString(); }

  return (
    <div className="space-y-6">
      <div className="card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Tour Voucher Management</h2>
            {connected && <p className="text-sm text-[var(--color-success)] mt-1 flex items-center gap-1"><span>✓</span> เชื่อมต่อฐานข้อมูล Supabase แล้ว</p>}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/database" className="btn btn-outline-primary">📋 ฐานข้อมูล</Link>
            <Link href="/sql-editor" className="btn btn-outline-primary">🛠️ SQL</Link>
            <Link href="/customers/new" className="btn btn-primary">＋ สร้างการจองใหม่</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="stat-card"><div className="stat-icon bg-[var(--color-brand-bg)] text-[var(--color-brand)]">💰</div><div><div className="stat-label">ยอดขายวันนี้</div><div className="stat-value">{formatMoney(stats.salesToday)}</div></div></div>
          <div className="stat-card"><div className="stat-icon bg-[var(--color-info-light)] text-[var(--color-info)]">📊</div><div><div className="stat-label">ยอดขายเดือนนี้</div><div className="stat-value">{formatMoney(stats.salesMonth)}</div></div></div>
          <div className="stat-card"><div className="stat-icon bg-[var(--color-success-light)] text-[var(--color-success)]">💵</div><div><div className="stat-label">กำไรสุทธิรวม</div><div className="stat-value">{formatMoney(stats.profitTotal)}</div></div></div>
          <div className="stat-card"><div className="stat-icon bg-[var(--color-success-light)] text-[var(--color-success)]">✓</div><div><div className="stat-label">จำนวนลูกค้ารวม</div><div className="stat-value">{stats.totalCustomers} <span className="text-sm font-normal text-[var(--color-text-muted)]">รายการ</span></div></div></div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold text-base flex items-center gap-2"><span>✓</span> รายการจองล่าสุด</h3>
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={loadData} className="btn btn-outline-primary text-sm px-3 py-2">🔄 Refresh</button>
            <form onSubmit={handleSearch} className="flex gap-2 flex-1 sm:flex-initial">
              <div className="relative flex-1 sm:w-64">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">🔍</span>
                <input type="text" className="input pl-9" placeholder="ค้นหารหัส, ชื่อลูกค้า..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              {search && <button type="button" className="btn btn-ghost text-sm px-3 py-2" onClick={() => { setSearch(''); setAppliedSearch(''); setPage(0); }}>✕</button>}
            </form>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-7 h-7 border-3 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <>
            <div className="table-container"><table><thead><tr><th>Booking Ref</th><th>Customer Name</th><th>Itinerary Summary</th><th className="text-right">Action</th></tr></thead><tbody>
              {customers.length === 0 ? (<tr><td colSpan={4} className="text-center text-[var(--color-text-muted)] py-12">ไม่พบข้อมูล</td></tr>) : customers.map(cust => {
                const activeTours = (cust.tours || []).filter(t => t.status === 'active');
                const activeHotels = (cust.hotels || []).filter(h => h.status === 'active');
                return (
                  <tr key={cust.id}>
                    <td><span className="font-semibold text-[var(--color-brand)]">{cust.item_id}</span></td>
                    <td><span className="font-semibold">{cust.guest_name}</span></td>
                    <td><div className="space-y-1">
                      {activeTours.map(t => (<div key={t.id} className="flex items-center gap-2 text-sm"><span className="badge badge-tour">🗺️ Tour</span><span>{t.tour_name || t.tour_detail || 'Tour'}</span>{t.tour_date && <span className="text-[var(--color-text-muted)]">({t.tour_date})</span>}</div>))}
                      {activeHotels.map(h => (<div key={h.id} className="flex items-center gap-2 text-sm"><span className="badge badge-hotel">🏨 Hotel</span><span>{h.hotel_name || 'Hotel'}</span>{h.check_in && <span className="text-[var(--color-text-muted)]">({h.check_in})</span>}</div>))}
                      {activeTours.length === 0 && activeHotels.length === 0 && <span className="text-sm text-[var(--color-text-muted)]">— ยังไม่มีรายการ</span>}
                    </div></td>
                    <td><div className="flex gap-1 justify-end">
                      <Link href={`/customers/${cust.item_id}?add=true`} className="action-btn" title="เพิ่มรายการ">＋</Link>
                      <Link href={`/customers/${cust.item_id}`} className="action-btn" title="แก้ไข">✏️</Link>
                      <button onClick={() => handleDelete(cust)} className="action-btn text-[var(--color-danger)]" title="ลบ">🗑️</button>
                    </div></td>
                  </tr>);
              })}
            </tbody></table></div>
            {totalPages > 1 && <div className="flex justify-center pt-4"><Pagination page={page} total={totalPages} onChange={setPage} /></div>}
          </>
        )}
      </div>
    </div>
  );
}

function Pagination({ page, total, onChange }) {
  const pages = []; const start = Math.max(0, page - 2); const end = Math.min(total, start + 5);
  for (let i = start; i < end; i++) pages.push(i);
  return (<div className="pagination"><button disabled={page === 0} onClick={() => onChange(page - 1)}>‹</button>{pages.map(p => (<button key={p} className={p === page ? 'active' : ''} onClick={() => onChange(p)}>{p + 1}</button>))}<button disabled={page >= total - 1} onClick={() => onChange(page + 1)}>›</button></div>);
}
