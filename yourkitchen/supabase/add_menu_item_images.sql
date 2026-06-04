-- ─────────────────────────────────────────────────────────────────────────────
-- RestaurantOS — Imagens de produtos
-- Colar no Supabase SQL Editor e executar
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Coluna para o URL público da imagem do produto
alter table menu_items add column if not exists image_url text;

-- 2. Bucket de Storage público para as imagens dos produtos
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do update set public = true;

-- 3. Leitura pública dos ficheiros do bucket (o upload é feito server-side com
--    a service-role key, que ignora RLS — só precisamos de permitir o SELECT).
drop policy if exists "menu-images public read" on storage.objects;
create policy "menu-images public read"
  on storage.objects for select
  using (bucket_id = 'menu-images');
