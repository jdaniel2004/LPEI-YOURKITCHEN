import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? new Date(Date.now() - 7 * 86400000).toISOString();
  const to   = searchParams.get("to")   ?? new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("payments")
    .select("method, amount")
    .gte("created_at", from)
    .lte("created_at", to);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const methodMap: Record<string, { count: number; total: number }> = {};
  for (const p of data ?? []) {
    if (!methodMap[p.method]) methodMap[p.method] = { count: 0, total: 0 };
    methodMap[p.method].count++;
    methodMap[p.method].total += Number(p.amount);
  }

  const result = Object.entries(methodMap).map(([method, v]) => ({
    method,
    count:   v.count,
    total:   Number(v.total.toFixed(2)),
  }));

  return Response.json(result);
}
