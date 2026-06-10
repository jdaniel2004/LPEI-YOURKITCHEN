-- ─── REALTIME (WebSocket) ─────────────────────────────────────────────────────
-- Adiciona as tabelas do caminho crítico POS↔KDS à publicação `supabase_realtime`,
-- para que o cliente receba alterações por WebSocket (WSS) em vez de fazer polling
-- HTTP. Satisfaz RF19 (pedidos em tempo real) e RNF1 (sincronização em <1s).
--
-- A leitura é controlada por RLS: as políticas "anon read orders/order_lines/tables"
-- já existem em schema.sql. Idempotente — pode ser executado mais do que uma vez.
-- Executar uma vez na base de dados do projeto (SQL Editor do Supabase).
do $$
declare
  t text;
begin
  foreach t in array array['orders', 'order_lines', 'tables'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Nota: os eventos DELETE via Realtime só transportam a linha OLD completa quando a
-- replica identity é FULL (por omissão é só a chave primária). O POS/KDS apenas
-- precisam do id da linha alterada para despoletar um re-fetch, por isso a identidade
-- por omissão é suficiente. Descomentar se vier a ser necessário filtrar por outras
-- colunas de linhas eliminadas:
-- alter table public.orders      replica identity full;
-- alter table public.order_lines replica identity full;
-- alter table public.tables      replica identity full;
