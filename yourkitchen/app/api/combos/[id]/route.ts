import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const patch: Record<string, unknown> = {};
  if ("name" in body) patch.name = body.name;
  if ("description" in body) patch.description = body.description;
  if ("price" in body) patch.price = body.price;
  if ("active" in body) patch.active = body.active;

  const { data, error } = await supabaseAdmin
    .from("combos")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await supabaseAdmin.from("combos").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
