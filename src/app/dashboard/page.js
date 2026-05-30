'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState({ customers: 0, tours: 0, hotels: 0, revenue: 0, profit: 0 });
  const [recentTours, setRecentTours] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    const [{ count: customers }, { count: tours }, { count: hotels }] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('tours').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('hotels').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    ]);
    const { data: allTours } = await supabase.from('tours').select('sale_amount, net_amount').eq('status', 'active');
    const { data: allHotels } = await supabase.from('hotels').select('sale_amount, net_amount').eq('status', 'active');
    let revenue = 0, profit = 0;
    (allTours || []).forEach(t => { const s = parseFloat(t.sale_amount) || 0; revenue += s; profit += s - (parseFloat(t.net_amount) || 0); });
    (allHotels || []).forEach(h => { const s = parseFloat(h.sale_amount) || 0; revenue += s; profit += s - (parseFloat(h.net_amount) || 0); });
    setStats({ customers: customers || 0, tours: tours || 0, hotels: hotels || 0, revenue, profit });
    const { data: recent } = await supabase.from('tours').select('*, customers(item_id, guest_name)').eq('status', 'active').order('tour_date', { ascending: false }).limit(10);
    setRecentTours(recent || []);
    setLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Executive Dashboard</h2><Link href="/" className="btn btn-outline-primary">← Voucher Management</Link></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card"><div className="stat-icon bg-[var(--color-brand-bg)] text-[var(--color-brand)]">👥</div><div><div className="stat-label">Customers</div><div className="stat-value">{stats.customers}</div></div></div>
        <div className="stat-card"><div className="stat-icon bg-[var(--color-info-light)] text-[var(--color-info)]">🗺️</div><div><div className="stat-label">Active Tours</div><div className="stat-value">{stats.tours}</div></div></div>
        <div className="stat-card"><div className="stat-icon bg-[var(--color-purple-light)] text-[var(--color-purple)]">🏨</div><div><div className="stat-label">Active Hotels</div><div className="stat-value">{stats.hotels}</div></div></div>
        <div className="stat-card"><div className="stat-icon bg-[var(--color-success-light)] text-[var(--color-success)]">💰</div><div><div className="stat-label">Revenue</div><div className="stat-value">฿{Math.round(stats.revenue).toLocaleString()}</div></div></div>
        <div className="stat-card"><div className="stat-icon bg-[var(--color-warning-light)] text-[var(--color-warning)]">💵</div><div><div className="stat-label">Profit</div><div className="stat-value">฿{Math.round(stats.profit).toLocaleString()}</div></div></div>
      </div>
      <div className="card p-6">
        <h3 className="font-semibold text-lg mb-4">Recent Tour Bookings</h3>
        {recentTours.length === 0 ? <p className="text-[var(--color-text-muted)] text-sm py-8 text-center">ยังไม่มีรายการ</p> : (
          <div className="table-container"><table><thead><tr><th>Customer</th><th>Tour Date</th><th>Tour Name</th><th>Company</th><th>Pax</th><th>Sale</th><th></th></tr></thead><tbody>
            {recentTours.map(t => (<tr key={t.id}><td className="font-medium">{t.customers?.guest_name || '-'}</td><td>{t.tour_date || '-'}</td><td><span className="badge badge-tour">{t.tour_name || '-'}</span></td><td>{t.company_name || '-'}</td><td>{(t.adult || 0) + (t.child || 0)}</td><td>฿{(parseFloat(t.sale_amount) || 0).toLocaleString()}</td><td><Link href={`/customers/${t.customers?.item_id}`} className="text-[var(--color-brand)] text-sm font-medium hover:underline">View →</Link></td></tr>))}
          </tbody></table></div>
        )}
      </div>
    </div>
  );
}
