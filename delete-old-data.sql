-- ============================================================
-- Delete ALL existing booking data (customers + tours + hotels).
-- Dropdowns and id_counters are left untouched.
-- Run in Supabase Dashboard -> SQL Editor. THIS CANNOT BE UNDONE.
-- ============================================================
begin;
delete from tours;    -- children first (FK -> customers)
delete from hotels;
delete from customers;
-- reset counters back to zero (uncomment if you also want IDs to restart)
-- update id_counters set current_value = 0 where counter_name in ('customer','tour','hotel');
commit;
