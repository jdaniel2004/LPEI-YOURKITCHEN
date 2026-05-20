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

  const unsentLines = (order.lines as Array<{
    id: string; item_id: string | null; qty: number; sent: boolean; cancelled: boolean;
  }>).filter((l) => !l.sent && !l.cancelled);

  if (unsentLines.length === 0)
    return Response.json({ error: "Sem novos itens para enviar" }, { status: 400 });

  const lineIds = unsentLines.map((l) => l.id);
  const { error: linesErr } = await supabaseAdmin
    .from("order_lines")
    .update({ sent: true })
    .in("id", lineIds);

  if (linesErr) return Response.json({ error: linesErr.message }, { status: 500 });

  // Decrement item stock (skip combo lines which have item_id = null)
  for (const line of unsentLines) {
    if (!line.item_id) continue;
    await supabaseAdmin.rpc("decrement_stock", {
      p_item_id: line.item_id,
      p_qty:     line.qty,
    });
  }

  // Decrement ingredient stock
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

  // Reset to "open" so KDS sees new batch as "pendente".
  // If order was already in-progress (sent/bill), a new batch resets it back.
  // If already "open", no change needed.
  if (order.status === "sent" || order.status === "bill") {
    const { error: resetErr } = await supabaseAdmin
      .from("orders")
      .update({ status: "open" })
      .eq("id", id);
    if (resetErr) return Response.json({ error: resetErr.message }, { status: 500 });
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
    `Pedido enviado — Mesa ${tableLabel} (${unsentLines.length} itens)`,
    staffId
  );

  return Response.json(updatedOrder);
}
