import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeLog } from "@/lib/log";

// A KDS ticket maps to a single send-batch of an order (order_lines.sent_batch),
// so each "Enviar" from the POS is its own ticket. Advancing a ticket therefore
// stamps that batch's lines, and the order's status is recomputed from all its
// lines (the POS only reads "bill" — every batch ready — to unlock payment).
type Line = {
  id: string;
  sent: boolean;
  cancelled: boolean;
  sent_batch: number | null;
  ready_at: string | null;
};

const ACTION_LABEL: Record<string, string> = {
  start: "Em preparação",
  ready: "Pronto",
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staffId = req.headers.get("x-session-id");
  const body = await req.json().catch(() => ({}));
  const action: string = body.action ?? (body.status === "bill" ? "ready" : "start");
  const batch = Number(body.batch ?? 0);

  const { data: order, error: fetchErr } = await supabaseAdmin
    .from("orders")
    .select("id, status, table_id, table:tables(label), lines:order_lines(id, sent, cancelled, sent_batch, ready_at)")
    .eq("id", id)
    .single();

  if (fetchErr || !order)
    return Response.json({ error: "Ticket não encontrado" }, { status: 404 });

  const lines = (order.lines || []) as Line[];
  const batchLines = lines.filter((l) => l.sent && !l.cancelled && (l.sent_batch ?? 0) === batch);
  if (batchLines.length === 0)
    return Response.json({ error: "Lote do ticket não encontrado" }, { status: 404 });

  const now = new Date().toISOString();

  if (action === "start") {
    // Pendente → Em Preparação: stamp this batch's not-yet-started lines.
    const { error } = await supabaseAdmin
      .from("order_lines")
      .update({ prep_started_at: now })
      .eq("order_id", id)
      .eq("sent_batch", batch)
      .eq("cancelled", false)
      .is("prep_started_at", null);
    // If the prep_started_at migration hasn't been run, fall back to the
    // order-level status (the client derives "started" from it too).
    if (error && !/prep_started_at/i.test(error.message || ""))
      return Response.json({ error: error.message }, { status: 500 });

    // Keep the order out of "open" once any batch is cooking (doesn't affect the
    // per-batch KDS columns, but reflects the order is in progress).
    if (order.status === "open") {
      await supabaseAdmin.from("orders").update({ status: "sent" }).eq("id", id);
    }
  } else {
    // Em Preparação → Pronto: stamp ready_at + delivered for this batch.
    const { error } = await supabaseAdmin
      .from("order_lines")
      .update({ delivered: true, ready_at: now })
      .eq("order_id", id)
      .eq("sent_batch", batch)
      .eq("cancelled", false)
      .is("ready_at", null);
    if (error) return Response.json({ error: error.message }, { status: 500 });

    // The whole order is ready (→ "bill", which the POS uses to unlock payment)
    // only when every sent, non-cancelled line is ready — including this batch.
    const allReady = lines
      .filter((l) => l.sent && !l.cancelled)
      .every((l) => l.ready_at != null || (l.sent_batch ?? 0) === batch);

    if (allReady) {
      await supabaseAdmin.from("orders").update({ status: "bill" }).eq("id", id);
      if (order.table_id) {
        await supabaseAdmin.from("tables").update({ status: "bill" }).eq("id", order.table_id);
      }
    }
  }

  const tableLabel = (order.table as { label?: string } | null)?.label ?? "balcão";
  await writeLog(
    "ACTION",
    "KDS",
    `Ticket #${id.slice(0, 8)}·L${batch} — Mesa ${tableLabel} → ${ACTION_LABEL[action] ?? action}`,
    staffId
  );

  return Response.json({ ok: true });
}
