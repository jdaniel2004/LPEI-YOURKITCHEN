import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeLog } from "@/lib/log";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staffId = req.headers.get("x-session-id");
  const body = await req.json().catch(() => ({}));
  const reason: string | null = body?.reason ?? null;
  // When a KDS ticket (a single send-batch) is cancelled, only that batch's lines
  // are anulled — other batches of the same order keep going. Omitting batch keeps
  // the original "cancel the whole order" behaviour (e.g. from the POS).
  const batch: number | null = body?.batch != null ? Number(body.batch) : null;

  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .select("id, table_id, status, table:tables(label)")
    .eq("id", id)
    .single();

  if (orderErr || !order)
    return Response.json({ error: "Encomenda não encontrada" }, { status: 404 });

  if (order.status === "paid")
    return Response.json({ error: "Pedido já pago — não pode ser anulado" }, { status: 400 });

  // Mark the targeted lines as cancelled (one batch, or all of them)
  let linesQuery = supabaseAdmin
    .from("order_lines")
    .update({ cancelled: true, cancel_note: reason })
    .eq("order_id", id)
    .eq("cancelled", false);
  if (batch != null) linesQuery = linesQuery.eq("sent_batch", batch);

  const { error: linesErr } = await linesQuery;
  if (linesErr) return Response.json({ error: linesErr.message }, { status: 500 });

  // A single-batch cancel only takes down the whole order when nothing is left.
  if (batch != null) {
    const { data: remaining } = await supabaseAdmin
      .from("order_lines")
      .select("id, sent, ready_at")
      .eq("order_id", id)
      .eq("cancelled", false);
    if (remaining && remaining.length > 0) {
      // Some active lines survive the cancel. If every one of them is already ready
      // (sent + delivered by the KDS), the kitchen has nothing left to do — the order
      // is fully served, so move it (and the table) back to "bill"/Servido. This is
      // the same "all ready" rule the KDS uses when marking Pronto, and it covers the
      // case of cancelling a follow-up round after the first was already served:
      // sending that round reset the order to "open", and cancelling it must restore
      // the served state instead of leaving the table stuck on "Ocupada".
      const allServed = remaining.every((l) => l.sent && l.ready_at != null);
      if (allServed && order.status !== "bill") {
        await supabaseAdmin.from("orders").update({ status: "bill" }).eq("id", id);
        if (order.table_id) {
          await supabaseAdmin.from("tables").update({ status: "bill" }).eq("id", order.table_id);
        }
      }
      const tableLabel = (order.table as { label?: string } | null)?.label ?? "balcão";
      await writeLog(
        "CANCEL",
        "KDS",
        `Ticket anulado — Mesa ${tableLabel} (${id.slice(0, 8)}·L${batch})${allServed ? " — restante já servido" : ""}`,
        staffId,
        reason
      );
      return Response.json({ ...order, cancelledBatch: batch, status: allServed ? "bill" : order.status });
    }
    // else: no active lines remain → fall through and cancel the order itself.
  }

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
