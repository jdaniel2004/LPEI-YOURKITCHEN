import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("combos")
    .select("*, items:combo_items(qty, item_id, is_choice, choice_group, item:menu_items(id,name,price,category:menu_categories(id,name)))")
    .order("name");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Best-effort: attach linked reusable choice groups. Separate query so a missing
  // migration (combo_modifier_*) never breaks the whole combos list.
  if (Array.isArray(data) && data.length > 0) {
    const ids = data.map((c) => c.id);
    const { data: links } = await supabaseAdmin
      .from("combo_modifier_links")
      .select("combo_id, modifier:combo_modifiers(id, name, options:combo_modifier_options(item:menu_items(id,name,price)))")
      .in("combo_id", ids);
    if (Array.isArray(links)) {
      const byCombo: Record<string, unknown[]> = {};
      for (const l of links) (byCombo[l.combo_id as string] ||= []).push(l.modifier);
      for (const c of data as Array<{ id: string; comboModifiers?: unknown }>)
        c.comboModifiers = byCombo[c.id] || [];
    }
  }

  return Response.json(data);
}

export async function POST(req: Request) {
  const { name, description, price } = await req.json();
  if (!name) return Response.json({ error: "name obrigatório" }, { status: 400 });
  const { data, error } = await supabaseAdmin
    .from("combos")
    .insert({ name, description: description ?? null, price: parseFloat(price) || 0 })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
