import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, required, options } = body;
  if (!name) return Response.json({ error: "name obrigatório" }, { status: 400 });

  const { data: mod, error: modErr } = await supabaseAdmin
    .from("item_modifiers")
    .insert({ item_id: id, name, required: required ?? false, position: 0 })
    .select()
    .single();
  if (modErr) return Response.json({ error: modErr.message }, { status: 500 });

  if (Array.isArray(options) && options.length > 0) {
    const { error: optErr } = await supabaseAdmin
      .from("modifier_options")
      .insert(
        options.map((o: { label: string; extra_price?: number; ingredient_id?: string; ingredient_qty?: number; ingredient_unit?: string }) => ({
          modifier_id: mod.id,
          label: o.label,
          extra_price: o.extra_price ?? 0,
          ingredient_id: o.ingredient_id ?? null,
          ingredient_qty: o.ingredient_qty ?? null,
          ingredient_unit: o.ingredient_unit ?? null,
        }))
      );
    if (optErr) return Response.json({ error: optErr.message }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from("item_modifiers")
    .select("*, options:modifier_options(*)")
    .eq("id", mod.id)
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
