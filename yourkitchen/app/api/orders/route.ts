import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status  = searchParams.get("status");
  const tableId = searchParams.get("table_id");
  const limit   = parseInt(searchParams.get("limit") ?? "100");

  let query = supabaseAdmin
    .from("orders")
    .select("*, table:tables(id,label), waiter:staff(id,name), lines:order_lines(*)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status)  query = query.eq("status", status);
  if (tableId) query = query.eq("table_id", tableId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req: Request) {
  const staffId = req.headers.get("x-session-id");
  const body = await req.json();
  const { table_id, type, notes } = body;

  const { data, error } = await supabaseAdmin
    .from("orders")
    .insert({ table_id: table_id ?? null, type: type ?? "table", waiter_id: staffId, notes })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (table_id) {
    // If the table was reserved, the guests have now arrived and ordered, so
    // confirm the earliest pending reservation for this table.
    const { data: tbl } = await supabaseAdmin
      .from("tables")
      .select("status")
      .eq("id", table_id)
      .single();

    if (tbl?.status === "reserved") {
      const { data: resv } = await supabaseAdmin
        .from("reservations")
        .select("id")
        .eq("table_id", table_id)
        .eq("status", "pending")
        .order("date")
        .order("time")
        .limit(1);
      if (resv && resv.length > 0) {
        await supabaseAdmin
          .from("reservations")
          .update({ status: "confirmed" })
          .eq("id", resv[0].id);
      }
    }

    // Mark table as occupied
    await supabaseAdmin
      .from("tables")
      .update({ status: "occupied" })
      .eq("id", table_id);
  }

  return Response.json(data, { status: 201 });
}
