-- ─────────────────────────────────────────────────────────────────────────────
-- RestaurantOS — Modificadores de escolha única ("apenas escolher um")
-- Colar no Supabase SQL Editor e executar
-- ─────────────────────────────────────────────────────────────────────────────

-- Quando true, o POS só permite escolher UMA opção do grupo (comportamento radio).
alter table item_modifiers     add column if not exists single boolean default false;
alter table modifier_templates add column if not exists single boolean default false;
