import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("tables")
    .select("*, zone:zones(id, name)")
    .order("label");

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { label, zone_id, seats } = body;
  if (!label || !zone_id)
    return Response.json({ error: "label e zone_id obrigatórios" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("tables")
    .insert({ label, zone_id, seats: seats ?? 4 })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
