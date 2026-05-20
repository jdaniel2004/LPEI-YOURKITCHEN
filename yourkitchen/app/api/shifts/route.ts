import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeLog } from "@/lib/log";

export async function POST(req: Request) {
  const staffId = req.headers.get("x-session-id");
  const body = await req.json();
  const { fundo_value } = body;

  if (fundo_value == null)
    return Response.json({ error: "fundo_value obrigatório" }, { status: 400 });

  // Close any open shift for this staff member first
  await supabaseAdmin
    .from("shifts")
    .update({ closed_at: new Date().toISOString() })
    .eq("staff_id", staffId)
    .is("closed_at", null);

  const { data, error } = await supabaseAdmin
    .from("shifts")
    .insert({ staff_id: staffId, fundo_value })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await writeLog("ACTION", "POS", `Turno aberto — Fundo €${fundo_value}`, staffId);
  return Response.json(data, { status: 201 });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const staffId = req.headers.get("x-session-id");
  const open = searchParams.get("open");

  let query = supabaseAdmin
    .from("shifts")
    .select("*, staff:staff(id,name)")
    .order("opened_at", { ascending: false })
    .limit(50);

  if (open === "true") {
    query = query.eq("staff_id", staffId!).is("closed_at", null);
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
