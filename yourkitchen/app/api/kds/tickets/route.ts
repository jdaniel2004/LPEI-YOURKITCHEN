import { supabaseAdmin } from "@/lib/supabase/admin";

// KDS shows orders that are open or sent (pending/in-prep) — not paid/cancelled
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      `id, status, created_at, notes,
       table:tables(id, label),
       waiter:staff(id, name),
       lines:order_lines(
         id, name, qty, modifiers, notes, sent, cancelled, created_at
       )`
    )
    .in("status", ["open", "sent", "bill"])
    .order("created_at");

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Filter to orders that have at least one sent, non-cancelled line
  const tickets = data.filter((o) =>
    (o.lines as Array<{ sent: boolean; cancelled: boolean }>).some(
      (l) => l.sent && !l.cancelled
    )
  );

  return Response.json(tickets);
}
