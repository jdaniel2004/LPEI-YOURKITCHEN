import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeLog } from "@/lib/log";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  const { id, lineId } = await params;
  const staffId = req.headers.get("x-session-id");
  const body = await req.json();
  const { cancel_note, cancelled } = body;

  const patch: Record<string, unknown> = {};
  if (cancelled !== undefined) patch.cancelled = cancelled;
  if (cancel_note !== undefined) patch.cancel_note = cancel_note;

  const { data, error } = await supabaseAdmin
    .from("order_lines")
    .update(patch)
    .eq("id", lineId)
    .eq("order_id", id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (cancelled) {
    await writeLog(
      "CANCEL",
      "POS",
      `Item anulado: ${data.name} (encomenda ${id.slice(0, 8)})`,
      staffId,
      cancel_note ?? null
    );
  }

  return Response.json(data);
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  const { id, lineId } = await params;
  const { error } = await supabaseAdmin
    .from("order_lines")
    .delete()
    .eq("id", lineId)
    .eq("order_id", id)
    .eq("sent", false);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
