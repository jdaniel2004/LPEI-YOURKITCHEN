import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const includeModifiers = searchParams.get("include")?.includes("modifiers");

  const query = supabaseAdmin
    .from("menu_items")
    .select(
      includeModifiers
        ? "*, category:menu_categories(id,name,emoji,position), modifiers:item_modifiers(*, options:modifier_options(*, ingredient:ingredients(id,name,unit))), ingredients:item_ingredients(ingredient_id, qty, ingredient:ingredients(id,name))"
        : "*, category:menu_categories(id,name,emoji,position)"
    )
    .order("name");

  const activeOnly = searchParams.get("active");
  if (activeOnly !== "false") query.eq("active", true);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Best-effort: attach linked library modifiers. Done as a separate query so a
  // missing migration (item_modifier_templates) never breaks the whole menu.
  if (includeModifiers && Array.isArray(data) && data.length > 0) {
    const ids = data.map((i) => i.id);
    const { data: links } = await supabaseAdmin
      .from("item_modifier_templates")
      .select("item_id, template:modifier_templates(id,name,required,options:modifier_template_options(*, ingredient:ingredients(id,name,unit)))")
      .in("item_id", ids);
    if (Array.isArray(links)) {
      const byItem: Record<string, { template: unknown }[]> = {};
      for (const l of links) (byItem[l.item_id as string] ||= []).push({ template: l.template });
      for (const item of data as Array<{ id: string; templateLinks?: unknown }>)
        item.templateLinks = byItem[item.id] || [];
    }
  }

  return Response.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { category_id, name, emoji, price, vat_rate, stock } = body;
  if (!category_id || !name || price == null)
    return Response.json({ error: "category_id, name e price obrigatórios" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("menu_items")
    .insert({ category_id, name, emoji, price, vat_rate: vat_rate ?? 23, stock: stock ?? null })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
