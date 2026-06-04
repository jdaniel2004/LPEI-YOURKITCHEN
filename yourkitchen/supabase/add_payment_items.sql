-- ─────────────────────────────────────────────────────────────────────────────
-- RestaurantOS — Detalhe de itens por pagamento (divisão "Por Itens")
-- Colar no Supabase SQL Editor e executar
-- ─────────────────────────────────────────────────────────────────────────────

-- Guarda que itens/unidades foram liquidados em cada transação de pagamento.
-- Formato: [{ "name": "...", "qty": 2, "unit_price": 8.00, "extra_price": 0 }]
-- NULL  = pagamento do pedido inteiro (conta completa / divisão por pessoas).
alter table payments add column if not exists items jsonb;
