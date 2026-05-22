import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeLog } from "@/lib/log";

const NEXT_STATUS: Record<string, string> = {
  open: "sent",
  sent: "bill",
};

const STATUS_LABEL: Record<string, string> = {
  sent: "Em preparação",
  bill: "Pronto",
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staffId = req.headers.get("x-session-id");
  const body = await req.json().catch(() => ({}));

  const { data: order, error: fetchErr } = await supabaseAdmin
    .from("orders")
    .select("id, status, table_id, table:tables(label)")
    .eq("id", id)
    .single();

  if (fetchErr || !order)
    return Response.json({ error: "Ticket não encontrado" }, { status: 404 });

  const nextStatus = body.status ?? NEXT_STATUS[order.status];
  if (!nextStatus)
    return Response.json({ error: `Não é possível avançar do estado '${order.status}'` }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("orders")
    .update({ status: nextStatus })
    .eq("id", id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // When order reaches "pronto" (bill), mark table as servido and persist that
  // every sent line was delivered (best-effort: ignored if the column is missing).
  if (nextStatus === "bill") {
    // Stamp the not-yet-ready lines (current batch) as delivered + ready now.
    // Earlier batches keep their own ready_at (prep time) untouched.
    await supabaseAdmin
      .from("order_lines")
      .update({ delivered: true, ready_at: new Date().toISOString() })
      .eq("order_id", id)
      .eq("sent", true)
      .eq("cancelled", false)
      .is("ready_at", null);
    if ((order as any).table_id) {
      await supabaseAdmin
        .from("tables")
        .update({ status: "bill" })
        .eq("id", (order as any).table_id);
    }
  }

  const tableLabel = (order.table as { label?: string } | null)?.label ?? "balcão";
  await writeLog(
    "ACTION",
    "KDS",
    `Ticket #${id.slice(0, 8)} — Mesa ${tableLabel} → ${STATUS_LABEL[nextStatus] ?? nextStatus}`,
    staffId
  );

  return Response.json(data);
}
