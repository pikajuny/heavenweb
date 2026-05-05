create table if not exists public.lounge_admins (
  email text primary key,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

create table if not exists public.lounge_notepad (
  date_key date primary key,
  opponent text not null default '',
  line1 text not null default '',
  line2 text not null default '',
  line3 text not null default '',
  updated_by_email text,
  updated_at timestamptz not null default now()
);

create table if not exists public.lounge_notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  author_email text not null,
  author_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists lounge_notices_visible_created_idx
  on public.lounge_notices (created_at desc)
  where deleted_at is null;

create or replace function public.set_lounge_notices_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lounge_notices_set_updated_at on public.lounge_notices;
create trigger lounge_notices_set_updated_at
before update on public.lounge_notices
for each row
execute function public.set_lounge_notices_updated_at();

-- 운영자 3명은 아래처럼 추가하세요.
-- insert into public.lounge_admins (email) values
--   ('operator1@example.com'),
--   ('operator2@example.com'),
--   ('operator3@example.com')
-- on conflict (email) do nothing;
