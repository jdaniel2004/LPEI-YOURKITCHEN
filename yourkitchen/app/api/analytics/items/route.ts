import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from  = searchParams.get("from") ?? new Date(Date.now() - 7 * 86400000).toISOString();
  const to    = searchParams.get("to")   ?? new Date().toISOString();
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const { data, error } = await supabaseAdmin
    .from("order_lines")
    .select("name, qty, unit_price, extra_price, cancelled, item_id, combo_id, modifiers, created_at, ready_at, order:orders!inner(paid_at, status)")
    .eq("order.status", "paid")
    .gte("order.paid_at", from)
    .lte("order.paid_at", to)
    .eq("cancelled", false);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  type RegEntry = { qty: number; revenue: number };
  type ComboEntry = { name: string; qty: number; revenue: number; subCounts: Record<string, number> };
  type PrepEntry = { totalMin: number; count: number };

  const regularMap: Record<string, RegEntry> = {};
  // key: combo_id (if tracked) or combo name (legacy)
  const comboMap: Record<string, ComboEntry> = {};
  // Average prep time per item name (ready_at - created_at)
  const prepMap: Record<string, PrepEntry> = {};

  for (const line of data ?? []) {
    const isComboLine = !line.item_id;
    const lineRevenue = (Number(line.unit_price) + Number(line.extra_price)) * line.qty;

    if (isComboLine) {
      // Use combo_id as key if available; fall back to line name for legacy orders
      const key = line.combo_id ?? `__name__${line.name}`;
      if (!comboMap[key]) comboMap[key] = { name: line.name, qty: 0, revenue: 0, subCounts: {} };
      comboMap[key].qty     += line.qty;
      comboMap[key].revenue += lineRevenue;
      for (const mod of (Array.isArray(line.modifiers) ? line.modifiers : [])) {
        comboMap[key].subCounts[mod] = (comboMap[key].subCounts[mod] ?? 0) + line.qty;
      }
    } else {
      if (!regularMap[line.name]) regularMap[line.name] = { qty: 0, revenue: 0 };
      regularMap[line.name].qty     += line.qty;
      regularMap[line.name].revenue += lineRevenue;
    }

    // Prep time (only lines that went through the KDS "Pronto" step)
    if (line.created_at && line.ready_at) {
      const mins = (new Date(line.ready_at).getTime() - new Date(line.created_at).getTime()) / 60000;
      if (mins >= 0 && mins < 24 * 60) {
        if (!prepMap[line.name]) prepMap[line.name] = { totalMin: 0, count: 0 };
        prepMap[line.name].totalMin += mins;
        prepMap[line.name].count    += 1;
      }
    }
  }

  const standalone = Object.entries(regularMap)
    .map(([name, v]) => ({ name, qty: v.qty, revenue: Number(v.revenue.toFixed(2)) }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit);

  const combos = Object.values(comboMap)
    .map(c => ({
      name:     c.name,
      qty:      c.qty,
      revenue:  Number(c.revenue.toFixed(2)),
      subItems: Object.entries(c.subCounts)
        .map(([name, qty]) => ({ name, qty }))
        .sort((a, b) => b.qty - a.qty),
    }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit);

  const prep = Object.entries(prepMap)
    .map(([name, v]) => ({ name, avgMin: Number((v.totalMin / v.count).toFixed(1)), count: v.count }))
    .sort((a, b) => b.avgMin - a.avgMin)
    .slice(0, limit);

  const prepTotals = Object.values(prepMap).reduce(
    (acc, v) => ({ totalMin: acc.totalMin + v.totalMin, count: acc.count + v.count }),
    { totalMin: 0, count: 0 }
  );
  const avgPrepMin = prepTotals.count > 0 ? Number((prepTotals.totalMin / prepTotals.count).toFixed(1)) : 0;

  return Response.json({ standalone, combos, prep, avgPrepMin });
}
