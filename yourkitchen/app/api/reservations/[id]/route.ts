import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const allowed = ["name", "phone", "date", "time", "persons", "table_id", "notes", "status"];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) patch[k] = body[k];

  // Fetch current reservation to know the old table_id
  const { data: current } = await supabaseAdmin
    .from("reservations").select("table_id").eq("id", id).single();

  const { data, error } = await supabaseAdmin
    .from("reservations")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const newStatus = patch.status as string | undefined;
  const newTableId = "table_id" in patch ? patch.table_id as string | null : undefined;
  const oldTableId = current?.table_id as string | null;

  // Free old table if status closed or table changed
  const closing = newStatus === "cancelled" || newStatus === "completed";
  if (closing && oldTableId) {
    await supabaseAdmin.from("tables").update({ status: "free" }).eq("id", oldTableId);
  } else if (newTableId !== undefined) {
    if (oldTableId && oldTableId !== newTableId) {
      await supabaseAdmin.from("tables").update({ status: "free" }).eq("id", oldTableId);
    }
    if (newTableId) {
      await supabaseAdmin.from("tables").update({ status: "reserved" }).eq("id", newTableId);
    }
  }

  return Response.json(data);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: current } = await supabaseAdmin
    .from("reservations").select("table_id").eq("id", id).single();

  const { error } = await supabaseAdmin
    .from("reservations")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (current?.table_id) {
    await supabaseAdmin.from("tables").update({ status: "free" }).eq("id", current.table_id);
  }

  return new Response(null, { status: 204 });
}
