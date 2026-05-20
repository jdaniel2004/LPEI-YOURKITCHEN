import { createClient } from "@supabase/supabase-js";

// Service-role client — only used server-side in Route Handlers.
// NEVER import this in client components.
// global.fetch override disables Next.js App Router fetch caching for Supabase queries.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: (url: RequestInfo | URL, options?: RequestInit) =>
        fetch(url, { ...options, cache: "no-store" }),
    },
  }
);
