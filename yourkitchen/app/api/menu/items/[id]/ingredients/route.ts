import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("item_ingredients")
    .select("*, ingredient:ingredients(id,name,unit)")
    .eq("item_id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ingredient_id, qty } = await req.json();
  if (!ingredient_id) return Response.json({ error: "ingredient_id obrigatório" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("item_ingredients")
    .upsert({ item_id: id, ingredient_id, qty: qty ?? 1 })
    .select("*, ingredient:ingredients(id,name,unit)")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ingredient_id } = await req.json();
  const { error } = await supabaseAdmin
    .from("item_ingredients")
    .delete()
    .eq("item_id", id)
    .eq("ingredient_id", ingredient_id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
