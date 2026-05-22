import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // Support both old ?date= (single day, hourly) and new ?from=&to= (range, daily)
  const dateParam = searchParams.get("date");
  const fromParam = searchParams.get("from");
  const toParam   = searchParams.get("to");

  let from: string;
  let to: string;
  let mode: "hourly" | "daily";

  if (fromParam && toParam) {
    from = fromParam;
    to   = toParam;
    const diffMs = new Date(to).getTime() - new Date(from).getTime();
    mode = diffMs <= 86400000 * 1.5 ? "hourly" : "daily";
  } else {
    const date = dateParam ?? new Date().toISOString().slice(0, 10);
    from = `${date}T00:00:00`;
    to   = `${date}T23:59:59`;
    mode = "hourly";
  }

  const { data: orders, error } = await supabaseAdmin
    .from("orders")
    .select("paid_at, lines:order_lines(qty, unit_price, extra_price, cancelled)")
    .eq("status", "paid")
    .gte("paid_at", from)
    .lte("paid_at", to);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (mode === "hourly") {
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

    return Response.json(
      Object.entries(buckets).map(([h, v]) => ({
        label: `${String(h).padStart(2, "0")}:00`,
        revenue: Number(v.revenue.toFixed(2)),
        orders: v.orders,
      }))
    );
  }

  // Daily mode: bucket by date
  const dayMap: Record<string, { revenue: number; orders: number }> = {};

  for (const order of orders ?? []) {
    const d = new Date(order.paid_at).toLocaleDateString("pt-PT", { day:"2-digit", month:"2-digit" });
    if (!dayMap[d]) dayMap[d] = { revenue: 0, orders: 0 };
    dayMap[d].orders++;
    for (const line of (order.lines as Array<{
      qty: number; unit_price: number; extra_price: number; cancelled: boolean;
    }>) ?? []) {
      if (!line.cancelled) {
        dayMap[d].revenue += (line.unit_price + line.extra_price) * line.qty;
      }
    }
  }

  // Fill every day in range so chart has continuous x-axis
  const result: { label: string; revenue: number; orders: number }[] = [];
  const cursor = new Date(from);
  const end    = new Date(to);
  while (cursor <= end) {
    const d = cursor.toLocaleDateString("pt-PT", { day:"2-digit", month:"2-digit" });
    result.push({ label: d, revenue: Number((dayMap[d]?.revenue ?? 0).toFixed(2)), orders: dayMap[d]?.orders ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  return Response.json(result);
}
