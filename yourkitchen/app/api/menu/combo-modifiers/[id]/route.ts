import { supabaseAdmin } from "@/lib/supabase/admin";

// Update a menu choice group. Linked menus reflect the change (synchronised).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  if ("name" in body) {
    const { error } = await supabaseAdmin
      .from("combo_modifiers")
      .update({ name: body.name })
      .eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  // Replace the chosen items when provided
  if (Array.isArray(body.item_ids)) {
    await supabaseAdmin.from("combo_modifier_options").delete().eq("combo_modifier_id", id);
    if (body.item_ids.length > 0) {
      const { error: optErr } = await supabaseAdmin
        .from("combo_modifier_options")
        .insert(body.item_ids.map((iid: string) => ({ combo_modifier_id: id, item_id: iid })));
      if (optErr) return Response.json({ error: optErr.message }, { status: 500 });
    }
  }

  const { data, error } = await supabaseAdmin
    .from("combo_modifiers")
    .select("*, options:combo_modifier_options(item_id, item:menu_items(id,name,price))")
    .eq("id", id)
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await supabaseAdmin.from("combo_modifiers").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
