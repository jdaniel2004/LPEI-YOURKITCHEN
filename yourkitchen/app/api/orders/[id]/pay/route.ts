import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeLog } from "@/lib/log";

type Line = {
  id: string;
  name: string;
  qty: number;
  unit_price: number;
  extra_price: number | null;
  paid_qty: number | null;
  cancelled: boolean;
};

const methodLabel: Record<string, string> = {
  numerario: "Numerário", cartao: "Cartão", mbway: "MBWay", multibanco: "Multibanco",
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staffId = req.headers.get("x-session-id");
  const body = await req.json();
  const { method, amount, split_n, discount_id, discount_value, items, tip } = body;

  if (!method)
    return Response.json({ error: "method obrigatório" }, { status: 400 });

  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .select(
      "id, table_id, table:tables(label), lines:order_lines(id, name, qty, unit_price, extra_price, paid_qty, cancelled)"
    )
    .eq("id", id)
    .single();

  if (orderErr || !order)
    return Response.json({ error: "Encomenda não encontrada" }, { status: 404 });

  const lines = (order.lines || []) as Line[];
  const unitPrice = (l: Line) => Number(l.unit_price) + Number(l.extra_price || 0);

  // Final paid_qty per line — starts from current DB values, mutated below.
  const finalPaid = new Map(lines.map((l) => [l.id, l.paid_qty ?? 0]));

  const isItemPayment = Array.isArray(items) && items.length > 0;
  let payAmount = 0;
  let paidUnits = 0;
  // Per-item breakdown of what THIS transaction settled (item payments only), so
  // the backoffice can show exactly which units each payment covered.
  const paidItems: Array<{ name: string; qty: number; unit_price: number; extra_price: number }> = [];

  if (isItemPayment) {
    // ── Partial payment: settle specific units of specific lines ───────────────
    const byId = new Map(lines.map((l) => [l.id, l]));
    const updates: Array<{ id: string; paid_qty: number }> = [];
    for (const it of items as Array<{ line_id: string; qty: number }>) {
      const line = byId.get(it.line_id);
      const want = Math.floor(Number(it.qty) || 0);
      if (!line || line.cancelled || want <= 0) continue;
      const already = finalPaid.get(line.id) ?? 0;
      const payQty = Math.min(want, line.qty - already);
      if (payQty <= 0) continue;
      payAmount += payQty * unitPrice(line);
      paidUnits += payQty;
      finalPaid.set(line.id, already + payQty);
      updates.push({ id: line.id, paid_qty: already + payQty });
      paidItems.push({
        name: line.name,
        qty: payQty,
        unit_price: Number(line.unit_price),
        extra_price: Number(line.extra_price || 0),
      });
    }
    if (updates.length === 0)
      return Response.json({ error: "Nada para pagar nos itens selecionados" }, { status: 400 });

    for (const u of updates) {
      const { error } = await supabaseAdmin
        .from("order_lines")
        .update({ paid_qty: u.paid_qty })
        .eq("id", u.id);
      if (error) return Response.json({ error: error.message }, { status: 500 });
    }
  } else {
    // ── Full payment (whole bill / split by people): mark every line fully paid ─
    const active = lines.filter((l) => !l.cancelled);
    payAmount = amount != null
      ? Number(amount)
      : active.reduce((s, l) => s + l.qty * unitPrice(l), 0);
    for (const l of active) {
      if ((l.paid_qty ?? 0) >= l.qty) continue;
      finalPaid.set(l.id, l.qty);
      const { error } = await supabaseAdmin
        .from("order_lines")
        .update({ paid_qty: l.qty })
        .eq("id", l.id);
      if (error) return Response.json({ error: error.message }, { status: 500 });
    }
  }

  // Record the payment (one row per transaction, partial or full). For item
  // payments, store the per-item breakdown; full/by-people payments leave it null.
  const { error: payErr } = await supabaseAdmin.from("payments").insert({
    order_id: id,
    method,
    amount: payAmount,
    split_n: split_n ?? 1,
    tip: Number(tip ?? 0),
    items: isItemPayment ? paidItems : null,
  });
  if (payErr) return Response.json({ error: payErr.message }, { status: 500 });

  // Order is fully settled only when every non-cancelled line is fully paid.
  const fullyPaid = lines
    .filter((l) => !l.cancelled)
    .every((l) => (finalPaid.get(l.id) ?? 0) >= l.qty);

  let updatedOrder: unknown = order;
  if (fullyPaid) {
    const orderPatch: Record<string, unknown> = {
      status: "paid",
      paid_at: new Date().toISOString(),
    };
    if (discount_id) orderPatch.discount_id = discount_id;
    if (discount_value) orderPatch.discount_value = discount_value;

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("orders")
      .update(orderPatch)
      .eq("id", id)
      .select()
      .single();
    if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 });
    updatedOrder = updated;

    if (order.table_id) {
      await supabaseAdmin
        .from("tables")
        .update({ status: "free", locked_by: null, locked_at: null })
        .eq("id", order.table_id);
    }
  }

  const tableLabel = (order.table as { label?: string } | null)?.label ?? "balcão";
  await writeLog(
    "ACTION",
    "POS",
    isItemPayment && !fullyPaid
      ? `Pagamento parcial — Mesa ${tableLabel} — €${payAmount.toFixed(2)} (${paidUnits} ${paidUnits === 1 ? "item" : "itens"}) — ${methodLabel[method] ?? method}`
      : `Pagamento — Mesa ${tableLabel} — €${payAmount.toFixed(2)} — ${methodLabel[method] ?? method}`,
    staffId
  );

  return Response.json({
    order: updatedOrder,
    fullyPaid,
    amount: payAmount,
    paidLines: Array.from(finalPaid, ([line_id, paid_qty]) => ({ line_id, paid_qty })),
  });
}
