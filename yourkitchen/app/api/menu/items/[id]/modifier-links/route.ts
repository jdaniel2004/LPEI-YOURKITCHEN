import { supabaseAdmin } from "@/lib/supabase/admin";

// List the library modifier templates linked to this item
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("item_modifier_templates")
    .select("template_id, template:modifier_templates(*, options:modifier_template_options(*))")
    .eq("item_id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

// Link a template to this item
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { template_id } = await req.json();
  if (!template_id) return Response.json({ error: "template_id obrigatório" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("item_modifier_templates")
    .upsert({ item_id: id, template_id });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true }, { status: 201 });
}

// Unlink a template from this item
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { template_id } = await req.json();
  const { error } = await supabaseAdmin
    .from("item_modifier_templates")
    .delete()
    .eq("item_id", id)
    .eq("template_id", template_id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
