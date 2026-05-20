import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("menu_categories")
    .select("*")
    .order("position");

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, emoji, position } = body;
  if (!name) return Response.json({ error: "name obrigatório" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("menu_categories")
    .insert({ name, emoji, position: position ?? 0 })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
