import { supabaseAdmin } from "./supabase/admin";

type Level = "INFO" | "WARN" | "ERROR" | "ACTION" | "CANCEL";
type Module = "POS" | "KDS" | "BACKOFFICE" | "AUTH";

export async function writeLog(
  level: Level,
  module: Module,
  message: string,
  staffId?: string | null,
  comment?: string | null
) {
  await supabaseAdmin.from("system_logs").insert({
    level,
    module,
    message,
    staff_id: staffId ?? null,
    comment: comment ?? null,
  });
}
