import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Which Supabase project the app is talking to (host only — already public via
// NEXT_PUBLIC). Computed per-request so the runtime env value is used.
function getProjectHost(): string {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").host; } catch { return ""; }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = (cols: string) => supabaseAdmin.from("staff").select(cols).eq("id", id).single();
  // Graceful fallback when the nick column hasn't been migrated yet.
  let { data, error } = await run("id, name, nick, role, active, created_at");
  if (error && /nick/i.test(error.message || ""))
    ({ data, error } = await run("id, name, role, active, created_at"));

  if (error) return Response.json({ error: error.message }, { status: 404 });
  return Response.json(data);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const patch: Record<string, unknown> = {};

  if (body.name)   patch.name   = body.name;
  if (body.nick !== undefined) patch.nick = String(body.nick).trim() || null;
  if (body.role)   patch.role   = body.role;
  if (body.active !== undefined) patch.active = body.active;
  if (body.pin) {
    if (String(body.pin).length !== 4)
      return Response.json({ error: "PIN deve ter 4 dígitos" }, { status: 400 });
    patch.pin_hash = await bcrypt.hash(String(body.pin), 10);
  }

  const update = (p: Record<string, unknown>, cols: string) =>
    supabaseAdmin.from("staff").update(p).eq("id", id).select(cols).single();

  let { data, error } = await update(patch, "id, name, nick, role, active, created_at");
  // Graceful fallback: nick column not migrated yet → update without it, and
  // flag it (with the real error + project) so the client can warn clearly.
  let nickColumnMissing = false;
  let nickError = "";
  if (error && /nick/i.test(error.message || "")) {
    nickColumnMissing = true;
    nickError = error?.message ?? "";
    delete patch.nick;
    ({ data, error } = await update(patch, "id, name, role, active, created_at"));
  }

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ...(data as object), nickColumnMissing, nickError, project: getProjectHost() });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await supabaseAdmin
    .from("staff")
    .update({ active: false })
    .eq("id", id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
