# Supabase Schema Setup Checklist (Current)

## 1. Pre-Setup
- [ ] Supabase project created
- [ ] Client env configured with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] Server env configured with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

## 2. Apply Database SQL Files

Run these SQL files in order from Supabase SQL Editor:
1. [ ] `supabase-schema.sql`
2. [ ] `booking-metadata-table.sql`
3. [ ] `payment-event-log-table.sql`

## 3. Verify Tables

In Supabase Table Editor:
- [ ] `profiles` exists
- [ ] `booking_metadata` exists
- [ ] `payment_event_log` exists
- [ ] `analytics_events` exists (optional)

## 4. Verify RLS Policies

- [ ] RLS enabled for `profiles`
- [ ] RLS enabled for `booking_metadata`
- [ ] RLS enabled for `payment_event_log`
- [ ] Admin select policies exist for ops tables

## 5. Configure Clerk JWT Template

In Clerk Dashboard:
1. [ ] Create template named `supabase`
2. [ ] Include claim:

```json
{
  "sub": "{{user.id}}"
}
```

## 6. Create Admin User

1. [ ] Create/sign in user in app
2. [ ] Copy Clerk user id
3. [ ] Run in SQL Editor:

```sql
UPDATE profiles
SET role = 'admin'
WHERE id = 'user_YOUR_CLERK_USER_ID';
```

## 7. Runtime Integration Checks

- [ ] App can sign in and sync profile into `profiles`
- [ ] Booking flow writes/updates `booking_metadata`
- [ ] Payment webhooks can write `payment_event_log`
- [ ] Admin dashboard can read booking/payment status

## 8. Troubleshooting

### If `booking_metadata` is missing
- Apply `booking-metadata-table.sql` explicitly.

### If `payment_event_log` is missing
- Apply `payment-event-log-table.sql` explicitly.

### If webhook writes fail with permissions
- Confirm server is using `SUPABASE_SERVICE_ROLE_KEY`.
- Confirm service-role insert policies are present.

### If users cannot read their own bookings
- Verify Clerk `supabase` JWT template emits `sub`.
- Verify `booking_metadata.user_id` is populated for signed-in flows.

## Completion Criteria

- [ ] All required tables exist
- [ ] RLS and policies are in place
- [ ] Admin access is verified
- [ ] Booking and payment writes are verified end-to-end

Next step: verify webhook secrets and run deploy smoke tests against the deployed API URL.
