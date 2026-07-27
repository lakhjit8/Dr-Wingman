-- Supports two efficiency changes to callDrWingman/coach-message:
-- (1) Claude prompt caching (system persona + coach-message's rolling
--     history block), which needs cache-tier pricing to log accurate cost.
-- (2) Rolling conversation summarization/compaction for long match
--     threads, so old messages are folded into a short summary instead of
--     being resent verbatim on every call forever.

-- Cache pricing per platform.claude.com/docs/en/about-claude/pricing —
-- same "will need a manual update" caveat as the base rates in migration
-- 0008 (Sonnet 5 introductory pricing runs through Aug 31, 2026).
alter table public.model_pricing add column if not exists cache_write_5m_price_per_million numeric(10, 4);
alter table public.model_pricing add column if not exists cache_write_1h_price_per_million numeric(10, 4);
alter table public.model_pricing add column if not exists cache_read_price_per_million numeric(10, 4);

update public.model_pricing
set cache_write_5m_price_per_million = 2.50,
    cache_write_1h_price_per_million = 4.00,
    cache_read_price_per_million = 0.20
where model = 'claude-sonnet-5';

alter table public.api_usage_log add column if not exists cache_write_tokens int not null default 0;
alter table public.api_usage_log add column if not exists cache_read_tokens int not null default 0;

-- conversation_summary: running summary of everything before
-- summary_through_count messages (all senders, chronological) for a
-- match. summary_through_count: how many of the match's messages (in
-- chronological order) are already folded into that summary — everything
-- after this point is still sent to Claude verbatim.
alter table public.matches add column if not exists conversation_summary text;
alter table public.matches add column if not exists summary_through_count int not null default 0;
