import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "ros_session";

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET não definido");
  return new TextEncoder().encode(s);
}

const PUBLIC_PREFIXES = ["/api/auth", "/_next", "/favicon.ico"];

const ROLE_ALLOWED: Record<string, string[]> = {
  manager: ["/api/staff", "/api/tables", "/api/menu", "/api/orders", "/api/kds",
             "/api/reservations", "/api/campaigns", "/api/shifts", "/api/logs",
             "/api/analytics", "/api/settings", "/api/zones", "/api/ingredients",
             "/api/combos"],
  waiter:  ["/api/tables", "/api/menu", "/api/orders", "/api/reservations",
             "/api/combos", "/api/ingredients", "/api/shifts"],
  kitchen: ["/api/kds", "/api/orders"],
};

const ROLE_FALLBACK: Record<string, string> = {
  manager: "/api/analytics/summary",
  waiter:  "/api/tables",
  kitchen: "/api/kds/tickets",
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths without auth
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Only gate /api/* routes (frontend is a single SPA served from /)
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const role = payload.role as string;
    const allowed = ROLE_ALLOWED[role] ?? [];
    const hasAccess = allowed.some((prefix) => pathname.startsWith(prefix));

    if (!hasAccess) {
      return Response.json(
        { error: "Sem permissão para este recurso" },
        { status: 403 }
      );
    }

    // Attach session info as request headers for downstream handlers
    const req = NextResponse.next();
    req.headers.set("x-session-id", payload.id as string);
    req.headers.set("x-session-name", payload.name as string);
    req.headers.set("x-session-role", role);
    return req;
  } catch {
    return Response.json({ error: "Sessão inválida ou expirada" }, { status: 401 });
  }
}

export const config = {
  matcher: ["/api/:path*"],
};
