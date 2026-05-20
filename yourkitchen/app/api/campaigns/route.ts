import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") !== "false";

  let query = supabaseAdmin.from("campaigns").select("*").order("created_at", { ascending: false });
  if (activeOnly) query = query.eq("active", true);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, type, value, target, target_id, days, start_time, end_time } = body;

  if (!name || !type || value == null || !target)
    return Response.json({ error: "name, type, value e target obrigatórios" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("campaigns")
    .insert({
      name, type, value, target,
      target_id:   target_id ?? null,
      days:        days ?? [1, 2, 3, 4, 5, 6, 7],
      start_time:  start_time ?? "00:00",
      end_time:    end_time ?? "23:59",
      active:      true,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
