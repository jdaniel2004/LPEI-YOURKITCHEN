import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("staff")
    .select("id, name, nick, role, active, created_at")
    .eq("id", id)
    .single();

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

  const { data, error } = await supabaseAdmin
    .from("staff")
    .update(patch)
    .eq("id", id)
    .select("id, name, nick, role, active, created_at")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
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
