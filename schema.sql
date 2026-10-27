create table if not exists records (
  id          bigserial primary key,
  entry_no    integer unique,            -- the "14", "15"... you type at the start
  title       text not null,
  category    text not null default 'Other',   -- Purchase / Repair / Supplies / Other
  record_date date not null,
  total       numeric(12,2) not null,
  currency    text not null default 'USD',
  items       jsonb not null default '[]',     -- [{name,spec,qty,unit_price,amount}]
  note        text,
  warnings    jsonb not null default '[]',
  raw_text    text,
  created_at  timestamptz not null default now()
);
create index if not exists records_date_idx on records (record_date);
