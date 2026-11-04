-- Creativity Corner record book. The website talks to this through a
-- private function. These tables are not open to the public internet.

create table if not exists public.users (
    id text primary key,
    name text not null,
    age text,
    email text not null unique,
    language text,
    font_size text,
    joined_date text,
    completed_activities text not null default '[]',
    updated_at text,
    username text,
    password_hash text,
    must_change_password integer not null default 0
);

create table if not exists public.sessions (
    token text primary key,
    user_id text not null,
    expires_at text not null
);

create table if not exists public.consents (
    user_id text primary key,
    consent_json text not null,
    saved_at text
);

create table if not exists public.submissions (
    user_id text not null,
    activity_id integer not null,
    responses_json text not null,
    completed_activities text not null default '[]',
    metadata_json text not null default '{}',
    saved_at text,
    primary key (user_id, activity_id)
);

alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.consents enable row level security;
alter table public.submissions enable row level security;

insert into storage.buckets (id, name, public)
values ('drawings', 'drawings', false)
on conflict (id) do nothing;
