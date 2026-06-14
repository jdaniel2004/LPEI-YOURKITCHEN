-- ─── KDS PER-BATCH TICKETS ────────────────────────────────────────────────────
-- Each "Enviar" from the POS is a send-batch (order_lines.sent_batch). The KDS now
-- renders ONE ticket per send-batch instead of merging every batch of an order into
-- a single ticket — so a follow-up send to the same table never appends to the
-- ticket the kitchen is already working on, it gets its own.
--
-- To give each batch its own prep status (Pendente → Em Preparação → Pronto) the
-- "started preparing" moment is now tracked per line. "Pronto" still uses ready_at
-- (and delivered) exactly as before. Run this in the Supabase SQL Editor when
-- upgrading an existing database.

alter table order_lines add column if not exists prep_started_at timestamptz;

-- The KDS ticket timer runs from when a batch was SENT to the kitchen, not from
-- created_at (which is when the item was added to the cart). Without this the timer
-- starts at however long the waiter spent building the order before "Enviar".
alter table order_lines add column if not exists sent_at timestamptz;

-- Stamp sent_at with the DATABASE clock (now()) the moment a line flips to sent.
-- Doing it here — not from the Next server — keeps sent_at on the same clock as
-- created_at and the serverNow the KDS uses, so the ticket timer is immune to skew
-- between the app server, the DB, and the kitchen tablet's browser.
create or replace function set_sent_at() returns trigger as $$
begin
  if new.sent = true and new.sent_at is null then
    new.sent_at := now();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_sent_at on order_lines;
create trigger trg_set_sent_at
  before insert or update on order_lines
  for each row execute function set_sent_at();

-- The KDS reads this to align the kitchen tablet's clock with the DB clock, so the
-- ticket timer never shows the browser↔server skew (the "starts at 41s" bug).
create or replace function db_now() returns timestamptz language sql stable as $$
  select now();
$$;

-- Preserve in-flight state: orders already being prepared at migration time should
-- not jump back to "Pendente". Stamp their sent, non-cancelled lines as started.
-- Backfill sent_at from created_at too — the real send time is unknown for existing
-- lines, so created_at is the best available approximation.
update order_lines l
set    prep_started_at = coalesce(l.prep_started_at, l.created_at),
       sent_at         = coalesce(l.sent_at, l.created_at)
from   orders o
where  l.order_id = o.id
  and  l.sent = true
  and  l.cancelled = false
  and  (l.prep_started_at is null or l.sent_at is null)
  and  o.status in ('sent', 'bill');
