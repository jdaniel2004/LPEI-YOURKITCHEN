import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("staff")
    .select("id, name, nick, role, active, created_at")
    .order("name");

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, nick, role, pin, email, password } = body;

  if (!name || !role)
    return Response.json({ error: "name e role obrigatórios" }, { status: 400 });
  if (!["manager", "waiter", "kitchen"].includes(role))
    return Response.json({ error: "role inválido" }, { status: 400 });
  if (role === "manager" && (!email || !password))
    return Response.json({ error: "Gestores precisam de email e password" }, { status: 400 });
  if (role !== "manager" && !pin)
    return Response.json({ error: "PIN obrigatório" }, { status: 400 });
  if (role !== "manager" && String(pin).length !== 4)
    return Response.json({ error: "PIN deve ter 4 dígitos" }, { status: 400 });

  // Login nick (distinct from the display name). Required for PIN-based roles;
  // managers log in with email so it's optional. Defaults to the name if blank.
  const nickValue = (nick && String(nick).trim()) || name;
  if (role !== "manager" && !nickValue)
    return Response.json({ error: "Nick obrigatório" }, { status: 400 });

  // Managers authenticate via email+password; store an unusable random hash
  // so the column is never null without exposing a real PIN.
  const pin_hash = await bcrypt.hash(
    role === "manager" ? crypto.randomUUID() : String(pin),
    10
  );

  // Managers also authenticate via Supabase Auth (email/password). Create the
  // auth user first so the staff insert references an existing account.
  if (role === "manager") {
    const { error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authErr) return Response.json({ error: `Erro ao criar conta: ${authErr.message}` }, { status: 500 });
  }

  const row: Record<string, unknown> = { name, nick: nickValue, role, pin_hash };
  if (role === "manager") row.email = email;

  const { data, error } = await supabaseAdmin
    .from("staff")
    .insert(row)
    .select("id, name, nick, role, active, created_at")
    .single();

  if (error) {
    // Best-effort: clean up the auth user we just created so we don't orphan it
    if (role === "manager" && email) {
      try {
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const u = users.users.find((x) => x.email === email);
        if (u) await supabaseAdmin.auth.admin.deleteUser(u.id);
      } catch {}
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json(data, { status: 201 });
}
