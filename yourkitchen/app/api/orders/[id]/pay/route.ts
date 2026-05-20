import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeLog } from "@/lib/log";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staffId = req.headers.get("x-session-id");
  const body = await req.json();
  const { method, amount, split_n, discount_id, discount_value } = body;

  if (!method || amount == null)
    return Response.json({ error: "method e amount obrigatórios" }, { status: 400 });

  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .select("id, table_id, table:tables(label)")
    .eq("id", id)
    .single();

  if (orderErr || !order)
    return Response.json({ error: "Encomenda não encontrada" }, { status: 404 });

  const { error: payErr } = await supabaseAdmin.from("payments").insert({
    order_id: id,
    method,
    amount,
    split_n: split_n ?? 1,
  });
  if (payErr) return Response.json({ error: payErr.message }, { status: 500 });

  const orderPatch: Record<string, unknown> = {
    status:  "paid",
    paid_at: new Date().toISOString(),
  };
  if (discount_id)    orderPatch.discount_id    = discount_id;
  if (discount_value) orderPatch.discount_value = discount_value;

  const { data: updatedOrder, error: updateErr } = await supabaseAdmin
    .from("orders")
    .update(orderPatch)
    .eq("id", id)
    .select()
    .single();

  if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 });

  if (order.table_id) {
    await supabaseAdmin
      .from("tables")
      .update({ status: "free", locked_by: null, locked_at: null })
      .eq("id", order.table_id);
  }

  const tableLabel = (order.table as { label?: string } | null)?.label ?? "balcão";
  const methodLabel: Record<string, string> = {
    numerario: "Numerário", cartao: "Cartão", mbway: "MBWay", multibanco: "Multibanco",
  };
  await writeLog(
    "ACTION",
    "POS",
    `Pagamento — Mesa ${tableLabel} — €${Number(amount).toFixed(2)} — ${methodLabel[method] ?? method}`,
    staffId
  );

  return Response.json(updatedOrder);
}
