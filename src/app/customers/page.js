'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Swal from 'sweetalert2';

const PAGE_SIZE = 20;

export default function CustomerListPage() {
  const [tab, setTab] = useState('tours');
  const [tours, setTours] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [tourPage, setTourPage] = useState(0);
  const [hotelPage, setHotelPage] = useState(0);
  const [tourCount, setTourCount] = useState(0);
  const [hotelCount, setHotelCount] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);

    const tourQuery = supabase
      .from('tours')
      .select('*, customers!inner(item_id, guest_name, nationality)', { count: 'exact' })
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(tourPage * PAGE_SIZE, (tourPage + 1) * PAGE_SIZE - 1);

    const hotelQuery = supabase
      .from('hotels')
      .select('*, customers!inner(item_id, guest_name, nationality)', { count: 'exact' })
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(hotelPage * PAGE_SIZE, (hotelPage + 1) * PAGE_SIZE - 1);

    if (search.trim()) {
      tourQuery.ilike('customers.guest_name', `%${search.trim()}%`);
      hotelQuery.ilike('customers.guest_name', `%${search.trim()}%`);
    }

    const [tourRes, hotelRes] = await Promise.all([tourQuery, hotelQuery]);

    setTours(tourRes.data || []);
    setTourCount(tourRes.count || 0);
    setHotels(hotelRes.data || []);
    setHotelCount(hotelRes.count || 0);
    setLoading(false);
  }, [tourPage, hotelPage, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleSearch(e) {
    e.preventDefault();
    setTourPage(0);
    setHotelPage(0);
    loadData();
  }

  async function handleDelete(itemId) {
    const result = await Swal.fire({
      title: 'Delete Customer?',
      text: 'This will delete all tours and hotels under this customer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Delete',
    });
    if (!result.isConfirmed) return;

    const { data: cust } = await supabase.from('customers').select('id').eq('item_id', itemId).single();
    if (cust) {
      await supabase.from('tours').delete().eq('customer_id', cust.id);
      await supabase.from('hotels').delete().eq('customer_id', cust.id);
      await supabase.from('customers').delete().eq('id', cust.id);
    }
    loadData();
    Swal.fire({ title: 'Deleted', icon: 'success', timer: 1500, showConfirmButton: false });
  }

  const tourPages = Math.ceil(tourCount / PAGE_SIZE);
  const hotelPages = Math.ceil(hotelCount / PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Customers</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Manage tour and hotel bookings</p>
        </div>
        <Link href="/customers/new" className="btn btn-primary">
          ＋ New Booking
        </Link>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <input
            type="text"
            className="input flex-1"
            placeholder="Search by guest name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">Search</button>
          {search && (
            <button type="button" className="btn btn-ghost" onClick={() => { setSearch(''); setTourPage(0); setHotelPage(0); }}>
              Clear
            </button>
          )}
        </form>
      </div>

      <div className="tab-bar w-fit">
        <button className={`tab-item ${tab === 'tours' ? 'active' : ''}`} onClick={() => setTab('tours')}>
          🗺️ Tours ({tourCount})
        </button>
        <button className={`tab-item ${tab === 'hotels' ? 'active' : ''}`} onClick={() => setTab('hotels')}>
          🏨 Hotels ({hotelCount})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-7 h-7 border-3 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'tours' ? (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Item ID</th>
                  <th>Guest Name</th>
                  <th>Tour Date</th>
                  <th>Tour Detail</th>
                  <th>Tour Name</th>
                  <th>Company</th>
                  <th>Adult</th>
                  <th>Child</th>
                  <th>Pickup</th>
                  <th>Hotel</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tours.length === 0 ? (
                  <tr><td colSpan={11} className="text-center text-[var(--color-text-muted)] py-8">No tour data</td></tr>
                ) : tours.map(t => (
                  <tr key={t.id}>
                    <td className="font-medium text-[var(--color-brand)]">{t.customers?.item_id}</td>
                    <td>{t.customers?.guest_name}</td>
                    <td>{t.tour_date || '-'}</td>
                    <td>{t.tour_detail || '-'}</td>
                    <td><span className="badge badge-tour">{t.tour_name || '-'}</span></td>
                    <td>{t.company_name || '-'}</td>
                    <td>{t.adult || '-'}</td>
                    <td>{t.child || '-'}</td>
                    <td>{t.pickup_time || '-'}</td>
                    <td>{t.hotel_name || '-'}</td>
                    <td>
                      <div className="flex gap-1">
                        <Link href={`/customers/${t.customers?.item_id}`} className="btn btn-ghost text-xs px-2.5 py-1.5">
                          ✏️
                        </Link>
                        <button onClick={() => handleDelete(t.customers?.item_id)} className="btn btn-ghost text-xs px-2.5 py-1.5 text-[var(--color-danger)]">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tourPages > 1 && (
            <div className="p-4 flex justify-center">
              <Pagination page={tourPage} total={tourPages} onChange={setTourPage} />
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Item ID</th>
                  <th>Guest Name</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Nights</th>
                  <th>Hotel</th>
                  <th>Room</th>
                  <th>Breakfast</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {hotels.length === 0 ? (
                  <tr><td colSpan={9} className="text-center text-[var(--color-text-muted)] py-8">No hotel data</td></tr>
                ) : hotels.map(h => (
                  <tr key={h.id}>
                    <td className="font-medium text-[var(--color-brand)]">{h.customers?.item_id}</td>
                    <td>{h.customers?.guest_name}</td>
                    <td>{h.check_in || '-'}</td>
                    <td>{h.check_out || '-'}</td>
                    <td>{h.total_night || '-'}</td>
                    <td><span className="badge badge-hotel">{h.hotel_name || '-'}</span></td>
                    <td>{h.room_name || '-'}</td>
                    <td>{h.breakfast || '-'}</td>
                    <td>
                      <div className="flex gap-1">
                        <Link href={`/customers/${h.customers?.item_id}`} className="btn btn-ghost text-xs px-2.5 py-1.5">
                          ✏️
                        </Link>
                        <button onClick={() => handleDelete(h.customers?.item_id)} className="btn btn-ghost text-xs px-2.5 py-1.5 text-[var(--color-danger)]">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hotelPages > 1 && (
            <div className="p-4 flex justify-center">
              <Pagination page={hotelPage} total={hotelPages} onChange={setHotelPage} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Pagination({ page, total, onChange }) {
  const pages = [];
  const start = Math.max(0, page - 2);
  const end = Math.min(total, start + 5);

  for (let i = start; i < end; i++) {
    pages.push(i);
  }

  return (
    <div className="pagination">
      <button disabled={page === 0} onClick={() => onChange(page - 1)}>‹</button>
      {pages.map(p => (
        <button key={p} className={p === page ? 'active' : ''} onClick={() => onChange(p)}>
          {p + 1}
        </button>
      ))}
      <button disabled={page >= total - 1} onClick={() => onChange(page + 1)}>›</button>
    </div>
  );
}
