import { clearCookieHeader, getSession } from "@/lib/auth";
import { writeLog } from "@/lib/log";

export async function POST() {
  const session = await getSession();
  if (session) {
    await writeLog("ACTION", "AUTH", `Logout: ${session.name}`, session.id);
  }
  const res = Response.json({ ok: true });
  res.headers.set("Set-Cookie", clearCookieHeader());
  return res;
}
