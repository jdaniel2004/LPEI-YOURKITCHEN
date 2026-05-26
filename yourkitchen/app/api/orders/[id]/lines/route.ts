import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("order_lines")
    .select("*")
    .eq("order_id", id)
    .order("created_at");

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { item_id, name, qty, unit_price, extra_price, vat_rate, modifiers, modifier_ingredients, notes } = body;

  if (!name || unit_price == null || vat_rate == null)
    return Response.json({ error: "name, unit_price e vat_rate obrigatórios" }, { status: 400 });

  const row: Record<string, unknown> = {
    order_id:    id,
    item_id:     item_id ?? null,
    name,
    qty:         qty ?? 1,
    unit_price,
    extra_price: extra_price ?? 0,
    vat_rate,
    modifiers:   modifiers ?? [],
    notes:       notes ?? null,
  };
  // Ingredient deltas from selected modifier options (only if provided)
  if (Array.isArray(modifier_ingredients) && modifier_ingredients.length > 0)
    row.modifier_ingredients = modifier_ingredients;

  const { data, error } = await supabaseAdmin
    .from("order_lines")
    .insert(row)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
