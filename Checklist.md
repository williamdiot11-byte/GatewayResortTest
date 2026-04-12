# Gateway Resort Implementation Checklist

## Phase 0 - Completed Baseline
- [x] Cal webhook ingestion works locally and writes to `booking_metadata`
- [x] Cal webhook ping test returns HTTP 200
- [x] Booking lifecycle events are upserted by `booking_id`
- [x] Clerk webhook sync endpoint exists and verifies signatures

## Phase 1 - Product Decisions Freeze
- [x] Confirm booking flow: `book first -> pay after booking`
- [x] Confirm payment provider: `Stripe`
- [x] Define payment statuses: `unpaid`, `pending`, `paid`, `failed`, `refunded`
- [x] Keep room mapping temporary until stable room IDs are finalized
- [ ] Define migration rule from temporary room refs to final room IDs

## Phase 2 - Clerk UI Customization
- [x] Align Clerk component appearance in app shell (`Client/index.tsx`) - branding variables and element styling applied
- [x] Disable/hide profile image upload in Clerk user profile - kept `Manage profile`, hid `avatarImageActions`, `avatarImageActionsUpload`, `avatarImageActionsRemove`, and removed avatar hint copy at source via Clerk localization (`userProfile.profilePage.fileDropAreaHint`)
- [x] Remove duplicate admin button from nav - kept only in action area (right side header)
- [ ] Clerk Dashboard branding pass (logo, colors, social providers, text) - optional, can be set anytime
- [x] Verify auth UX states: signed out, signed in, admin - validated manually
- [x] Verify admin access still gated by role - validated manually

## Phase 3 - Cal Booking UX Alignment
- [x] Replace generic event framing in booking page copy - updated wording to reservation context
- [x] Hide Cal event-type details if they mismatch hospitality wording - hideEventTypeDetails: true
- [x] Configure production event link via env var (`VITE_CAL_BOOKING_LINK`) - ready (fallback to 30min for now)
- [x] Keep metadata payload flexible (`roomId`, fallback labels, user context) - implemented
- [x] Validate create/cancel/reschedule through local webhook and tunnel - completed via local webhook + cloudflared test payloads

## Phase 4 - Payment Integration (Stripe)
- [x] Add endpoint to create Stripe checkout/payment session for a booking - `api/payments/create-checkout-session.ts`
- [x] Add Stripe webhook endpoint for payment status updates - `api/webhooks/stripe.ts`
- [x] Correlate Stripe events to `booking_id` idempotently - implemented
- [x] Store projected payment fields for admin readability - metadata projection done
- [x] Implement Stripe webhook signature verification (raw body + `stripe-signature`) - production-hardened with local unsigned fallback
- [x] Add reconciliation checks for payment-booking mismatches - `api/reconciliation/bookings-payments.ts`
- [x] Persist payment provider event logs for orphan detection - `payment_event_log` + webhook logging
- [x] Create Stripe test account and get test keys - completed
- [x] Test checkout session creation locally - completed (POST success + booking metadata moved to pending)
- [x] Test Stripe webhook with local CLI forwarding - completed (200 delivery observed for Stripe test events)
- [x] Test full payment flow (checkout -> pending -> paid) - completed end-to-end via local API and triggers

## Phase 5 - Security Hardening
- [x] Add Cal webhook verification strategy in production handler - implemented with raw-body signature validation and production secret enforcement (`api/webhooks/cal.ts`)
- [x] Verify Clerk webhook secret and Supabase service-role usage boundaries - Clerk Svix verification hardened with raw-body checks (`api/webhooks/clerk.ts`)
- [x] Validate RLS policies for user/admin visibility - confirmed via `pg_policies` (admin select + service_role insert checks)
- [x] Validate CORS/origin restrictions for deployed APIs - origin allowlist + preflight handling added for sensitive API routes (`api/_utils/security.ts`)
- [x] Confirm no server-only secrets are exposed in client bundle - client-side scan found no secret env key references

## Phase 6 - Final QA and Release
- [x] E2E: guest booking flow
- [x] E2E: signed-in booking flow
- [x] E2E: cancel/reschedule flow
- [x] E2E: payment success/failure/refund flow
- [x] Verify admin dashboard data integrity and status rendering
- [ ] Final UI polish pass and accessibility pass
- [ ] Prepare rollback plan and launch checklist

---

## Current Blocker and Next Steps

**Current blocker:** final release QA is in progress
- Stripe local checkout and webhook flow are validated end-to-end (`pending -> paid -> refunded`)
- Cancel/reschedule and payment failure/refund E2E are validated
- Remaining work: final polish/accessibility, rollback + launch checklist

**Concrete finish plan for today:**
- [ ] Booking UI wording pass: keep policy copy as `awaiting email confirmation`, hold-until-6:00-PM rule, and `No cancellation fee is charged`
- [ ] Accessibility sweep: verify keyboard navigation, visible focus rings, and readable color contrast on booking/admin pages
- [ ] Admin visibility pass: verify payment badges (`unpaid`, `pending`, `paid`, `failed`, `refunded`) render for representative test rows
- [ ] Launch env audit: confirm production values for `APP_BASE_URL`, `CORS_ALLOWED_ORIGINS`, `CAL_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `CLERK_WEBHOOK_SECRET`, `ADMIN_API_KEY`
- [ ] Webhook smoke tests post-deploy: one Cal create event and one Stripe checkout completion event logged with matched booking
- [ ] Rollback procedure documented and tested (disable payment CTA + keep booking intake active)

**Rollback checklist (minimal and safe):**
1. Disable payment initiation in UI (hide/disable pay-now entry point) while keeping booking page operational.
2. Keep `api/webhooks/cal` and `api/webhooks/clerk` active so booking and profile sync continue.
3. Keep `api/webhooks/stripe` active for already-created sessions/events, but stop creating new sessions from UI.
4. Monitor `payment_event_log` and `booking_metadata` for 30-60 minutes for anomalies.
5. Restore full payment UI only after smoke tests pass in production.

**Phase 2 completed:**
- Auth UX states validated and admin dashboard access confirmed
- Optional enhancement applied: signed-out header actions simplified and admin booking cards made more compact/high-contrast

**Phase 3 validation ready:**
- Cal booking page is live; use existing tunnel to test real bookings
- Confirm room metadata writes to booking_metadata rows

**Cal validation command targets:**
- `POST /api/webhooks/cal` with `BOOKING_CREATED`
- `POST /api/webhooks/cal` with `BOOKING_CANCELLED`
- `POST /api/webhooks/cal` with `BOOKING_RESCHEDULED`

**Phase 4 validated locally:**
- Checkout session creation tested
- Stripe webhook forwarding tested
- Booking payment metadata confirmed to move from `pending` to `paid`

**Stripe local test command (after keys are set):**
- `stripe listen --forward-to http://localhost:3001/api/webhooks/stripe`
