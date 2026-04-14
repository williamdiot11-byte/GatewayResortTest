# Secret Rotation Execution Log

Started: 2026-04-12 22:02:52

## Planned Rotation Scope
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- SUPABASE_SERVICE_ROLE_KEY
- RESEND_API_KEY
- CLERK_WEBHOOK_SECRET (hosting env)
- CAL_WEBHOOK_SECRET (hosting env)
- ADMIN_API_KEY (hosting env)

## Notes
- Do not commit secret values.
- Rotate provider-side first, then update hosting env vars, then redeploy.
- Validate booking/payment/webhook smoke tests after each critical provider update.

## Execution Checklist

### 1) Stripe
- [ ] Generate new API secret key in Stripe dashboard.
- [ ] Update hosting env: STRIPE_SECRET_KEY.
- [ ] Rotate webhook endpoint signing secret and update STRIPE_WEBHOOK_SECRET.
- [ ] Redeploy.
- [ ] Validate checkout session + webhook signature processing.

### 2) Supabase
- [ ] Rotate service role key in Supabase.
- [ ] Update hosting env: SUPABASE_SERVICE_ROLE_KEY.
- [ ] Redeploy.
- [ ] Validate booking read/write endpoints.

### 3) Resend
- [ ] Rotate RESEND_API_KEY in Resend dashboard.
- [ ] Update hosting env: RESEND_API_KEY.
- [ ] Redeploy.
- [ ] Validate counter payment email send path.

### 4) Webhook/App Keys
- [ ] Rotate CLERK_WEBHOOK_SECRET and update hosting env.
- [ ] Rotate CAL_WEBHOOK_SECRET and update hosting env.
- [ ] Rotate ADMIN_API_KEY and update hosting env.
- [ ] Redeploy.
- [ ] Validate webhook deliveries and protected admin endpoints.

### 5) Final Validation
- [ ] Live smoke tests pass for booking + payment + webhook routes.
- [ ] Old keys disabled/revoked.
- [ ] Rotation timestamp recorded in secure vault.
