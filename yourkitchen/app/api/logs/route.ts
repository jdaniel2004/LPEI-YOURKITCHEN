import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const level  = searchParams.get("level");
  const module = searchParams.get("module");
  const limit  = parseInt(searchParams.get("limit") ?? "100");
  const from   = searchParams.get("from"); // ISO date string
  const to     = searchParams.get("to");

  let query = supabaseAdmin
    .from("system_logs")
    .select("*, staff:staff(id,name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (level)  query = query.eq("level", level);
  if (module) query = query.eq("module", module);
  if (from)   query = query.gte("created_at", from);
  if (to)     query = query.lte("created_at", to);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req: Request) {
  const staffId = req.headers.get("x-session-id");
  const body = await req.json();
  const { level, module, message, comment } = body;

  if (!level || !module || !message)
    return Response.json({ error: "level, module e message obrigatórios" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("system_logs")
    .insert({ level, module, message, staff_id: staffId, comment: comment ?? null })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
