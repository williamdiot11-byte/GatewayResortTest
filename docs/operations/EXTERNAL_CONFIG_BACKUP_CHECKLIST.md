# External Config Backup Checklist

Date: 2026-04-12
Purpose: Snapshot all provider configurations before milestone deploy.

## How To Use In Boilerplate

This file is a living template for your private boilerplate and production projects.

Update this checklist whenever you:
- add a new external provider/service,
- change webhook/event subscriptions,
- add or rename environment variables,
- change ownership or access model for operational accounts.

Rule: if a service is required to run booking/payment/auth in production, it must appear in this checklist.

## Boilerplate Baseline (keep current)

- [ ] Provider list reflects all active external services
- [ ] Env var inventory matches `.env.server.example` and client env template
- [ ] Webhook endpoints and required events are documented
- [ ] Secret storage and ownership process are documented
- [ ] Restore verification steps are still valid

## 1. Clerk
- [ ] Export app name, auth factors, and enabled providers
- [ ] Screenshot JWT template `supabase`
- [ ] Screenshot webhook endpoint URL + subscribed events
- [ ] Save webhook signing secret location reference (do not paste secret in repo)

## 2. Supabase
- [ ] Save project ref and region
- [ ] Export SQL schema dump
- [ ] Export RLS policies (`pg_policies`) for profiles, booking_metadata, payment_event_log
- [ ] Snapshot auth settings and redirect URLs

## 3. Stripe
- [ ] Screenshot webhook endpoint URL and event subscriptions
- [ ] Record active API version
- [ ] Verify test/live mode separation
- [ ] Save key inventory location (publishable, secret, webhook)

## 4. Cal.com
- [ ] Screenshot webhook endpoint and enabled events
- [ ] Backup active booking link slug
- [ ] Backup booking question configuration

## 5. Resend
- [ ] Screenshot verified domain/sender config
- [ ] Confirm from-address used by app

## 6. Hosting (Vercel or equivalent)
- [ ] Export environment variable names per environment (dev/preview/prod)
- [ ] Screenshot latest successful deployment IDs
- [ ] Snapshot domain + redirect settings

## 7. Secure Secret Backup (out-of-repo)
- [ ] Save secret values in password manager or encrypted vault
- [ ] Confirm at least two owner accounts can access vault
- [ ] Record last-rotated date for each secret

## 8. Verification
- [ ] Restore test in non-prod with backup material
- [ ] Confirm booking + payment smoke tests pass after restore

## Add New Provider Checklist

When introducing a new external dependency, add:
- [ ] Provider purpose and owner
- [ ] Required env vars (names only, no secret values)
- [ ] Webhook endpoints and required events
- [ ] Dashboard settings that must be backed up
- [ ] Smoke test for this provider after restore
