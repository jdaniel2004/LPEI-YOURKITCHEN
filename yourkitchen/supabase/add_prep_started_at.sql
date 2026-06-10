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

-- Preserve in-flight state: orders already being prepared at migration time should
-- not jump back to "Pendente". Stamp their sent, non-cancelled lines as started.
update order_lines l
set    prep_started_at = coalesce(l.prep_started_at, l.created_at)
from   orders o
where  l.order_id = o.id
  and  l.sent = true
  and  l.cancelled = false
  and  l.prep_started_at is null
  and  o.status in ('sent', 'bill');
