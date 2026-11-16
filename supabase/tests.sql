-- ==============================================================================
-- HW Review-Fix Board: Supabase Test Suite
-- Run in SQL Editor as anon role to verify security and constraints
-- ==============================================================================

set role anon;

do $$
declare
    v_res public.task_status;
    v_note public.task_notes;
    v_failed boolean;
begin
    raise notice 'Starting Supabase security & functional tests...';

    -- Test 1: Valid set_status succeeds and logs activity
    v_res := public.set_status('test_rev_001', 'product-analyst', 'working', 'Test User');
    if v_res.status != 'working' then
        raise exception 'Test 1 Failed: Expected status "working", got %', v_res.status;
    end if;

    if not exists (
        select 1 from public.task_activity
        where review_id = 'test_rev_001' and kind = 'status' and to_value = 'working'
    ) then
        raise exception 'Test 1 Failed: Activity not logged';
    end if;
    raise notice 'Test 1 Passed: Valid set_status succeeds and logs activity';

    -- Test 2: Invalid status is rejected
    v_failed := false;
    begin
        perform public.set_status('test_rev_001', 'product-analyst', 'invalid_status', 'Test User');
    exception when others then
        v_failed := true;
    end;
    if not v_failed then
        raise exception 'Test 2 Failed: Invalid status was unexpectedly accepted';
    end if;
    raise notice 'Test 2 Passed: Invalid status rejected';

    -- Test 3: Invalid team is rejected
    v_failed := false;
    begin
        perform public.set_status('test_rev_001', 'invalid_team', 'working', 'Test User');
    exception when others then
        v_failed := true;
    end;
    if not v_failed then
        raise exception 'Test 3 Failed: Invalid team was unexpectedly accepted';
    end if;
    raise notice 'Test 3 Passed: Invalid team rejected';

    -- Test 4: Direct INSERT, UPDATE, DELETE denied on tables
    v_failed := false;
    begin
        insert into public.task_status(review_id, team, status) values ('test_rev_002', 'game-developer', 'done');
    exception when others then
        v_failed := true;
    end;
    if not v_failed then
        raise exception 'Test 4 Failed: Direct INSERT on task_status was allowed';
    end if;

    v_failed := false;
    begin
        update public.task_status set status = 'done' where review_id = 'test_rev_001';
    exception when others then
        v_failed := true;
    end;
    if not v_failed then
        raise exception 'Test 4 Failed: Direct UPDATE on task_status was allowed';
    end if;

    v_failed := false;
    begin
        delete from public.task_status where review_id = 'test_rev_001';
    exception when others then
        v_failed := true;
    end;
    if not v_failed then
        raise exception 'Test 4 Failed: Direct DELETE on task_status was allowed';
    end if;
    raise notice 'Test 4 Passed: Direct mutations strictly blocked by RLS';

    -- Test 5: team_pins is unreadable
    v_failed := false;
    begin
        perform count(*) from public.team_pins;
    exception when others then
        v_failed := true;
    end;
    if not v_failed then
        raise exception 'Test 5 Failed: team_pins was unexpectedly readable by anon';
    end if;
    raise notice 'Test 5 Passed: team_pins is unreadable by client';

    -- Test 6: Notes validation
    v_note := public.add_note('test_rev_001', 'product-analyst', 'Investigating drop-off at tutorial', 'Analyst 1');
    if v_note.id is null then
        raise exception 'Test 6 Failed: add_note returned empty row';
    end if;
    raise notice 'Test 6 Passed: Valid note created';

    -- Clean up test records
    -- Note: Since anon cannot DELETE directly, cleanup can be done with superuser/service_role
    raise notice 'All anon tests passed successfully.';
end;
$$;

reset role;

-- Clean up test data using administrative context
delete from public.task_activity where review_id like 'test_rev_%';
delete from public.task_notes where review_id like 'test_rev_%';
delete from public.task_status where review_id like 'test_rev_%';
