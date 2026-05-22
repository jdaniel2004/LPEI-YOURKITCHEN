import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("ingredients")
    .select("*")
    .order("name");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req: Request) {
  const { name, unit, stock_qty, is_modifier } = await req.json();
  if (!name) return Response.json({ error: "name obrigatório" }, { status: 400 });
  const { data, error } = await supabaseAdmin
    .from("ingredients")
    .insert({ name, unit: unit ?? "un", stock_qty: stock_qty ?? 0, is_modifier: is_modifier ?? false })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
