-- Add multi-table support to reservations.
-- Run this once against your Supabase project (SQL Editor or supabase db push).

alter table reservations
  add column if not exists table_ids uuid[] not null default '{}';

-- Backfill: move existing single table_id into the new array.
update reservations
  set table_ids = array[table_id]
  where table_id is not null
    and (table_ids is null or table_ids = '{}');
