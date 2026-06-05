'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import BookingWizard from '@/components/BookingWizard';
import { backupCustomerById } from '@/lib/backup';
import { toTourRow, toHotelRow, toTaxiRow } from '@/lib/bookingRows';
import { printVoucherDialog } from '@/lib/voucher';

const BLANK_CUSTOMER = { guestName: '', phone: '', nationality: '', customerType: '', customerDetail: '', salePerson: '' };

export default function NewCustomerPage() {
  const router = useRouter();
  const [dropdowns, setDropdowns] = useState({});
  const [initialCustomer, setInitialCustomer] = useState(BLANK_CUSTOMER);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { init(); }, []);

  async function init() {
    const { data } = await supabase.from('dropdowns').select('*').order('sort_order');
    const grouped = {}; (data || []).forEach(d => { (grouped[d.category] ||= []).push(d.value); });
    setDropdowns(grouped);

    // "จองใหม่ให้ลูกค้าคนเดิม": /customers/new?from=<item_id> → ก็อปเฉพาะข้อมูลลูกค้า
    const from = new URLSearchParams(window.location.search).get('from');
    if (from) {
      const { data: c } = await supabase.from('customers').select('*').eq('item_id', from).single();
      if (c) {
        setInitialCustomer({ guestName: c.guest_name || '', phone: c.phone || '', nationality: c.nationality || '', customerType: c.customer_type || '', customerDetail: c.customer_detail || '', salePerson: c.sale_person || '' });
        toast.success(`คัดลอกข้อมูลลูกค้าจาก ${from} แล้ว — ระบบจะสร้างเป็น Voucher ใหม่`);
      } else {
        toast.error('ไม่พบลูกค้าต้นทาง ' + from);
      }
    }
    setLoading(false);
  }

  async function handleSave({ customer, tours, hotels }, action) {
    setSaving(true);
    let createdId = null;
    try {
      const { data: vc, error: idErr } = await supabase.rpc('next_id', { p_prefix: 'VC', p_counter: 'customer' });
      if (idErr) throw idErr;
      const { data: cust, error: custErr } = await supabase.from('customers').insert({
        item_id: vc, guest_name: customer.guestName.trim(), phone: customer.phone,
        nationality: customer.nationality, customer_type: customer.customerType,
        customer_detail: customer.customerDetail, sale_person: customer.salePerson,
      }).select('id').single();
      if (custErr) throw custErr;
      createdId = cust.id;

      for (const t of tours) {
        const { data: tid, error: e1 } = await supabase.rpc('next_id', { p_prefix: 'TOUR', p_counter: 'tour' });
        if (e1) throw e1;
        const { error } = await supabase.from('tours').insert({ ...toTourRow(t), tour_id: tid, customer_id: cust.id });
        if (error) throw error;
      }
      for (const h of hotels) {
        const { data: hid, error: e2 } = await supabase.rpc('next_id', { p_prefix: 'HTL', p_counter: 'hotel' });
        if (e2) throw e2;
        const { error } = await supabase.from('hotels').insert({ ...toHotelRow(h), hotel_id: hid, customer_id: cust.id });
        if (error) throw error;
      }

      // ทัวร์ที่ติ๊ก "เพิ่มลง Taxi Booking"
      const taxiRows = tours.filter(t => t.addToTaxi).map(t => toTaxiRow(t, customer));
      if (taxiRows.length) await supabase.from('taxi_bookings').insert(taxiRows);

      backupCustomerById(vc); // fire-and-forget

      if (action === 'voucher') {
        toast.success(`บันทึก ${vc} แล้ว`);
        await printVoucherDialog({ item_id: vc, guest_name: customer.guestName, nationality: customer.nationality, customer_detail: customer.customerDetail, tours: tours.map(toTourRow), hotels: hotels.map(toHotelRow) });
      } else {
        await Swal.fire({ title: 'บันทึกสำเร็จ!', text: `สร้างลูกค้า ${vc} เรียบร้อย`, icon: 'success', timer: 1500, showConfirmButton: false });
      }
      router.push('/');
    } catch (err) {
      if (createdId) await supabase.from('customers').delete().eq('id', createdId); // ลบทิ้งกัน orphan (cascade)
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <BookingWizard
      mode="create"
      dropdowns={dropdowns}
      initialCustomer={initialCustomer}
      onCancel={() => router.push('/')}
      onSave={handleSave}
      busy={saving}
    />
  );
}
