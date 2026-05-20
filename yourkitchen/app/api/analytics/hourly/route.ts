import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  const from = `${date}T00:00:00`;
  const to   = `${date}T23:59:59`;

  const { data: orders, error } = await supabaseAdmin
    .from("orders")
    .select("paid_at, lines:order_lines(qty, unit_price, extra_price, cancelled)")
    .eq("status", "paid")
    .gte("paid_at", from)
    .lte("paid_at", to);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Bucket by hour 0–23
  const buckets: Record<number, { revenue: number; orders: number }> = {};
  for (let h = 0; h < 24; h++) buckets[h] = { revenue: 0, orders: 0 };

  for (const order of orders ?? []) {
    const hour = new Date(order.paid_at).getHours();
    buckets[hour].orders++;
    for (const line of (order.lines as Array<{
      qty: number; unit_price: number; extra_price: number; cancelled: boolean;
    }>) ?? []) {
      if (!line.cancelled) {
        buckets[hour].revenue += (line.unit_price + line.extra_price) * line.qty;
      }
    }
  }

  const result = Object.entries(buckets).map(([hour, v]) => ({
    hour: `${String(hour).padStart(2, "0")}:00`,
    revenue: Number(v.revenue.toFixed(2)),
    orders:  v.orders,
  }));

  return Response.json(result);
}
