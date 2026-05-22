import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("combos")
    .select("*, items:combo_items(qty, item_id, is_choice, choice_group, item:menu_items(id,name,price,category:menu_categories(id,name)))")
    .order("name");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req: Request) {
  const { name, description, price } = await req.json();
  if (!name) return Response.json({ error: "name obrigatório" }, { status: 400 });
  const { data, error } = await supabaseAdmin
    .from("combos")
    .insert({ name, description: description ?? null, price: parseFloat(price) || 0 })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
