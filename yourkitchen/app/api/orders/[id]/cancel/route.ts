import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeLog } from "@/lib/log";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staffId = req.headers.get("x-session-id");
  const body = await req.json().catch(() => ({}));
  const reason: string | null = body?.reason ?? null;

  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .select("id, table_id, status, table:tables(label)")
    .eq("id", id)
    .single();

  if (orderErr || !order)
    return Response.json({ error: "Encomenda não encontrada" }, { status: 404 });

  if (order.status === "paid")
    return Response.json({ error: "Pedido já pago — não pode ser anulado" }, { status: 400 });

  // Mark every line as cancelled
  const { error: linesErr } = await supabaseAdmin
    .from("order_lines")
    .update({ cancelled: true, cancel_note: reason })
    .eq("order_id", id)
    .eq("cancelled", false);

  if (linesErr) return Response.json({ error: linesErr.message }, { status: 500 });

  // Cancel the order
  const { data: updated, error: updateErr } = await supabaseAdmin
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", id)
    .select()
    .single();

  if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 });

  // Free the table
  if (order.table_id) {
    await supabaseAdmin
      .from("tables")
      .update({ status: "free", locked_by: null, locked_at: null })
      .eq("id", order.table_id);
  }

  const tableLabel = (order.table as { label?: string } | null)?.label ?? "balcão";
  await writeLog(
    "CANCEL",
    "KDS",
    `Pedido anulado — Mesa ${tableLabel} (${id.slice(0, 8)})`,
    staffId,
    reason
  );

  return Response.json(updated);
}
