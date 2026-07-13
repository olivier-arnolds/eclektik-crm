-- Broadcast-metadata op campaigns (newsletter via Resend Broadcasts).
-- Toegepast via Supabase MCP apply_migration (add_broadcast_cols_to_campaigns) op 2026-07-13.
alter table public.campaigns add column if not exists channel text;              -- 'broadcast' | (null = transactioneel/legacy)
alter table public.campaigns add column if not exists resend_broadcast_id text;   -- Resend broadcast-id
alter table public.campaigns add column if not exists resend_audience_id text;    -- per-campagne aangemaakte audience

-- Terugdraaien:
-- alter table public.campaigns drop column channel, drop column resend_broadcast_id, drop column resend_audience_id;
