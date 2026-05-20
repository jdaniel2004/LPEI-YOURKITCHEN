import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("key, value");

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Convert rows to a flat key → value object for convenience
  const flat: Record<string, unknown> = {};
  for (const row of data ?? []) flat[row.key] = row.value;
  return Response.json(flat);
}
