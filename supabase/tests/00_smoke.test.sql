-- pgTAP harness smoke test. Confirms the test framework runs and the core
-- wine-journal tables exist after migrations apply.
begin;
select plan(6);

select ok(true, 'pgTAP harness runs');

select has_table('public', 'scans', 'scans table exists');
select has_table('public', 'tastings', 'tastings table exists');
select has_table('public', 'wines', 'wines table exists');
select has_table('public', 'wines_added_queue', 'wines_added_queue table exists');
select has_table('public', 'profiles', 'profiles table exists');

select * from finish();
rollback;
