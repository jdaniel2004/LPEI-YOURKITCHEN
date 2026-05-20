import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date   = searchParams.get("date");
  const status = searchParams.get("status");

  let query = supabaseAdmin
    .from("reservations")
    .select("*, table:tables(id,label)")
    .order("date")
    .order("time");

  if (date)   query = query.eq("date", date);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, phone, date, time, persons, table_id, notes } = body;

  if (!name || !date || !time || !persons)
    return Response.json({ error: "name, date, time e persons obrigatórios" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("reservations")
    .insert({ name, phone, date, time, persons, table_id: table_id ?? null, notes })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (table_id) {
    await supabaseAdmin.from("tables").update({ status: "reserved" }).eq("id", table_id);
  }

  return Response.json(data, { status: 201 });
}
