import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { signSession, sessionCookieHeader } from "@/lib/auth";
import { writeLog } from "@/lib/log";

export async function POST(req: Request) {
  const { staffId, pin } = await req.json();
  if (!staffId || !pin)
    return Response.json({ error: "staffId e pin obrigatórios" }, { status: 400 });

  const { data: staff, error } = await supabaseAdmin
    .from("staff")
    .select("id, name, role, pin_hash, active")
    .eq("id", staffId)
    .single();

  if (error || !staff)
    return Response.json({ error: "Funcionário não encontrado" }, { status: 404 });
  if (!staff.active)
    return Response.json({ error: "Funcionário inactivo" }, { status: 403 });

  const ok = await bcrypt.compare(String(pin), staff.pin_hash);
  if (!ok) return Response.json({ error: "PIN incorrecto" }, { status: 401 });

  const token = await signSession({ id: staff.id, name: staff.name, role: staff.role });

  await writeLog("ACTION", "AUTH", `Login staff: ${staff.name}`, staff.id);

  const res = Response.json({ ok: true, user: { id: staff.id, name: staff.name, role: staff.role } });
  res.headers.set("Set-Cookie", sessionCookieHeader(token));
  return res;
}

// List staff for the PIN picker (no auth required — names only, no PINs)
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("staff")
    .select("id, name, role")
    .eq("active", true)
    .order("name");

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
