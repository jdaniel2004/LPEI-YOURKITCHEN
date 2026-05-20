import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? new Date(Date.now() - 7 * 86400000).toISOString();
  const to   = searchParams.get("to")   ?? new Date().toISOString();

  // Paid orders in period
  const { data: orders, error } = await supabaseAdmin
    .from("orders")
    .select("id, paid_at, discount_value, lines:order_lines(qty, unit_price, extra_price, vat_rate, cancelled)")
    .eq("status", "paid")
    .gte("paid_at", from)
    .lte("paid_at", to);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  let revenue = 0;
  let totalOrders = 0;
  let totalItems = 0;
  let vatMap: Record<number, number> = {};

  for (const order of orders ?? []) {
    totalOrders++;
    for (const line of (order.lines as Array<{
      qty: number; unit_price: number; extra_price: number; vat_rate: number; cancelled: boolean;
    }>) ?? []) {
      if (line.cancelled) continue;
      const lineTotal = (line.unit_price + line.extra_price) * line.qty;
      revenue += lineTotal;
      totalItems += line.qty;
      vatMap[line.vat_rate] = (vatMap[line.vat_rate] ?? 0) + lineTotal * (line.vat_rate / (100 + line.vat_rate));
    }
    revenue -= Number(order.discount_value ?? 0);
  }

  // Payments breakdown
  const { data: payments } = await supabaseAdmin
    .from("payments")
    .select("method, amount")
    .gte("created_at", from)
    .lte("created_at", to);

  const paymentMethods: Record<string, number> = {};
  for (const p of payments ?? []) {
    paymentMethods[p.method] = (paymentMethods[p.method] ?? 0) + Number(p.amount);
  }

  return Response.json({
    revenue:        Number(revenue.toFixed(2)),
    orders:         totalOrders,
    items:          totalItems,
    avgTicket:      totalOrders > 0 ? Number((revenue / totalOrders).toFixed(2)) : 0,
    vat:            Object.entries(vatMap).map(([rate, amount]) => ({ rate: Number(rate), amount: Number(amount.toFixed(2)) })),
    paymentMethods,
    period:         { from, to },
  });
}
