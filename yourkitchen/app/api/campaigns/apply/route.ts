import { supabaseAdmin } from "@/lib/supabase/admin";

interface Campaign {
  id: string;
  name: string;
  type: "percent" | "fixed";
  value: number;
  target: "all" | "category" | "item";
  target_id: string | null;
  days: number[];
  start_time: string;
  end_time: string;
}

export async function POST(req: Request) {
  const body = await req.json();
  const { order_total, category_id, item_id } = body;

  if (order_total == null)
    return Response.json({ error: "order_total obrigatório" }, { status: 400 });

  const now = new Date();
  const isoWeekday = now.getDay() === 0 ? 7 : now.getDay(); // ISO: 1=Mon … 7=Sun
  const currentTime = now.toTimeString().slice(0, 5);

  const { data: campaigns, error } = await supabaseAdmin
    .from("campaigns")
    .select("*")
    .eq("active", true)
    .contains("days", [isoWeekday])
    .lte("start_time", currentTime)
    .gte("end_time", currentTime);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const applicable = (campaigns as Campaign[]).filter((c) => {
    if (c.target === "all") return true;
    if (c.target === "category" && c.target_id === category_id) return true;
    if (c.target === "item" && c.target_id === item_id) return true;
    return false;
  });

  const discounts = applicable.map((c) => ({
    id:      c.id,
    name:    c.name,
    type:    c.type,
    value:   c.value,
    savings: c.type === "percent"
      ? Number(((order_total * c.value) / 100).toFixed(2))
      : Number(Math.min(c.value, order_total).toFixed(2)),
  }));

  return Response.json(discounts);
}
