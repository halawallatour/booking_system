create table if not exists dropdowns (
  id bigint generated always as identity primary key,
  category text not null,
  value text not null,
  sort_order int default 0
);

create table if not exists customers (
  id bigint generated always as identity primary key,
  item_id text unique not null,
  guest_name text not null default '',
  nationality text default '',
  customer_type text default '',
  customer_detail text default '',
  sale_person text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists tours (
  id bigint generated always as identity primary key,
  tour_id text unique not null,
  customer_id bigint references customers(id) on delete cascade,
  tour_date date,
  tour_detail text default '',
  tour_name text default '',
  company_name text default '',
  adult int default 0,
  child int default 0,
  pickup_time text default '',
  hotel_name text default '',
  room_number text default '',
  note text default '',
  operator_contact text default '',
  sale_amount numeric(12,2) default 0,
  net_amount numeric(12,2) default 0,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists hotels (
  id bigint generated always as identity primary key,
  hotel_id text unique not null,
  customer_id bigint references customers(id) on delete cascade,
  check_in date,
  check_out date,
  total_night int default 0,
  hotel_name text default '',
  room_name text default '',
  total_room int default 1,
  confirmation_number text default '',
  booking_type text default '',
  note text default '',
  breakfast text default '',
  sale_amount numeric(12,2) default 0,
  net_amount numeric(12,2) default 0,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists id_counters (
  id bigint generated always as identity primary key,
  counter_name text unique not null,
  current_value int default 0
);

insert into id_counters (counter_name, current_value)
values ('customer', 0), ('tour', 0), ('hotel', 0)
on conflict (counter_name) do nothing;

create or replace function next_id(p_prefix text, p_counter text)
returns text language plpgsql as $$
declare
  v_val int;
begin
  update id_counters set current_value = current_value + 1
  where counter_name = p_counter
  returning current_value into v_val;
  return p_prefix || '-' || lpad(v_val::text, 6, '0');
end;
$$;

create or replace function exec_sql(query text)
returns json language plpgsql security definer as $$
begin
  execute query;
  return json_build_object('status', 'ok');
exception when others then
  return json_build_object('status', 'error', 'message', SQLERRM);
end;
$$;

insert into dropdowns (category, value, sort_order) values
('nationality', 'Thai', 1),
('nationality', 'Chinese', 2),
('nationality', 'Korean', 3),
('nationality', 'Russian', 4),
('nationality', 'Indian', 5),
('nationality', 'European', 6),
('nationality', 'American', 7),
('nationality', 'Other', 8),
('customer_type', 'Walk-in', 1),
('customer_type', 'Agency Booking', 2),
('customer_type', 'Online Booking', 3),
('customer_type', 'Repeat Customer', 4),
('sale_person', 'John', 1),
('sale_person', 'Jane', 2),
('sale_person', 'Other', 3),
('tour_name', 'Phi Phi Island', 1),
('tour_name', 'Jamesbond', 2),
('tour_name', 'Similan', 3),
('tour_name', 'Elephant', 4),
('tour_name', 'Fantasea', 5),
('tour_name', 'Rafting', 6),
('company_name', 'Seahi Andaman', 1),
('company_name', 'PEC', 2),
('company_name', 'Fantasea Phuket', 3),
('hotel_name', 'Patong Merlin', 1),
('hotel_name', 'Holiday Inn Patong', 2),
('hotel_name', 'Absolute Twin Sand Patong', 3),
('room_name', 'Deluxe Room', 1),
('room_name', 'Superior Room', 2),
('room_name', 'Suite', 3),
('booking_type', 'Direct', 1),
('booking_type', 'Agoda', 2),
('booking_type', 'Booking.com', 3)
on conflict do nothing;

alter table customers enable row level security;
alter table tours enable row level security;
alter table hotels enable row level security;
alter table dropdowns enable row level security;
alter table id_counters enable row level security;

create policy "Allow all on customers" on customers for all using (true) with check (true);
create policy "Allow all on tours" on tours for all using (true) with check (true);
create policy "Allow all on hotels" on hotels for all using (true) with check (true);
create policy "Allow all on dropdowns" on dropdowns for all using (true) with check (true);
create policy "Allow all on id_counters" on id_counters for all using (true) with check (true);
