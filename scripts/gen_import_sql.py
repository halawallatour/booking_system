"""Generate import-old-data.sql from old_data.xlsx.

Reads the 'Item List' (customers), 'Tour List', 'Hotel List' and '_database'
(dropdowns) sheets and emits a single transactional SQL file that:
  0. (optional) refreshes the dropdowns table
  1. deletes existing customers/tours/hotels
  2. inserts every customer, tour and hotel from the spreadsheet
  3. resets the id_counters so new IDs continue past the imported ones

Run: python scripts/gen_import_sql.py
Output: import-old-data.sql  (run it in Supabase Dashboard -> SQL Editor)
"""
import datetime
import re
import openpyxl

SRC = 'old_data.xlsx'
OUT = 'import-old-data.sql'

wb = openpyxl.load_workbook(SRC, data_only=True)


def sqlstr(v):
    """Escape a value as a SQL string literal (single-quoted)."""
    if v is None:
        return "''"
    s = str(v).strip()
    return "'" + s.replace("'", "''") + "'"


def sqltext(v):
    """Text column -> always a quoted string ('' when empty)."""
    return sqlstr(v)


def to_date(v):
    """Return 'YYYY-MM-DD' or None."""
    if v is None or v == '':
        return None
    if isinstance(v, (datetime.datetime, datetime.date)):
        return v.strftime('%Y-%m-%d')
    s = str(v).strip()
    if not s:
        return None
    # ISO with time: 2025-12-25T17:00:00.000Z
    m = re.match(r'(\d{4})-(\d{2})-(\d{2})', s)
    if m:
        return f'{m.group(1)}-{m.group(2)}-{m.group(3)}'
    # DD/MM/YYYY
    m = re.match(r'(\d{1,2})/(\d{1,2})/(\d{4})', s)
    if m:
        d, mo, y = m.groups()
        return f'{y}-{int(mo):02d}-{int(d):02d}'
    return None


def sqldate(v):
    d = to_date(v)
    return f"'{d}'" if d else 'null'


def to_int(v, default=0):
    if v is None or v == '':
        return default
    try:
        return int(round(float(v)))
    except (ValueError, TypeError):
        return default


def to_num(v, default=0):
    if v is None or v == '':
        return default
    try:
        return float(v)
    except (ValueError, TypeError):
        return default


def numfmt(v):
    n = to_num(v)
    if n == int(n):
        return str(int(n))
    return repr(n)


def conf_text(v):
    """Confirmation number: floats like 3346629191.0 -> '3346629191'."""
    if v is None or v == '':
        return "''"
    if isinstance(v, float) and v.is_integer():
        return sqlstr(str(int(v)))
    return sqlstr(v)


def split_id_num(item_id):
    """'VC-000123' -> 123 ; returns 0 if no number."""
    m = re.search(r'(\d+)\s*$', str(item_id or ''))
    return int(m.group(1)) if m else 0


# ---------- read customers ----------
ws = wb['Item List']
customers = []          # list of dict
seen_cust = set()
for r in range(2, ws.max_row + 1):
    item_id = ws.cell(r, 1).value
    if item_id in (None, ''):
        continue
    item_id = str(item_id).strip()
    if item_id in seen_cust:
        continue
    seen_cust.add(item_id)
    customers.append({
        'item_id': item_id,
        'created_at': to_date(ws.cell(r, 2).value),
        'guest_name': ws.cell(r, 3).value,
        'nationality': ws.cell(r, 4).value,
        'customer_type': ws.cell(r, 6).value,
        'customer_detail': ws.cell(r, 7).value,
        'sale_person': ws.cell(r, 8).value,
    })

# ---------- read tours ----------
ws = wb['Tour List']
tours = []
orphan_tours = 0
for r in range(2, ws.max_row + 1):
    tour_id = ws.cell(r, 9).value
    item_id = ws.cell(r, 1).value
    if tour_id in (None, ''):
        continue
    item_id = str(item_id).strip() if item_id else ''
    if item_id not in seen_cust:
        orphan_tours += 1
        continue
    tours.append({
        'tour_id': str(tour_id).strip(),
        'item_id': item_id,
        'tour_date': ws.cell(r, 10).value,
        'tour_detail': ws.cell(r, 11).value,
        'tour_name': ws.cell(r, 12).value,
        'company_name': ws.cell(r, 13).value,
        'adult': ws.cell(r, 14).value,
        'child': ws.cell(r, 15).value,
        'pickup_time': ws.cell(r, 17).value,
        'hotel_name': ws.cell(r, 18).value,
        'room_number': ws.cell(r, 19).value,
        'note': ws.cell(r, 20).value,
        'operator_contact': ws.cell(r, 21).value,
        'sale_amount': ws.cell(r, 22).value,
        'net_amount': ws.cell(r, 23).value,
    })

# ---------- read hotels ----------
ws = wb['Hotel List']
hotels = []
orphan_hotels = 0
for r in range(2, ws.max_row + 1):
    hotel_id = ws.cell(r, 9).value
    item_id = ws.cell(r, 1).value
    if hotel_id in (None, ''):
        continue
    item_id = str(item_id).strip() if item_id else ''
    if item_id not in seen_cust:
        orphan_hotels += 1
        continue
    stay = ws.cell(r, 10).value
    check_in = check_out = None
    if stay:
        parts = str(stay).split(' - ')
        check_in = to_date(parts[0]) if parts else None
        check_out = to_date(parts[1]) if len(parts) > 1 else None
    hotels.append({
        'hotel_id': str(hotel_id).strip(),
        'item_id': item_id,
        'check_in': check_in,
        'check_out': check_out,
        'hotel_name': ws.cell(r, 11).value,
        'room_name': ws.cell(r, 12).value,
        'total_room': ws.cell(r, 13).value,
        'total_night': ws.cell(r, 14).value,
        'confirmation_number': ws.cell(r, 16).value,
        'booking_type': ws.cell(r, 17).value,
        'note': ws.cell(r, 18).value,
        'breakfast': ws.cell(r, 19).value,
        'sale_amount': ws.cell(r, 20).value,
        'net_amount': ws.cell(r, 21).value,
    })

# ---------- read dropdowns ----------
ws = wb['_database']
# (column header in _database) -> (category in dropdowns table)
DROPDOWN_MAP = [
    ('Nationality', 'nationality'),
    ('Guest Type', 'customer_type'),
    ('Sale Person', 'sale_person'),
    ('Tour', 'tour_name'),
    ('Tour Company', 'company_name'),
    ('Hotel', 'hotel_name'),
    ('Room', 'room_name'),
    ('Booking Type', 'booking_type'),
]
header = {ws.cell(1, c).value: c for c in range(1, ws.max_column + 1)}
dropdowns = []  # (category, value, sort_order)
for col_name, category in DROPDOWN_MAP:
    col = header.get(col_name)
    if not col:
        continue
    seen = set()
    order = 0
    for r in range(2, ws.max_row + 1):
        v = ws.cell(r, col).value
        if v in (None, ''):
            continue
        v = str(v).strip()
        if not v or v in seen:
            continue
        seen.add(v)
        order += 1
        dropdowns.append((category, v, order))

# ---------- counters ----------
max_cust = max((split_id_num(c['item_id']) for c in customers), default=0)
max_tour = max((split_id_num(t['tour_id']) for t in tours), default=0)
max_hotel = max((split_id_num(h['hotel_id']) for h in hotels), default=0)

# ---------- emit SQL ----------
lines = []
w = lines.append
w('-- ============================================================')
w('-- Import of old_data.xlsx into Supabase')
w('-- Generated by scripts/gen_import_sql.py')
w(f'-- customers: {len(customers)}  tours: {len(tours)}  hotels: {len(hotels)}')
if orphan_tours or orphan_hotels:
    w(f'-- skipped (no matching customer): tours={orphan_tours} hotels={orphan_hotels}')
w('-- Run this in Supabase Dashboard -> SQL Editor (NOT the in-app /sql-editor).')
w('-- ============================================================')
w('')
w('begin;')
w('')
w('-- ---- 0. refresh dropdown lists (optional) -------------------')
w("delete from dropdowns;")
CHUNK = 100
for i in range(0, len(dropdowns), CHUNK):
    chunk = dropdowns[i:i + CHUNK]
    w('insert into dropdowns (category, value, sort_order) values')
    rows = [f"  ({sqlstr(c)}, {sqlstr(v)}, {o})" for (c, v, o) in chunk]
    w(',\n'.join(rows) + ';')
w('')
w('-- ---- 1. delete old transactional data -----------------------')
w('-- tours/hotels first (they reference customers), then customers.')
w('delete from tours;')
w('delete from hotels;')
w('delete from customers;')
w('')
w('-- ---- 2. customers -------------------------------------------')
for i in range(0, len(customers), CHUNK):
    chunk = customers[i:i + CHUNK]
    w('insert into customers (item_id, guest_name, nationality, customer_type, customer_detail, sale_person, created_at) values')
    rows = []
    for c in chunk:
        rows.append(
            f"  ({sqlstr(c['item_id'])}, {sqltext(c['guest_name'])}, {sqltext(c['nationality'])}, "
            f"{sqltext(c['customer_type'])}, {sqltext(c['customer_detail'])}, {sqltext(c['sale_person'])}, "
            f"{sqldate(c['created_at']) if c['created_at'] else 'now()'})"
        )
    w(',\n'.join(rows))
    w('on conflict (item_id) do nothing;')
w('')
w('-- ---- 3. tours (customer_id resolved by item_id) -------------')
for t in tours:
    w(
        "insert into tours (tour_id, customer_id, tour_date, tour_detail, tour_name, company_name, "
        "adult, child, pickup_time, hotel_name, room_number, note, operator_contact, sale_amount, net_amount) "
        f"select {sqlstr(t['tour_id'])}, c.id, {sqldate(t['tour_date'])}, {sqltext(t['tour_detail'])}, "
        f"{sqltext(t['tour_name'])}, {sqltext(t['company_name'])}, {to_int(t['adult'])}, {to_int(t['child'])}, "
        f"{sqltext(t['pickup_time'])}, {sqltext(t['hotel_name'])}, {sqltext(t['room_number'])}, "
        f"{sqltext(t['note'])}, {sqltext(t['operator_contact'])}, {numfmt(t['sale_amount'])}, {numfmt(t['net_amount'])} "
        f"from customers c where c.item_id = {sqlstr(t['item_id'])} on conflict (tour_id) do nothing;"
    )
w('')
w('-- ---- 4. hotels (customer_id resolved by item_id) ------------')
for h in hotels:
    total_room = to_int(h['total_room'], 1) or 1
    w(
        "insert into hotels (hotel_id, customer_id, check_in, check_out, total_night, hotel_name, room_name, "
        "total_room, confirmation_number, booking_type, note, breakfast, sale_amount, net_amount) "
        f"select {sqlstr(h['hotel_id'])}, c.id, {sqldate(h['check_in'])}, {sqldate(h['check_out'])}, "
        f"{to_int(h['total_night'])}, {sqltext(h['hotel_name'])}, {sqltext(h['room_name'])}, {total_room}, "
        f"{conf_text(h['confirmation_number'])}, {sqltext(h['booking_type'])}, {sqltext(h['note'])}, "
        f"{sqltext(h['breakfast'])}, {numfmt(h['sale_amount'])}, {numfmt(h['net_amount'])} "
        f"from customers c where c.item_id = {sqlstr(h['item_id'])} on conflict (hotel_id) do nothing;"
    )
w('')
w('-- ---- 5. reset id counters -----------------------------------')
w(f"update id_counters set current_value = {max_cust} where counter_name = 'customer';")
w(f"update id_counters set current_value = {max_tour} where counter_name = 'tour';")
w(f"update id_counters set current_value = {max_hotel} where counter_name = 'hotel';")
w('')
w('commit;')
w('')

with open(OUT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

# ---------- also emit a standalone "delete old data" script ----------
del_lines = [
    '-- ============================================================',
    '-- Delete ALL existing booking data (customers + tours + hotels).',
    '-- Dropdowns and id_counters are left untouched.',
    '-- Run in Supabase Dashboard -> SQL Editor. THIS CANNOT BE UNDONE.',
    '-- ============================================================',
    'begin;',
    'delete from tours;    -- children first (FK -> customers)',
    'delete from hotels;',
    'delete from customers;',
    "-- reset counters back to zero (uncomment if you also want IDs to restart)",
    "-- update id_counters set current_value = 0 where counter_name in ('customer','tour','hotel');",
    'commit;',
    '',
]
with open('delete-old-data.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(del_lines))

# ---------- also emit customers-only SQL (legacy format, full real data) ----------
cust_lines = [
    f"UPDATE id_counters SET current_value = {max_cust} WHERE counter_name = 'customer';",
    '',
    'INSERT INTO customers (item_id, guest_name, nationality, customer_type, customer_detail, sale_person, created_at) VALUES',
]
rows = []
for c in customers:
    rows.append(
        f"({sqlstr(c['item_id'])}, {sqltext(c['guest_name'])}, {sqltext(c['nationality'])}, "
        f"{sqltext(c['customer_type'])}, {sqltext(c['customer_detail'])}, {sqltext(c['sale_person'])}, "
        f"{sqldate(c['created_at']) if c['created_at'] else 'now()'})"
    )
cust_lines.append(',\n'.join(rows))
cust_lines.append('ON CONFLICT (item_id) DO NOTHING;')
cust_sql = '\n'.join(cust_lines) + '\n'
with open('migrate-customers.sql', 'w', encoding='utf-8') as f:
    f.write(cust_sql)
# copy into public/ so the in-app /sql-editor loader can fetch it at runtime
import os
os.makedirs('public', exist_ok=True)
with open('public/migrate-customers.sql', 'w', encoding='utf-8') as f:
    f.write(cust_sql)

print(f'Wrote {OUT}')
print('Wrote delete-old-data.sql, migrate-customers.sql, public/migrate-customers.sql')
print(f'  customers={len(customers)} tours={len(tours)} hotels={len(hotels)} dropdowns={len(dropdowns)}')
print(f'  skipped orphan tours={orphan_tours} hotels={orphan_hotels}')
print(f'  counters: customer={max_cust} tour={max_tour} hotel={max_hotel}')
