-- ZiJi beta reports (src/report/outbox.ts): one insert-only table. Run once in Supabase → SQL Editor.
-- The app only ever inserts; nobody with the public key can read, change or delete rows.

create table public.reports (
  id         bigint generated always as identity primary key,
  received   timestamptz not null default now(),
  kind       text not null check (kind in ('error', 'mistake', 'lesson', 'note')),
  at         timestamptz not null,
  device     text not null check (char_length(device) between 1 and 64),
  version    text not null check (char_length(version) <= 40),
  platform   text check (char_length(platform) <= 20),
  body       jsonb not null check (pg_column_size(body) < 8192)
);
create index reports_device_received on public.reports (device, received);
create index reports_kind_received on public.reports (kind, received desc);

alter table public.reports enable row level security;
create policy "app inserts reports" on public.reports for insert to anon with check (true);
-- no select/update/delete policy: the public key can only add rows

-- A runaway or abused device: at most 300 rows a day each.
create function public.reports_cap() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.reports where device = new.device and received > now() - interval '1 day') >= 300 then
    raise exception 'report cap reached';
  end if;
  return new;
end $$;
create trigger reports_cap before insert on public.reports for each row execute function public.reports_cap();
