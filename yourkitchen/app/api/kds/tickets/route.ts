import { supabaseAdmin } from "@/lib/supabase/admin";

// KDS shows orders that are open or sent (pending/in-prep) — not paid/cancelled
const orderSelect = (lineCols: string) => `id, status, created_at, notes,
   table:tables(id, label),
   waiter:staff(id, name),
   lines:order_lines(${lineCols})`;

// prep_started_at and sent_at are added by the add_prep_started_at.sql migration.
// If it hasn't been run yet, selecting them would 500 the whole query and the KDS
// would show nothing — so we retry without them and the client falls back
// (order.status for prep, created_at for the timer start).
const LINES_FULL = "id, name, qty, modifiers, notes, sent, cancelled, sent_batch, delivered, created_at, sent_at, ready_at, prep_started_at";
const LINES_BASE = "id, name, qty, modifiers, notes, sent, cancelled, sent_batch, delivered, created_at, ready_at";

export async function GET() {
  // Only show recent orders (last 24h). Older abandoned/unpaid orders
  // would otherwise pile up forever with absurd timers.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const run = (lineCols: string) =>
    supabaseAdmin
      .from("orders")
      .select(orderSelect(lineCols))
      .in("status", ["open", "sent", "bill"])
      .gte("created_at", since)
      .order("created_at");

  let { data, error } = await run(LINES_FULL);
  if (error && /prep_started_at|sent_at/i.test(error.message || "")) {
    ({ data, error } = await run(LINES_BASE));
  }

  if (error || !data) return Response.json({ error: error?.message ?? "Erro" }, { status: 500 });

  // Dynamic select string loses row-type inference, so `data` is loosely typed.
  type TicketRow = { lines: Array<{ sent: boolean; cancelled: boolean }> };
  const rows = data as unknown as TicketRow[];

  // Filter to orders that have at least one sent, non-cancelled line
  const tickets = rows.filter((o) => o.lines.some((l) => l.sent && !l.cancelled));

  // serverNow = the DB clock. The KDS uses it to cancel out the difference between
  // the kitchen tablet's clock and the DB, so the ticket timer starts at ~0 rather
  // than the browser↔server skew. Falls back to the app-server clock if the db_now()
  // migration hasn't run yet.
  const { data: nowVal } = await supabaseAdmin.rpc("db_now");
  const serverNow = (nowVal as string | null) ?? new Date().toISOString();

  return Response.json({ serverNow, tickets });
}
