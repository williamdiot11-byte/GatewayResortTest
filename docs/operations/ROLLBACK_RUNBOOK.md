# Rollback Runbook

Date: 2026-04-12
System: GatewayResortTest

## Trigger Conditions

Initiate rollback if any of these occur after deploy:
- Booking creation fails for new reservations.
- Payment checkout session creation fails.
- Webhook endpoints return signature or auth errors at scale.
- Admin dashboard cannot load booking/payment records.
- Error rate or support complaints spike beyond normal baseline.

## Roles

- Incident owner: Executes rollback and coordinates status updates.
- Verifier: Runs smoke tests after rollback.
- Communicator: Posts updates to stakeholders/client.

## Rollback Targets

- Frontend deployment (Client build).
- API deployment (payment + webhook endpoints).
- Environment variables (if changed in release).
- Database schema (only if migration introduced breakage).

## Fast Rollback Procedure

1. Freeze changes
- Stop any further deploys.
- Pause active merge/release actions.

2. Revert app runtime to last known good
- In your hosting provider, promote the previous successful deployment for frontend.
- Promote previous successful API/serverless deployment for endpoints.

3. Restore previous environment snapshot
- Reapply previous env set for:
  - APP_BASE_URL
  - CORS_ALLOWED_ORIGINS
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
  - STRIPE_SECRET_KEY
  - STRIPE_WEBHOOK_SECRET
  - CLERK_WEBHOOK_SECRET
  - CAL_WEBHOOK_SECRET
  - RESEND_API_KEY
  - RESEND_FROM_EMAIL
  - ADMIN_API_KEY

4. Validate webhook provider settings
- Stripe webhook endpoint URL + secret match rollback deployment.
- Clerk webhook endpoint URL + secret match rollback deployment.
- Cal webhook endpoint URL + secret match rollback deployment.

5. Run post-rollback smoke tests
- Booking registration endpoint responds.
- Resolve booking endpoint responds.
- Counter payment endpoint responds.
- Stripe checkout endpoint responds for valid payload.
- Frontend can open booking flow and account history.

6. Communicate status
- Mark incident as mitigated once smoke tests pass.
- Share impact window and next update timeline.

## If Database Migration Is Involved

Only run DB rollback if app/runtime rollback does not restore service.

1. Identify exact migration causing regression.
2. Execute tested down migration or compensating migration.
3. Re-run smoke tests before reopening traffic.

## Verification Checklist

- No 5xx errors on payment endpoints.
- No signature verification failures in webhook logs.
- New booking can be created and resolved.
- Counter payment write succeeds with confirmation metadata.
- Admin and account views load expected booking data.

## Evidence To Capture

- Deployment IDs before and after rollback.
- Env snapshot version used.
- Smoke test outputs.
- Incident start and mitigation timestamps.

## Exit Criteria

Rollback is complete when:
- Core booking + payment flows are functional.
- Webhooks process without elevated failure rates.
- Stakeholders informed and monitoring in place.
