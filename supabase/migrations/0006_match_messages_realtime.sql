-- The frontend subscribes to postgres_changes INSERT events on
-- match_messages (src/hooks/useMatchThread.ts) as a live-update path, but a
-- table must be added to the supabase_realtime publication before Postgres
-- will broadcast changes on it — this was never done, so that subscription
-- was silently a no-op. The UI relied entirely on an explicit reload() after
-- the coach-message Edge Function call resolved, which is fine unless that
-- call hangs (e.g. a stalled fetch with no timeout — see the invoke()
-- `timeout` options added alongside this migration). Enabling realtime here
-- gives a second, independent path for new messages to reach the UI.
alter publication supabase_realtime add table public.match_messages;
