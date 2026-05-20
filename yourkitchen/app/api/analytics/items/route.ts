import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from  = searchParams.get("from") ?? new Date(Date.now() - 7 * 86400000).toISOString();
  const to    = searchParams.get("to")   ?? new Date().toISOString();
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const { data, error } = await supabaseAdmin
    .from("order_lines")
    .select("name, qty, unit_price, extra_price, cancelled, order:orders!inner(paid_at, status)")
    .eq("order.status", "paid")
    .gte("order.paid_at", from)
    .lte("order.paid_at", to)
    .eq("cancelled", false);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const itemMap: Record<string, { qty: number; revenue: number }> = {};
  for (const line of data ?? []) {
    if (!itemMap[line.name]) itemMap[line.name] = { qty: 0, revenue: 0 };
    itemMap[line.name].qty     += line.qty;
    itemMap[line.name].revenue += (line.unit_price + line.extra_price) * line.qty;
  }

  const sorted = Object.entries(itemMap)
    .map(([name, v]) => ({ name, qty: v.qty, revenue: Number(v.revenue.toFixed(2)) }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit);

  return Response.json(sorted);
}
