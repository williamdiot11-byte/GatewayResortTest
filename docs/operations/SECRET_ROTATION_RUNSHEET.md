# Secret Rotation Runsheet

Date: 2026-04-12
Goal: Rotate exposed API secrets safely with minimal downtime.

## Scope

Rotate these keys first:
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- SUPABASE_SERVICE_ROLE_KEY
- CLERK_WEBHOOK_SECRET
- CAL_WEBHOOK_SECRET
- RESEND_API_KEY
- ADMIN_API_KEY

## Order of Operations

1. Prepare
- [ ] Ensure current deployment is healthy.
- [ ] Open provider dashboards for all keys in scope.
- [ ] Keep old keys available until post-rotation validation passes.

2. Create new keys (provider side)
- [ ] Generate replacement key/secret for each provider.
- [ ] Label each new key with date + environment.

3. Update platform env vars
- [ ] Update production env vars in hosting platform.
- [ ] Keep variable names unchanged.
- [ ] Trigger redeploy.

4. Update webhook signing secrets
- [ ] Stripe: set new webhook secret in platform env.
- [ ] Clerk: set new webhook secret in platform env.
- [ ] Cal: set new webhook secret in platform env.

5. Validate after deploy
- [ ] Booking resolve/register endpoints respond.
- [ ] Counter payment route responds and persists metadata.
- [ ] Stripe checkout session creation works.
- [ ] Stripe webhook events are accepted (no signature failures).
- [ ] Clerk webhook user sync works.
- [ ] Cal booking webhook works.

6. Retire old keys
- [ ] Disable or delete old provider keys after validation window.
- [ ] Confirm no traffic uses old keys.

7. Recordkeeping
- [ ] Store new keys in secure vault (not in repo).
- [ ] Update last-rotated date for each secret.
- [ ] Save incident notes if any failures occurred.

## Rollback if rotation fails

- Reapply previous key values in env vars.
- Redeploy previous known-good release.
- Re-run smoke checks from docs/operations/ROLLBACK_RUNBOOK.md.
