-- ==============================================================================
-- HW Review-Fix Board: Supabase Database Schema
-- Idempotent script for tables, RLS policies, functions, and realtime publication
-- ==============================================================================

-- Enable required extension for secure PIN hashing
create extension if not exists pgcrypto with schema extensions;

-- 1. TABLES
create table if not exists public.task_status (
    review_id text not null,
    team text not null,
    status text not null default 'todo',
    assignee text,
    updated_by text,
    updated_at timestamptz not null default now(),
    constraint task_status_pkey primary key (review_id, team),
    constraint task_status_status_check check (status in ('todo', 'working', 'done')),
    constraint task_status_team_check check (team in (
        'software-engineer',
        'game-developer',
        'product-analyst',
        'product-associate',
        'data-analyst',
        'ui-ux-designer',
        'growth-analyst',
        'marketing-associate',
        'founders-office'
    )),
    constraint task_status_review_id_check check (review_id ~ '^[A-Za-z0-9_-]{1,80}$'),
    constraint task_status_assignee_len check (assignee is null or char_length(assignee) <= 40)
);

create table if not exists public.task_notes (
    id bigint generated always as identity primary key,
    review_id text not null,
    team text not null,
    body text not null,
    author text,
    created_at timestamptz not null default now(),
    constraint task_notes_body_len check (char_length(body) between 1 and 500),
    constraint task_notes_author_len check (author is null or char_length(author) <= 40),
    constraint task_notes_team_check check (team in (
        'software-engineer',
        'game-developer',
        'product-analyst',
        'product-associate',
        'data-analyst',
        'ui-ux-designer',
        'growth-analyst',
        'marketing-associate',
        'founders-office'
    ))
);

create table if not exists public.task_activity (
    id bigint generated always as identity primary key,
    review_id text not null,
    team text not null,
    kind text not null,
    from_value text,
    to_value text,
    actor text,
    created_at timestamptz not null default now(),
    constraint task_activity_kind_check check (kind in ('status', 'assignee', 'note')),
    constraint task_activity_actor_len check (actor is null or char_length(actor) <= 40)
);

create table if not exists public.team_pins (
    team text primary key,
    pin_hash text not null,
    constraint team_pins_team_check check (team in (
        'software-engineer',
        'game-developer',
        'product-analyst',
        'product-associate',
        'data-analyst',
        'ui-ux-designer',
        'growth-analyst',
        'marketing-associate',
        'founders-office'
    ))
);

-- 2. ROW LEVEL SECURITY (RLS)
alter table public.task_status enable row level security;
alter table public.task_notes enable row level security;
alter table public.task_activity enable row level security;
alter table public.team_pins enable row level security;

-- Drop existing policies if any to ensure idempotency
drop policy if exists "Allow anon and auth read task_status" on public.task_status;
drop policy if exists "Allow anon and auth read task_notes" on public.task_notes;
drop policy if exists "Allow anon and auth read task_activity" on public.task_activity;
drop policy if exists "Deny all on team_pins" on public.team_pins;

-- Read policies for public tables
create policy "Allow anon and auth read task_status"
    on public.task_status for select
    to anon, authenticated
    using (true);

create policy "Allow anon and auth read task_notes"
    on public.task_notes for select
    to anon, authenticated
    using (true);

create policy "Allow anon and auth read task_activity"
    on public.task_activity for select
    to anon, authenticated
    using (true);

-- NO insert/update/delete policies for anon or authenticated (all writes go through RPC)
-- team_pins has NO select policy for anon/authenticated (strictly unreadable by client)

-- Revoke direct write privileges
revoke insert, update, delete on public.task_status from anon, authenticated;
revoke insert, update, delete on public.task_notes from anon, authenticated;
revoke insert, update, delete on public.task_activity from anon, authenticated;
revoke all on public.team_pins from anon, authenticated;

-- 3. THROTTLE HELPER FUNCTION
create or replace function public.check_rate_limit()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_recent_writes int;
begin
    -- Max 240 writes across all functions in the last 60 seconds
    select count(*)
    into v_recent_writes
    from public.task_activity
    where created_at > now() - interval '60 seconds';

    if v_recent_writes > 240 then
        raise exception 'Global rate limit exceeded (max 240 writes per minute). Please wait.';
    end if;
end;
$$;

-- 4. RPC FUNCTIONS
create or replace function public.verify_team_pin(p_team text, p_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_pin_hash text;
begin
    select pin_hash into v_pin_hash from public.team_pins where team = p_team;
    if v_pin_hash is not null then
        if p_pin is null or extensions.crypt(p_pin, v_pin_hash) != v_pin_hash then
            raise exception 'Invalid PIN for team %', p_team;
        end if;
    end if;
end;
$$;

create or replace function public.set_status(
    p_review_id text,
    p_team text,
    p_status text,
    p_actor text,
    p_pin text default null
)
returns public.task_status
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_prev_status text := 'todo';
    v_row public.task_status;
begin
    -- Rate limit check
    perform public.check_rate_limit();

    -- Validate team
    if p_team not in (
        'software-engineer', 'game-developer', 'product-analyst',
        'product-associate', 'data-analyst', 'ui-ux-designer',
        'growth-analyst', 'marketing-associate', 'founders-office'
    ) then
        raise exception 'Invalid team: %', p_team;
    end if;

    -- Validate status
    if p_status not in ('todo', 'working', 'done') then
        raise exception 'Invalid status: %', p_status;
    end if;

    -- Validate review_id
    if p_review_id is null or not (p_review_id ~ '^[A-Za-z0-9_-]{1,80}$') then
        raise exception 'Invalid review_id: %', p_review_id;
    end if;

    -- Verify PIN if team has one
    perform public.verify_team_pin(p_team, p_pin);

    -- Get previous status if row exists
    select status into v_prev_status from public.task_status
    where review_id = p_review_id and team = p_team;

    -- Upsert status
    insert into public.task_status (review_id, team, status, updated_by, updated_at)
    values (p_review_id, p_team, p_status, p_actor, now())
    on conflict (review_id, team)
    do update set
        status = excluded.status,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at
    returning * into v_row;

    -- Record activity
    insert into public.task_activity (review_id, team, kind, from_value, to_value, actor)
    values (p_review_id, p_team, 'status', coalesce(v_prev_status, 'todo'), p_status, coalesce(p_actor, 'Anonymous'));

    return v_row;
end;
$$;

create or replace function public.set_assignee(
    p_review_id text,
    p_team text,
    p_assignee text,
    p_actor text,
    p_pin text default null
)
returns public.task_status
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_prev_assignee text;
    v_row public.task_status;
begin
    perform public.check_rate_limit();

    if p_team not in (
        'software-engineer', 'game-developer', 'product-analyst',
        'product-associate', 'data-analyst', 'ui-ux-designer',
        'growth-analyst', 'marketing-associate', 'founders-office'
    ) then
        raise exception 'Invalid team: %', p_team;
    end if;

    if p_review_id is null or not (p_review_id ~ '^[A-Za-z0-9_-]{1,80}$') then
        raise exception 'Invalid review_id: %', p_review_id;
    end if;

    if p_assignee is not null and char_length(p_assignee) > 40 then
        raise exception 'Assignee exceeds 40 characters';
    end if;

    perform public.verify_team_pin(p_team, p_pin);

    select assignee into v_prev_assignee from public.task_status
    where review_id = p_review_id and team = p_team;

    insert into public.task_status (review_id, team, assignee, updated_by, updated_at)
    values (p_review_id, p_team, p_assignee, p_actor, now())
    on conflict (review_id, team)
    do update set
        assignee = excluded.assignee,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at
    returning * into v_row;

    insert into public.task_activity (review_id, team, kind, from_value, to_value, actor)
    values (p_review_id, p_team, 'assignee', v_prev_assignee, p_assignee, coalesce(p_actor, 'Anonymous'));

    return v_row;
end;
$$;

create or replace function public.add_note(
    p_review_id text,
    p_team text,
    p_body text,
    p_author text,
    p_pin text default null
)
returns public.task_notes
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_row public.task_notes;
begin
    perform public.check_rate_limit();

    if p_team not in (
        'software-engineer', 'game-developer', 'product-analyst',
        'product-associate', 'data-analyst', 'ui-ux-designer',
        'growth-analyst', 'marketing-associate', 'founders-office'
    ) then
        raise exception 'Invalid team: %', p_team;
    end if;

    if p_body is null or char_length(trim(p_body)) < 1 or char_length(p_body) > 500 then
        raise exception 'Note body must be between 1 and 500 characters';
    end if;

    if p_author is not null and char_length(p_author) > 40 then
        raise exception 'Author exceeds 40 characters';
    end if;

    perform public.verify_team_pin(p_team, p_pin);

    insert into public.task_notes (review_id, team, body, author)
    values (p_review_id, p_team, trim(p_body), p_author)
    returning * into v_row;

    insert into public.task_activity (review_id, team, kind, from_value, to_value, actor)
    values (p_review_id, p_team, 'note', null, substring(trim(p_body) from 1 for 50), coalesce(p_author, 'Anonymous'));

    return v_row;
end;
$$;

-- Grant EXECUTE to anon and authenticated
grant execute on function public.set_status to anon, authenticated;
grant execute on function public.set_assignee to anon, authenticated;
grant execute on function public.add_note to anon, authenticated;

-- 5. REALTIME PUBLICATION
do $$
begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and tablename = 'task_status'
    ) then
        alter publication supabase_realtime add table public.task_status;
    end if;

    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and tablename = 'task_notes'
    ) then
        alter publication supabase_realtime add table public.task_notes;
    end if;

    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and tablename = 'task_activity'
    ) then
        alter publication supabase_realtime add table public.task_activity;
    end if;
end;
$$;
