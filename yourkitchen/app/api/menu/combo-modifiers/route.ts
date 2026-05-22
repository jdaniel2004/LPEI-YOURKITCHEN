import { supabaseAdmin } from "@/lib/supabase/admin";

// Reusable menu choice groups (e.g. "Bebida": Cola / Água)
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("combo_modifiers")
    .select("*, options:combo_modifier_options(item_id, item:menu_items(id,name,price))")
    .order("name");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, item_ids } = body;
  if (!name) return Response.json({ error: "name obrigatório" }, { status: 400 });

  const { data: cm, error: cmErr } = await supabaseAdmin
    .from("combo_modifiers")
    .insert({ name })
    .select()
    .single();
  if (cmErr) return Response.json({ error: cmErr.message }, { status: 500 });

  if (Array.isArray(item_ids) && item_ids.length > 0) {
    const { error: optErr } = await supabaseAdmin
      .from("combo_modifier_options")
      .insert(item_ids.map((id: string) => ({ combo_modifier_id: cm.id, item_id: id })));
    if (optErr) return Response.json({ error: optErr.message }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from("combo_modifiers")
    .select("*, options:combo_modifier_options(item_id, item:menu_items(id,name,price))")
    .eq("id", cm.id)
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
