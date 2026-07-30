-- employees intentionally remains unchanged.
create table if not exists public.leader_reports (
  id uuid primary key default gen_random_uuid(),
  leader_id text not null,
  leader_name text not null,
  report_month date not null check (date_trunc('month', report_month)::date = report_month),
  cases jsonb not null default '[]'::jsonb,
  factors jsonb not null default '[]'::jsonb,
  rewards jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (leader_id, report_month)
);

alter table public.leader_reports enable row level security;
create policy "Anyone can read leader reports" on public.leader_reports for select to anon, authenticated using (true);
create policy "Anyone can create leader reports" on public.leader_reports for insert to anon, authenticated with check (true);
create policy "Anyone can update leader reports" on public.leader_reports for update to anon, authenticated using (true) with check (true);

create or replace function public.set_leader_report_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger leader_reports_updated_at before update on public.leader_reports
for each row execute function public.set_leader_report_updated_at();

create index if not exists leader_reports_month_idx on public.leader_reports (report_month desc);
