import { supabaseAdmin } from "@/lib/supabase/admin";

// Which reusable choice groups are linked to this menu
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("combo_modifier_links")
    .select("combo_modifier_id")
    .eq("combo_id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { combo_modifier_id } = await req.json();
  if (!combo_modifier_id) return Response.json({ error: "combo_modifier_id obrigatório" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("combo_modifier_links")
    .upsert({ combo_id: id, combo_modifier_id });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { combo_modifier_id } = await req.json();
  const { error } = await supabaseAdmin
    .from("combo_modifier_links")
    .delete()
    .eq("combo_id", id)
    .eq("combo_modifier_id", combo_modifier_id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
