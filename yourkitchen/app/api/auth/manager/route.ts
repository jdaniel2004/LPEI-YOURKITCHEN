import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { signSession, sessionCookieHeader } from "@/lib/auth";
import { writeLog } from "@/lib/log";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password)
    return Response.json({ error: "Email e password obrigatórios" }, { status: 400 });

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
  if (error || !data.user)
    return Response.json({ error: "Credenciais incorrectas", detail: error?.message }, { status: 401 });

  const { data: staff, error: staffErr } = await supabaseAdmin
    .from("staff")
    .select("id, name, role, active")
    .eq("email", email)
    .single();

  if (staffErr || !staff)
    return Response.json({ error: "Gestor não encontrado na tabela staff" }, { status: 403 });

  if (!staff.active)
    return Response.json({ error: "Conta inactiva" }, { status: 403 });
  if (staff.role !== "manager")
    return Response.json({ error: "Sem permissão de gestor" }, { status: 403 });

  const token = await signSession({ id: staff.id, name: staff.name, role: "manager" });
  await writeLog("ACTION", "AUTH", `Login gestor: ${staff.name}`, staff.id);

  const res = Response.json({ ok: true, user: { id: staff.id, name: staff.name, role: staff.role } });
  res.headers.set("Set-Cookie", sessionCookieHeader(token));
  return res;
}
