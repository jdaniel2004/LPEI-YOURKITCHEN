import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeLog } from "@/lib/log";

export async function GET(_: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("key, value")
    .eq("key", key)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 404 });
  return Response.json(data.value);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const staffId = req.headers.get("x-session-id");
  const body = await req.json();
  const { value } = body;

  if (value === undefined)
    return Response.json({ error: "value obrigatório" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("settings")
    .upsert({ key, value })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await writeLog("ACTION", "BACKOFFICE", `Configuração alterada: ${key}`, staffId);
  return Response.json(data);
}
