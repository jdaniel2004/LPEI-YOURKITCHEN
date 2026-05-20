import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("zones")
    .select("*")
    .order("name");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name) return Response.json({ error: "name obrigatório" }, { status: 400 });
  const { data, error } = await supabaseAdmin
    .from("zones")
    .insert({ name })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
