import { supabaseAdmin } from "@/lib/supabase/admin";

// Update a template: name/required and (optionally) replace its options.
// Because templates are linked (synchronised), this updates every item that uses it.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const patch: Record<string, unknown> = {};
  if ("name" in body) patch.name = body.name;
  if ("required" in body) patch.required = body.required;
  if ("single" in body) patch.single = body.single;

  if (Object.keys(patch).length > 0) {
    const { error } = await supabaseAdmin
      .from("modifier_templates")
      .update(patch)
      .eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  // Replace options when provided
  if (Array.isArray(body.options)) {
    await supabaseAdmin.from("modifier_template_options").delete().eq("template_id", id);
    if (body.options.length > 0) {
      const { error: optErr } = await supabaseAdmin
        .from("modifier_template_options")
        .insert(
          body.options.map((o: { label: string; extra_price?: number; ingredient_id?: string; ingredient_qty?: number; ingredient_unit?: string }) => ({
            template_id: id,
            label: o.label,
            extra_price: o.extra_price ?? 0,
            ingredient_id: o.ingredient_id ?? null,
            ingredient_qty: o.ingredient_qty ?? null,
            ingredient_unit: o.ingredient_unit ?? null,
          }))
        );
      if (optErr) return Response.json({ error: optErr.message }, { status: 500 });
    }
  }

  const { data, error } = await supabaseAdmin
    .from("modifier_templates")
    .select("*, options:modifier_template_options(*, ingredient:ingredients(id,name,unit))")
    .eq("id", id)
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Junction rows are removed by ON DELETE CASCADE
  const { error } = await supabaseAdmin.from("modifier_templates").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
