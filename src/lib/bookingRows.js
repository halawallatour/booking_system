// แปลงระหว่าง "block" ในฟอร์ม (camelCase) กับ row ใน Supabase (snake_case)
// ใช้ร่วมกันทั้งหน้าสร้างใหม่และหน้าแก้ไข

export function toTourRow(t) {
  return {
    tour_date: t.tourDate || null,
    tour_detail: t.tourDetail || '',
    tour_name: t.tourName || '',
    company_name: t.companyName || '',
    adult: parseInt(t.adult) || 0,
    child: parseInt(t.child) || 0,
    infant: parseInt(t.infant) || 0,
    operator_contact: t.operatorContact || '',
    cash_on_tour: parseFloat(t.cashOnTour) || 0,
    pickup_type: t.pickupType || 'tour',
    hotel_name: t.hotelName || '',
    room_number: t.roomNumber || '',
    pickup_time: t.pickupTime || '',
    vehicle_type: t.vehicleType || '',
    note: t.note || '',
    booking_type: t.bookingType || '',
    transfer_type: t.transferType || '',
    origin: t.origin || '',
    dropoff: t.dropoff || '',
    flight_no: t.flightNo || '',
    sale_amount: parseFloat(t.saleAmount) || 0,
    net_amount: parseFloat(t.netAmount) || 0,
  };
}

export function toHotelRow(h) {
  return {
    check_in: h.checkIn || null,
    check_out: h.checkOut || null,
    total_night: parseInt(h.totalNight) || 0,
    hotel_name: h.hotelName || '',
    room_name: h.roomName || '',
    total_room: parseInt(h.totalRoom) || 1,
    adult: parseInt(h.adult) || 0,
    child: parseInt(h.child) || 0,
    confirmation_number: h.confirmationNumber || '',
    detail: h.detail || '',
    note: h.note || '',
    breakfast: h.breakfast || '',
    booking_type: h.bookingType || '',
    sale_amount: parseFloat(h.saleAmount) || 0,
    net_amount: parseFloat(h.netAmount) || 0,
  };
}

export function fromTourRow(t) {
  return {
    dbId: t.id, tourId: t.tour_id,
    tourDate: t.tour_date || '', tourDetail: t.tour_detail || '', tourName: t.tour_name || '', companyName: t.company_name || '',
    adult: t.adult ?? '', child: t.child ?? '', infant: t.infant ?? 0,
    operatorContact: t.operator_contact || '', cashOnTour: t.cash_on_tour || '',
    pickupType: t.pickup_type || 'tour', hotelName: t.hotel_name || '', roomNumber: t.room_number || '',
    pickupTime: t.pickup_time || '', vehicleType: t.vehicle_type || '', note: t.note || '',
    bookingType: t.booking_type || '',
    transferType: t.transfer_type || 'arrival_dom', origin: t.origin || '', dropoff: t.dropoff || '', flightNo: t.flight_no || '',
    saleAmount: t.sale_amount || '', netAmount: t.net_amount || '',
    addToTaxi: false,
  };
}

export function fromHotelRow(h) {
  return {
    dbId: h.id, hotelId: h.hotel_id,
    checkIn: h.check_in || '', checkOut: h.check_out || '', totalNight: h.total_night || '',
    hotelName: h.hotel_name || '', roomName: h.room_name || '', totalRoom: h.total_room || 1,
    adult: h.adult ?? '', child: h.child ?? '', confirmationNumber: h.confirmation_number || '',
    detail: h.detail || '', note: h.note || '', breakfast: h.breakfast || '',
    bookingType: h.booking_type || '', saleAmount: h.sale_amount || '', netAmount: h.net_amount || '',
  };
}

// ทัวร์ที่ติ๊ก "เพิ่มลง Taxi Booking" → งานแท็กซี่ (ดึงเท่าที่มี ที่เหลือไปเติมในหน้า Taxi)
export function toTaxiRow(t, customer) {
  const airport = t.pickupType === 'airport';
  const pax = (parseInt(t.adult) || 0) + (parseInt(t.child) || 0) + (parseInt(t.infant) || 0);
  const scope = airport && String(t.transferType || '').includes('inter') ? 'international' : 'domestic';
  return {
    job_date: t.tourDate || null,
    pickup_time: t.pickupTime || '',
    customer_name: customer.guestName || '',
    pax: pax || 1,
    job_type: '',
    vehicle_type: t.vehicleType || '',
    trip_scope: scope,
    pickup_location: airport ? (t.origin || '') : (t.hotelName || ''),
    pickup_detail: airport ? (t.flightNo || '') : (t.roomNumber || ''),
    dropoff_location: airport ? (t.dropoff || '') : '',
    note: t.note || '',
    price: 0,
    status: 'pending',
  };
}
