import { supabaseAdmin } from "@/lib/supabase/admin";

// List all reusable modifier templates with their options
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("modifier_templates")
    .select("*, options:modifier_template_options(*, ingredient:ingredients(id,name,unit))")
    .order("name");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

// Create a new template (+ its options)
export async function POST(req: Request) {
  const body = await req.json();
  const { name, required, options } = body;
  if (!name) return Response.json({ error: "name obrigatório" }, { status: 400 });

  const { data: tpl, error: tplErr } = await supabaseAdmin
    .from("modifier_templates")
    .insert({ name, required: required ?? false })
    .select()
    .single();
  if (tplErr) return Response.json({ error: tplErr.message }, { status: 500 });

  if (Array.isArray(options) && options.length > 0) {
    const { error: optErr } = await supabaseAdmin
      .from("modifier_template_options")
      .insert(
        options.map((o: { label: string; extra_price?: number; ingredient_id?: string; ingredient_qty?: number; ingredient_unit?: string }) => ({
          template_id: tpl.id,
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
    .from("modifier_templates")
    .select("*, options:modifier_template_options(*, ingredient:ingredients(id,name,unit))")
    .eq("id", tpl.id)
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
