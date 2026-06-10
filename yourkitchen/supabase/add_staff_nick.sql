-- ─────────────────────────────────────────────────────────────────────────────
-- RestaurantOS — Nick de login do funcionário
-- Colar no Supabase SQL Editor e executar (base já existente)
-- ─────────────────────────────────────────────────────────────────────────────

-- Nick de login, distinto do nome e configurável no Backoffice. O login do
-- POS/Cozinha passa a ser feito com nick + PIN (em vez do nome).
alter table staff add column if not exists nick text;

-- Backfill: usa o nome atual como nick inicial, para que os funcionários
-- existentes continuem a conseguir autenticar-se até o gestor definir um nick.
update staff set nick = name where nick is null;
