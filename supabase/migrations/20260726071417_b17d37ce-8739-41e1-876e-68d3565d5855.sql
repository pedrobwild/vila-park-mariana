alter table public.crm_settings
  add column if not exists proposal_incc_monthly numeric not null default 0.0045,
  add column if not exists proposal_default_monthly_count integer not null default 15,
  add column if not exists proposal_default_down_pct numeric not null default 10,
  add column if not exists proposal_default_keys_pct numeric not null default 75,
  add column if not exists proposal_balloon_every_months integer not null default 6,
  add column if not exists proposal_validity_days integer not null default 15;