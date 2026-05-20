import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeLog } from "@/lib/log";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staffId = req.headers.get("x-session-id");

  const { data, error } = await supabaseAdmin
    .from("shifts")
    .update({ closed_at: new Date().toISOString() })
    .eq("id", id)
    .is("closed_at", null)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "Turno não encontrado ou já fechado" }, { status: 404 });

  await writeLog("ACTION", "POS", "Turno fechado", staffId);
  return Response.json(data);
}
