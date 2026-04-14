# Production Environment Audit

Date: 2026-04-12
Status: In progress

## Frontend variables (Client)

Required:
- VITE_CLERK_PUBLISHABLE_KEY
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_API_BASE_URL
- VITE_CAL_BOOKING_LINK
- VITE_DEFAULT_BOOKING_AMOUNT

Defined template:
- Client/.env.example

Used by:
- Client/index.tsx
- Client/hooks/useSupabaseClient.ts
- Client/components/BookingPage.tsx

## Backend and webhook variables

Required:
- APP_BASE_URL
- CORS_ALLOWED_ORIGINS
- ADMIN_API_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- CLERK_WEBHOOK_SECRET
- CAL_WEBHOOK_SECRET
- RESEND_API_KEY
- RESEND_FROM_EMAIL

Defined template:
- .env.server.example

Used by:
- api/_utils/security.ts
- api/payments/create-checkout-session.ts
- api/payments/mark-counter-payment.ts
- api/payments/register-booking.ts
- api/payments/resolve-latest-booking.ts
- api/webhooks/stripe.ts
- api/webhooks/clerk.ts
- api/webhooks/cal.ts
- scripts/local-cal-webhook.js

## Pre-deploy checks

1. Confirm APP_BASE_URL points to the live frontend domain.
2. Confirm CORS_ALLOWED_ORIGINS includes all frontend origins only.
3. Confirm Stripe webhook endpoint is live and STRIPE_WEBHOOK_SECRET matches endpoint.
4. Confirm Clerk webhook endpoint is live and CLERK_WEBHOOK_SECRET matches endpoint.
5. Confirm Cal webhook endpoint is live and CAL_WEBHOOK_SECRET matches endpoint.
6. Confirm RESEND_FROM_EMAIL domain is verified in Resend.
7. Confirm ADMIN_API_KEY is set and not shared with client apps.
8. Confirm service-role key is never exposed to client builds.

## Blocking risks identified

- No root server env template existed before this audit; now added as .env.server.example.
- Existing Client/.env.example did not include VITE_API_BASE_URL, VITE_CAL_BOOKING_LINK, and VITE_DEFAULT_BOOKING_AMOUNT.
- Existing Client/.env.example had VITE_CAL_API_KEY even though it is not consumed by the current frontend runtime.

## Next action

- Fill production values in deployment platform secrets from .env.server.example and Client/.env.example, then run smoke tests against payment and webhook paths.
