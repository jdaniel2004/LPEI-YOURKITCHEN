import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; modId: string }> }) {
  const { modId } = await params;
  const body = await req.json();
  const { name, required, options } = body;

  const patch: Record<string, unknown> = {};
  if (name !== undefined) patch.name = name;
  if (required !== undefined) patch.required = required;

  if (Object.keys(patch).length > 0) {
    const { error } = await supabaseAdmin
      .from("item_modifiers")
      .update(patch)
      .eq("id", modId);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  if (options !== undefined) {
    await supabaseAdmin.from("modifier_options").delete().eq("modifier_id", modId);
    if (Array.isArray(options) && options.length > 0) {
      const { error } = await supabaseAdmin.from("modifier_options").insert(
        options.map((o: { label: string; extra_price?: number }) => ({
          modifier_id: modId,
          label: o.label,
          extra_price: o.extra_price ?? 0,
        }))
      );
      if (error) return Response.json({ error: error.message }, { status: 500 });
    }
  }

  const { data, error } = await supabaseAdmin
    .from("item_modifiers")
    .select("*, options:modifier_options(*)")
    .eq("id", modId)
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; modId: string }> }) {
  const { modId } = await params;
  const { error } = await supabaseAdmin.from("item_modifiers").delete().eq("id", modId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
