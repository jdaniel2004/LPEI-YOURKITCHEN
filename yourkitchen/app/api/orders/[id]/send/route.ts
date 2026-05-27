import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeLog } from "@/lib/log";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staffId = req.headers.get("x-session-id");

  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .select("id, table_id, status, table:tables(label), lines:order_lines(*)")
    .eq("id", id)
    .single();

  if (orderErr || !order)
    return Response.json({ error: "Encomenda não encontrada" }, { status: 404 });

  const lines = order.lines as Array<{
    id: string; item_id: string | null; qty: number;
    sent: boolean; cancelled: boolean; sent_batch: number; modifiers: string[] | null;
    modifier_ingredients: Array<{ ingredient_id: string; qty: number }> | null;
  }>;

  const unsentLines = lines.filter((l) => !l.sent && !l.cancelled);

  if (unsentLines.length === 0)
    return Response.json({ error: "Sem novos itens para enviar" }, { status: 400 });

  // Determine next batch number (max existing batch + 1, minimum 1)
  const maxBatch = lines.reduce((m, l) => Math.max(m, l.sent_batch ?? 0), 0);
  const nextBatch = maxBatch + 1;

  const lineIds = unsentLines.map((l) => l.id);
  const { error: linesErr } = await supabaseAdmin
    .from("order_lines")
    .update({ sent: true, sent_batch: nextBatch })
    .in("id", lineIds);

  if (linesErr) return Response.json({ error: linesErr.message }, { status: 500 });

  // Decrement item stock for regular lines
  for (const line of unsentLines) {
    if (!line.item_id) continue;
    await supabaseAdmin.rpc("decrement_stock", {
      p_item_id: line.item_id,
      p_qty:     line.qty,
    });
  }

  // Decrement ingredient stock for regular lines
  for (const line of unsentLines) {
    if (!line.item_id) continue;
    const { data: ings } = await supabaseAdmin
      .from("item_ingredients")
      .select("ingredient_id, qty")
      .eq("item_id", line.item_id);
    if (ings && ings.length > 0) {
      for (const ing of ings) {
        await supabaseAdmin.rpc("decrement_ingredient_stock", {
          p_ingredient_id: ing.ingredient_id,
          p_qty: ing.qty * line.qty,
        });
      }
    }
  }

  // Dynamic ingredients: deduct what the selected modifier options consume
  // (e.g. "Espiral 200g" / "+200g") on top of the base recipe.
  for (const line of unsentLines) {
    const mi = Array.isArray(line.modifier_ingredients) ? line.modifier_ingredients : [];
    for (const m of mi) {
      if (!m?.ingredient_id || !m?.qty) continue;
      await supabaseAdmin.rpc("decrement_ingredient_stock", {
        p_ingredient_id: m.ingredient_id,
        p_qty: Number(m.qty) * line.qty,
      });
    }
  }

  // Only reset to "open" when the kitchen had already marked the order ready
  // ("bill"). Resetting while still "sent" would yank the ticket the cook is
  // actively preparing back to the "Pendente" column — the reported "going back"
  // bug. The new batch's lines appear in the same ticket via the KDS mapping
  // (undelivered lines), so no status change is needed while preparing.
  if (order.status === "bill") {
    const { error: resetErr } = await supabaseAdmin
      .from("orders")
      .update({ status: "open" })
      .eq("id", id);
    if (resetErr) return Response.json({ error: resetErr.message }, { status: 500 });
  }

  // Mark table as occupied
  if (order.table_id) {
    await supabaseAdmin
      .from("tables")
      .update({ status: "occupied" })
      .eq("id", order.table_id)
      .in("status", ["free", "reserved", "bill"]);
  }

  const { data: updatedOrder, error: updateErr } = await supabaseAdmin
    .from("orders")
    .select()
    .eq("id", id)
    .single();

  if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 });

  const tableLabel = (order.table as { label?: string } | null)?.label ?? "balcão";
  await writeLog(
    "ACTION",
    "POS",
    `Pedido enviado — Mesa ${tableLabel} (${unsentLines.length} itens, lote ${nextBatch})`,
    staffId
  );

  return Response.json(updatedOrder);
}
