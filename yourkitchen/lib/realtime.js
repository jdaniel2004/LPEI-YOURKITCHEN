import { getSupabaseBrowser } from "@/lib/supabase/browser";

/**
 * Subscribe to Supabase Realtime (WebSocket) postgres_changes on `tables`.
 *
 * Replaces the old HTTP polling (`setInterval`) used for live POS↔KDS sync.
 * `onSync` is called:
 *   - once the channel reaches SUBSCRIBED — this drives the initial load AND a
 *     re-sync after a dropped socket reconnects (Realtime does NOT replay events
 *     missed while disconnected, so we always re-fetch on (re)connect); and
 *   - on every insert/update/delete, debounced so a burst (e.g. an order plus its
 *     many order_lines committed together) collapses into a single re-fetch.
 *
 * This satisfies RF19 (pedidos em tempo real) and RNF1 (POS↔KDS em <1s): a change
 * pushes over WSS instead of waiting up to the old 4–8s polling interval.
 *
 * The listed tables must belong to the `supabase_realtime` publication — see
 * `supabase/enable_realtime.sql`. Read access is governed by RLS (anon read
 * policies for orders/order_lines/tables live in `supabase/schema.sql`).
 *
 * @param {string[]} tables - Public table names to watch.
 * @param {() => void} onSync - Re-fetch callback (reuses the existing API loaders).
 * @param {{ debounceMs?: number, name?: string }} [opts]
 * @returns {() => void} Unsubscribe — call on effect cleanup.
 */
export function subscribeRealtime(tables, onSync, { debounceMs = 200, name } = {}) {
  const supabase = getSupabaseBrowser();
  let timer = null;
  const fire = () => {
    clearTimeout(timer);
    timer = setTimeout(onSync, debounceMs);
  };

  const channel = supabase.channel(name || `rt:${tables.join("-")}`);
  for (const table of tables) {
    channel.on("postgres_changes", { event: "*", schema: "public", table }, fire);
  }
  channel.subscribe(status => {
    // Initial sync + re-sync after a reconnect.
    if (status === "SUBSCRIBED") onSync();
  });

  return () => {
    clearTimeout(timer);
    supabase.removeChannel(channel);
  };
}
