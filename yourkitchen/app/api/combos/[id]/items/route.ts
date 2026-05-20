import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("combo_items")
    .select("*, item:menu_items(id,name,price)")
    .eq("combo_id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { item_id, qty } = await req.json();
  if (!item_id) return Response.json({ error: "item_id obrigatório" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("combo_items")
    .upsert({ combo_id: id, item_id, qty: qty ?? 1 })
    .select("*, item:menu_items(id,name,price)")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { item_id } = await req.json();
  const { error } = await supabaseAdmin
    .from("combo_items")
    .delete()
    .eq("combo_id", id)
    .eq("item_id", item_id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
