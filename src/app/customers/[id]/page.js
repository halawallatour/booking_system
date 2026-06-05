'use client';
import { useEffect, useState, useRef, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import BookingWizard from '@/components/BookingWizard';
import { backupCustomerById } from '@/lib/backup';
import { toTourRow, toHotelRow, toTaxiRow, fromTourRow, fromHotelRow } from '@/lib/bookingRows';
import { printVoucherDialog } from '@/lib/voucher';

export default function EditCustomerPage({ params }) {
  const { id: itemId } = use(params);
  const router = useRouter();
  const [dropdowns, setDropdowns] = useState({});
  const [customerId, setCustomerId] = useState(null);
  const [initial, setInitial] = useState(null); // {customer, tours, hotels}
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const origIds = useRef({ tours: [], hotels: [] });

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { data: dd } = await supabase.from('dropdowns').select('*').order('sort_order');
      const grouped = {}; (dd || []).forEach(d => { (grouped[d.category] ||= []).push(d.value); });
      setDropdowns(grouped);

      const { data: cust } = await supabase.from('customers').select('*').eq('item_id', itemId).single();
      if (!cust) { toast.error('ไม่พบข้อมูลลูกค้า'); router.push('/'); return; }
      setCustomerId(cust.id);

      const [{ data: toursData }, { data: hotelsData }] = await Promise.all([
        supabase.from('tours').select('*').eq('customer_id', cust.id).eq('status', 'active'),
        supabase.from('hotels').select('*').eq('customer_id', cust.id).eq('status', 'active'),
      ]);
      const tours = (toursData || []).map(fromTourRow);
      const hotels = (hotelsData || []).map(fromHotelRow);
      origIds.current = { tours: tours.map(t => t.dbId), hotels: hotels.map(h => h.dbId) };

      setInitial({
        customer: { guestName: cust.guest_name || '', phone: cust.phone || '', nationality: cust.nationality || '', customerType: cust.customer_type || '', customerDetail: cust.customer_detail || '', salePerson: cust.sale_person || '' },
        tours, hotels,
      });
    } catch (err) {
      toast.error('โหลดข้อมูลไม่สำเร็จ: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave({ customer, tours, hotels }, action) {
    setSaving(true);
    try {
      const { error: custErr } = await supabase.from('customers').update({
        guest_name: customer.guestName.trim(), phone: customer.phone,
        nationality: customer.nationality, customer_type: customer.customerType,
        customer_detail: customer.customerDetail, sale_person: customer.salePerson,
        updated_at: new Date().toISOString(),
      }).eq('id', customerId);
      if (custErr) throw custErr;

      // tours: update เดิม / insert ใหม่
      for (const t of tours) {
        if (t.dbId) { const { error } = await supabase.from('tours').update(toTourRow(t)).eq('id', t.dbId); if (error) throw error; }
        else { const { data: tid, error: e1 } = await supabase.rpc('next_id', { p_prefix: 'TOUR', p_counter: 'tour' }); if (e1) throw e1; const { error } = await supabase.from('tours').insert({ ...toTourRow(t), tour_id: tid, customer_id: customerId }); if (error) throw error; }
      }
      for (const h of hotels) {
        if (h.dbId) { const { error } = await supabase.from('hotels').update(toHotelRow(h)).eq('id', h.dbId); if (error) throw error; }
        else { const { data: hid, error: e2 } = await supabase.rpc('next_id', { p_prefix: 'HTL', p_counter: 'hotel' }); if (e2) throw e2; const { error } = await supabase.from('hotels').insert({ ...toHotelRow(h), hotel_id: hid, customer_id: customerId }); if (error) throw error; }
      }

      // soft-delete รายการที่ถูกลบออกจากบิล (เก็บประวัติไว้)
      const keepTours = new Set(tours.filter(t => t.dbId).map(t => t.dbId));
      const keepHotels = new Set(hotels.filter(h => h.dbId).map(h => h.dbId));
      const delTours = origIds.current.tours.filter(id => !keepTours.has(id));
      const delHotels = origIds.current.hotels.filter(id => !keepHotels.has(id));
      if (delTours.length) await supabase.from('tours').update({ status: 'cancelled' }).in('id', delTours);
      if (delHotels.length) await supabase.from('hotels').update({ status: 'cancelled' }).in('id', delHotels);

      // ทัวร์ใหม่ที่ติ๊ก "เพิ่มลง Taxi Booking"
      const taxiRows = tours.filter(t => !t.dbId && t.addToTaxi).map(t => toTaxiRow(t, customer));
      if (taxiRows.length) await supabase.from('taxi_bookings').insert(taxiRows);

      backupCustomerById(itemId);

      if (action === 'voucher') {
        toast.success('บันทึกแล้ว');
        await printVoucherDialog({ item_id: itemId, guest_name: customer.guestName, nationality: customer.nationality, customer_detail: customer.customerDetail, tours: tours.map(toTourRow), hotels: hotels.map(toHotelRow) });
      } else {
        await Swal.fire({ title: 'บันทึกสำเร็จ!', icon: 'success', timer: 1500, showConfirmButton: false });
      }
      router.push('/');
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const r = await Swal.fire({ title: 'ลบลูกค้านี้?', text: 'Tour และ Hotel ทั้งหมดจะถูกลบ', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'ลบ', cancelButtonText: 'ยกเลิก' });
    if (!r.isConfirmed) return;
    const { error } = await supabase.from('customers').delete().eq('id', customerId); // cascade ลบ tours/hotels
    if (error) { toast.error('ลบไม่สำเร็จ: ' + error.message); return; }
    await Swal.fire({ title: 'ลบเรียบร้อย', icon: 'success', timer: 1500, showConfirmButton: false });
    router.push('/');
  }

  if (loading || !initial) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <BookingWizard
      mode="edit"
      dropdowns={dropdowns}
      itemId={itemId}
      salesLabel={initial.customer.salePerson}
      initialCustomer={initial.customer}
      initialTours={initial.tours}
      initialHotels={initial.hotels}
      onCancel={() => router.push('/')}
      onDelete={handleDelete}
      onSave={handleSave}
      busy={saving}
    />
  );
}
