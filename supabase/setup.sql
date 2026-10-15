-- Referencia de lo que ya está aplicado en el proyecto "Lean Importados" (Supabase > SQL Editor).
-- Si algún día armás otro proyecto desde cero: crear la tabla public.productos (ver columnas en el README del proyecto) y ejecutar esto.

-- 1) Productos: el público ve solo lo publicado; los usuarios con sesión administran todo.
alter table public.productos enable row level security;
create policy "publico ve publicados" on public.productos for select to anon, authenticated using (estado = true);
create policy "admin ve todo"        on public.productos for select to authenticated using (true);
create policy "admin inserta"        on public.productos for insert to authenticated with check (true);
create policy "admin edita"          on public.productos for update to authenticated using (true) with check (true);
create policy "admin elimina"        on public.productos for delete to authenticated using (true);

-- 2) Métricas: cualquiera REGISTRA (visita / click en "Comprar por WhatsApp"), solo el admin con sesión LEE.
create table public.visitas (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  visitor_id text not null check (char_length(visitor_id) between 8 and 64),
  path text check (char_length(path) <= 200)
);
create table public.clicks_pedidos (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  producto_id bigint,
  producto_nombre text not null check (char_length(producto_nombre) <= 200),
  categoria text check (char_length(categoria) <= 50),
  talle text check (char_length(talle) <= 30),
  visitor_id text check (char_length(visitor_id) <= 64)
);
create index on public.visitas (created_at);
create index on public.clicks_pedidos (created_at);
alter table public.visitas enable row level security;
alter table public.clicks_pedidos enable row level security;
create policy "cualquiera registra visita" on public.visitas for insert to anon, authenticated with check (true);
create policy "admin lee visitas"          on public.visitas for select to authenticated using (true);
create policy "cualquiera registra click"  on public.clicks_pedidos for insert to anon, authenticated with check (true);
create policy "admin lee clicks"           on public.clicks_pedidos for select to authenticated using (true);

-- 3) Resumen del dashboard (hora de Argentina). Función dash_resumen(desde date, hasta date): ver Supabase > Database > Functions.
-- Recordá: Authentication > desactivar "Allow new users to sign up" para que nadie se cree una cuenta de administrador.
