import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Service-role client — only used server-side in Route Handlers.
// NEVER import this in client components.
// Deferred instantiation: the client is created on first use, not at module
// load time, so the Vercel build phase (which evaluates modules without
// runtime env vars) doesn't crash with "supabaseUrl is required".
function makeClient(): SupabaseClient {
  return createClient(
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
}

let _client: SupabaseClient | null = null;
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get: (_t, prop) => (_client ??= makeClient())[prop as keyof SupabaseClient],
});
