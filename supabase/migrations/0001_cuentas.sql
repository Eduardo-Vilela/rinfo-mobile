-- R-Info: perfiles de usuario, registro de accesos y eliminación de cuenta.
-- Pegar completo en Supabase → SQL Editor → Run (se puede correr más de una vez).

create table if not exists public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  nombre text,
  proveedor text,
  creado timestamptz not null default now(),
  ultimo_acceso timestamptz not null default now(),
  accesos integer not null default 1
);

alter table public.perfiles enable row level security;

drop policy if exists "cada uno ve su perfil" on public.perfiles;
create policy "cada uno ve su perfil" on public.perfiles
  for select to authenticated using ((select auth.uid()) = id);

-- Crea el perfil al registrarse (Google, Apple o email).
create or replace function public.crear_perfil()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id, email, nombre, proveedor)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_app_meta_data ->> 'provider'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.crear_perfil();

-- La app la llama al abrirse con sesión: cuenta accesos y guarda el último.
create or replace function public.registrar_acceso()
returns void language plpgsql security definer set search_path = '' as $$
declare
  u auth.users;
begin
  select * into u from auth.users where id = auth.uid();
  if u.id is null then return; end if;
  insert into public.perfiles (id, email, nombre, proveedor)
  values (u.id, u.email, coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'), u.raw_app_meta_data ->> 'provider')
  on conflict (id) do update
    set ultimo_acceso = now(),
        accesos = public.perfiles.accesos + 1,
        nombre = coalesce(public.perfiles.nombre, excluded.nombre);
end;
$$;

-- "Eliminar cuenta" (App Store 5.1.1(v) y Google Play): borra el usuario; el perfil se va en cascada.
create or replace function public.eliminar_cuenta()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Sin sesión';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.registrar_acceso() from public, anon;
revoke all on function public.eliminar_cuenta() from public, anon;
grant execute on function public.registrar_acceso() to authenticated;
grant execute on function public.eliminar_cuenta() to authenticated;

-- Para vos: cuántos usan la app (correr en el SQL Editor cuando quieras).
create or replace view public.uso_resumen with (security_invoker = true) as
select
  count(*) as usuarios,
  count(*) filter (where ultimo_acceso > now() - interval '1 day') as activos_24h,
  count(*) filter (where ultimo_acceso > now() - interval '7 days') as activos_7d,
  count(*) filter (where creado > now() - interval '7 days') as nuevos_7d
from public.perfiles;
revoke all on public.uso_resumen from anon, authenticated;
