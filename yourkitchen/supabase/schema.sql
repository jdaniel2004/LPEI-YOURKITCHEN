-- ─────────────────────────────────────────────────────────────────────────────
-- RestaurantOS — Schema completo
-- Colar no Supabase SQL Editor e executar
-- ─────────────────────────────────────────────────────────────────────────────

-- STAFF
create table if not exists staff (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  role        text not null check (role in ('manager','waiter','kitchen')),
  email       text unique,             -- só gestores têm email (Supabase Auth)
  pin_hash    text not null,
  active      boolean default true,
  created_at  timestamptz default now()
);

-- ZONES
create table if not exists zones (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique
);

-- TABLES
create table if not exists tables (
  id          uuid primary key default gen_random_uuid(),
  label       text not null unique,
  zone_id     uuid references zones(id),
  seats       int default 4,
  status      text default 'free' check (status in ('free','occupied','bill','reserved','locked')),
  locked_by   uuid references staff(id),
  locked_at   timestamptz
);

-- MENU CATEGORIES
create table if not exists menu_categories (
  id       uuid primary key default gen_random_uuid(),
  name     text not null,
  emoji    text,
  position int default 0
);

-- MENU ITEMS
create table if not exists menu_items (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid references menu_categories(id) on delete cascade,
  name        text not null,
  emoji       text,
  price       numeric(8,2) not null,
  vat_rate    int not null default 23,
  stock       int,
  active      boolean default true,
  created_at  timestamptz default now()
);

-- ITEM MODIFIERS
create table if not exists item_modifiers (
  id       uuid primary key default gen_random_uuid(),
  item_id  uuid references menu_items(id) on delete cascade,
  name     text not null,
  required boolean default false,
  position int default 0
);

create table if not exists modifier_options (
  id          uuid primary key default gen_random_uuid(),
  modifier_id uuid references item_modifiers(id) on delete cascade,
  label       text not null,
  extra_price numeric(6,2) default 0
);

-- RESERVATIONS
create table if not exists reservations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text,
  date       date not null,
  time       time not null,
  persons    int not null,
  table_id   uuid references tables(id),
  notes      text,
  status     text default 'pending' check (status in ('pending','confirmed','cancelled','seated')),
  created_at timestamptz default now()
);

-- CAMPAIGNS
create table if not exists campaigns (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  type         text not null check (type in ('percent','fixed')),
  value        numeric(6,2) not null,
  target       text not null check (target in ('all','category','item','combo')),
  target_id    uuid,
  days         int[] default '{1,2,3,4,5,6,7}',
  start_time   time default '00:00',
  end_time     time default '23:59',
  active       boolean default true,
  created_at   timestamptz default now()
);

-- ORDERS
create table if not exists orders (
  id             uuid primary key default gen_random_uuid(),
  table_id       uuid references tables(id),
  type           text default 'table' check (type in ('table','takeaway','counter')),
  waiter_id      uuid references staff(id),
  notes          text,
  status         text default 'open' check (status in ('open','sent','bill','paid','cancelled')),
  discount_id    uuid references campaigns(id),
  discount_value numeric(8,2) default 0,
  created_at     timestamptz default now(),
  paid_at        timestamptz
);

-- ORDER LINES
create table if not exists order_lines (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid references orders(id) on delete cascade,
  item_id      uuid references menu_items(id),
  name         text not null,
  qty          int not null default 1,
  unit_price   numeric(8,2) not null,
  extra_price  numeric(6,2) default 0,
  vat_rate     int not null,
  modifiers    text[],
  notes        text,
  sent         boolean default false,
  sent_batch   int not null default 0,
  cancelled    boolean default false,
  cancel_note  text,
  created_at   timestamptz default now()
);

-- PAYMENTS
create table if not exists payments (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid references orders(id),
  method     text not null check (method in ('numerario','cartao','mbway','multibanco')),
  amount     numeric(8,2) not null,
  split_n    int default 1,
  created_at timestamptz default now()
);

-- SHIFTS
create table if not exists shifts (
  id           uuid primary key default gen_random_uuid(),
  staff_id     uuid references staff(id),
  fundo_value  numeric(8,2) default 0,
  opened_at    timestamptz default now(),
  closed_at    timestamptz
);

-- SYSTEM LOGS
create table if not exists system_logs (
  id         bigserial primary key,
  level      text not null check (level in ('INFO','WARN','ERROR','ACTION','CANCEL')),
  module     text not null check (module in ('POS','KDS','BACKOFFICE','AUTH')),
  staff_id   uuid references staff(id),
  message    text not null,
  comment    text,
  created_at timestamptz default now()
);

-- SETTINGS
create table if not exists settings (
  key   text primary key,
  value jsonb not null
);

insert into settings (key, value) values
  ('restaurant', '{"name":"RestaurantOS","address":"","phone":"","email":"","nif":""}'),
  ('fiscal',     '{"rates":[{"value":6,"active":true},{"value":13,"active":true},{"value":23,"active":true}]}'),
  ('kds',        '{"alertYellow":5,"alertRed":12,"autoRefresh":3}'),
  ('caixa',      '{"defaultFundo":100,"maxTurnoHours":12,"confirmAbertura":true}'),
  ('horario.turnos', '[{"id":"t1","name":"Almoço","start":"11:30","end":"15:00"},{"id":"t2","name":"Jantar","start":"18:30","end":"22:00"}]')
on conflict (key) do nothing;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table staff           enable row level security;
alter table tables          enable row level security;
alter table menu_items      enable row level security;
alter table orders          enable row level security;
alter table order_lines     enable row level security;
alter table system_logs     enable row level security;
alter table reservations    enable row level security;
alter table campaigns       enable row level security;
alter table payments        enable row level security;
alter table shifts          enable row level security;

-- Anon pode ler orders/order_lines/tables para Realtime no cliente
create policy "anon read orders"      on orders      for select using (true);
create policy "anon read order_lines" on order_lines for select using (true);
create policy "anon read tables"      on tables      for select using (true);

-- Realtime (WebSocket): publica o caminho crítico POS↔KDS para sincronização em
-- <1s (RNF1) em vez de polling HTTP. Em bases já existentes correr enable_realtime.sql.
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_lines;
alter publication supabase_realtime add table tables;

-- ─── FUNÇÃO: decrement_stock ──────────────────────────────────────────────────
create or replace function decrement_stock(p_item_id uuid, p_qty int)
returns void language plpgsql as $$
begin
  update menu_items
  set    stock = stock - p_qty
  where  id = p_item_id
    and  stock is not null
    and  stock >= p_qty;
end;
$$;

-- ─── SEED ─────────────────────────────────────────────────────────────────────

insert into zones (name) values ('Interior'), ('Esplanada'), ('Bar')
on conflict (name) do nothing;

insert into tables (label, zone_id, seats) values
  ('M1', (select id from zones where name='Interior'), 4),
  ('M2', (select id from zones where name='Interior'), 2),
  ('M3', (select id from zones where name='Interior'), 4),
  ('M4', (select id from zones where name='Interior'), 6),
  ('M5', (select id from zones where name='Interior'), 2),
  ('M6', (select id from zones where name='Interior'), 4),
  ('M7', (select id from zones where name='Interior'), 8),
  ('M8', (select id from zones where name='Interior'), 4),
  ('E1', (select id from zones where name='Esplanada'), 4),
  ('E2', (select id from zones where name='Esplanada'), 4),
  ('E3', (select id from zones where name='Esplanada'), 2),
  ('E4', (select id from zones where name='Esplanada'), 6),
  ('B1', (select id from zones where name='Bar'), 0),
  ('B2', (select id from zones where name='Bar'), 0)
on conflict (label) do nothing;

-- ─── SEED STAFF (hashes de bcrypt para PINs: 1234, 5678, 9012, 3456) ─────────
-- Gerar os hashes reais com: node -e "const b=require('bcryptjs');console.log(b.hashSync('1234',10))"
-- e substituir abaixo antes de executar

insert into staff (name, role, pin_hash, active) values
  ('Sofia',   'waiter',  '$2b$10$7kuX0JL0DlZHZhrSVYis8.TjjX3Ei3uAORkz3hK24N81Dzv2lRm1K', true),
  ('João',    'waiter',  '$2b$10$iqg.UY3Ebn6VcKsKfL0K3.155EAa8EuksOOef8.JogwV8/tsqncSC', true),
  ('Mariana', 'waiter',  '$2b$10$bTUBRPK3pxe97mMaGXh68erKDCHOckeE8/vfp3QyOPpwO2PXu8zTa', true),
  ('Rui',     'kitchen', '$2b$10$uR8SDcYOhMcA/LwbhrICP.YxwjCd73JbFEkTEfBWB0Dm.yQ4VcbL6', true)
on conflict do nothing;

-- ─── MIGRATIONS ───────────────────────────────────────────────────────────────
-- Run ALL of these in Supabase SQL Editor if upgrading an existing database

-- Per-line delivered flag: set when the KDS marks the order "Pronto" (bill).
-- Lets a previous batch keep its "entregue" state when a new batch is sent.
alter table order_lines add column if not exists delivered boolean not null default false;

-- When the KDS marked the line ready. Prep time = ready_at - created_at.
-- Also lets the KDS freeze the ticket timer once it's "Pronto".
alter table order_lines add column if not exists ready_at timestamptz;

-- Ingredient modifiers: ingredients the customer can add/remove on a per-item basis
alter table ingredients add column if not exists is_modifier boolean not null default false;

-- Function to decrement ingredient stock when an order is sent
create or replace function decrement_ingredient_stock(p_ingredient_id uuid, p_qty numeric)
returns void language plpgsql as $$
begin
  update ingredients
  set    stock_qty = stock_qty - p_qty
  where  id = p_ingredient_id
    and  stock_qty is not null
    and  stock_qty >= p_qty;
end;
$$;

-- ─── REUSABLE MODIFIER LIBRARY ────────────────────────────────────────────────
-- Define a modifier once (e.g. "Com ovo +1€") and link it to many menu items.
-- Editing the template updates every linked item (synchronised).
create table if not exists modifier_templates (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  required   boolean default false,
  created_at timestamptz default now()
);

create table if not exists modifier_template_options (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid references modifier_templates(id) on delete cascade,
  label       text not null,
  extra_price numeric(6,2) default 0
);

-- Junction: which library modifiers are attached to which menu items
create table if not exists item_modifier_templates (
  item_id     uuid references menu_items(id) on delete cascade,
  template_id uuid references modifier_templates(id) on delete cascade,
  primary key (item_id, template_id)
);

-- ─── INGREDIENT-AWARE MODIFIER OPTIONS ────────────────────────────────────────
-- A modifier option can optionally consume a set quantity of an ingredient
-- (e.g. "Espiral 200g" → 200g of Massa Espiral). Selecting it deducts that
-- amount from stock on top of the item's base recipe (dynamic ingredients).
alter table modifier_options          add column if not exists ingredient_id   uuid references ingredients(id) on delete set null;
alter table modifier_options          add column if not exists ingredient_qty  numeric(10,3);
alter table modifier_options          add column if not exists ingredient_unit text;
alter table modifier_template_options add column if not exists ingredient_id   uuid references ingredients(id) on delete set null;
alter table modifier_template_options add column if not exists ingredient_qty  numeric(10,3);
alter table modifier_template_options add column if not exists ingredient_unit text;

-- Per-line ingredient deltas from selected modifier options: [{ingredient_id, qty}]
alter table order_lines add column if not exists modifier_ingredients jsonb;

-- Per-line paid quantity: how many units of the line are already settled. Lets a
-- bill be paid item-by-item (per unit) across several partial payments. A line is
-- fully paid when paid_qty >= qty; the order closes once every line is fully paid.
alter table order_lines add column if not exists paid_qty int not null default 0;

-- ─── DROP COMBOS / MENUS (opcional) ───────────────────────────────────────────
-- A funcionalidade de "Menus" (combos) foi removida. Correr este bloco no
-- Supabase SQL Editor para limpar os artefactos relacionados na base de dados.
-- alter table order_lines      drop column if exists combo_id;
-- drop table  if exists combo_modifier_links;
-- drop table  if exists combo_modifier_options;
-- drop table  if exists combo_modifiers;
-- drop table  if exists combo_items;
-- drop table  if exists combos;
