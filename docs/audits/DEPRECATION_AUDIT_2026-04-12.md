# Deprecation and Staleness Audit

Date: 2026-04-12

## Updated in this pass

- Updated SCHEMA-SETUP-CHECKLIST.md to current schema reality:
  - Explicit SQL order: supabase-schema.sql -> booking-metadata-table.sql -> payment-event-log-table.sql
  - Added verification for payment_event_log and booking_metadata policies.
- Updated Client/vite-env.d.ts:
  - Removed stale VITE_CAL_API_KEY
  - Added VITE_API_BASE_URL, VITE_CAL_BOOKING_LINK, VITE_DEFAULT_BOOKING_AMOUNT
- Updated SETUP-GUIDE.md:
  - Removed outdated static Supabase client guidance
  - Replaced Cal API key section with booking-link env usage

## Remaining stale/deprecated candidates

1. Client/components/LoginPage.tsx
- Uses static supabase client auth path.
- Not imported anywhere in current app routing.
- Recommendation: delete or archive as legacy component to prevent accidental reuse.

2. Client/services/supabaseClient.ts
- Kept for legacy compatibility but not aligned with current standard for authenticated flows.
- Recommendation: keep only if needed for non-auth contexts, otherwise remove.

3. migrate-schema.sh
- Suggests one-step push of supabase-schema.sql while current schema setup depends on additional SQL files.
- Recommendation: either update script to apply all SQL artifacts or mark script deprecated.

## No-change findings

- index.css warning in Vite build is expected by project standards and not a regression.
- State-based routing (no react-router-dom) is consistent with project instructions.

## Suggested next cleanup order

1. Decide fate of legacy LoginPage/static supabase client files.
2. Update or deprecate migrate-schema.sh.
3. Keep setup docs synchronized with PRODUCTION_ENV_AUDIT.md and .env templates.
