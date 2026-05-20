import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("staff")
    .select("id, name, role, active, created_at")
    .order("name");

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, role, pin } = body;

  if (!name || !role || !pin)
    return Response.json({ error: "name, role e pin obrigatórios" }, { status: 400 });
  if (!["manager", "waiter", "kitchen"].includes(role))
    return Response.json({ error: "role inválido" }, { status: 400 });
  if (String(pin).length !== 4)
    return Response.json({ error: "PIN deve ter 4 dígitos" }, { status: 400 });

  const pin_hash = await bcrypt.hash(String(pin), 10);

  const { data, error } = await supabaseAdmin
    .from("staff")
    .insert({ name, role, pin_hash })
    .select("id, name, role, active, created_at")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
