-- Security migration — run this once in Supabase Dashboard → SQL Editor
-- against any project that was created with the OLD schema.
--
-- Why: the previous schema shipped an exec_sql(text) helper that executed
-- arbitrary SQL as the table owner (security definer) and was reachable by the
-- public `anon` role. Anyone with the public anon key (which is bundled into the
-- client) could therefore run destructive SQL (DROP TABLE, mass UPDATE, ...).
--
-- This drops it. The /sql-editor page no longer depends on it.

drop function if exists exec_sql(text);

-- Optional hardening: also revoke the ability for anon/authenticated to call any
-- future security-definer helpers you add, then grant explicitly per function.
-- (Left commented; uncomment only if you understand the impact on your setup.)
-- revoke execute on all functions in schema public from anon, authenticated;
-- grant execute on function next_id(text, text) to anon, authenticated;
