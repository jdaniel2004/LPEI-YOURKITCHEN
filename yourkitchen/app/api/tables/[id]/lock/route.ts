import { supabaseAdmin } from "@/lib/supabase/admin";

const LOCK_TTL_MS = 2 * 60 * 1000;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staffId = req.headers.get("x-session-id");
  if (!staffId) return Response.json({ error: "Sessão inválida" }, { status: 401 });

  const { data: table, error } = await supabaseAdmin
    .from("tables")
    .select("locked_by, locked_at")
    .eq("id", id)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 404 });

  const now = Date.now();
  const lockAge = table.locked_at ? now - new Date(table.locked_at).getTime() : Infinity;
  const isExpired = lockAge > LOCK_TTL_MS;

  if (table.locked_by && table.locked_by !== staffId && !isExpired) {
    const { data: locker } = await supabaseAdmin
      .from("staff").select("name").eq("id", table.locked_by).single();
    return Response.json({ acquired: false, lockedBy: locker?.name ?? "outro utilizador" });
  }

  await supabaseAdmin
    .from("tables")
    .update({ locked_by: staffId, locked_at: new Date().toISOString() })
    .eq("id", id);

  return Response.json({ acquired: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staffId = req.headers.get("x-session-id");

  await supabaseAdmin
    .from("tables")
    .update({ locked_by: null, locked_at: null })
    .eq("id", id)
    .eq("locked_by", staffId);

  return new Response(null, { status: 204 });
}
