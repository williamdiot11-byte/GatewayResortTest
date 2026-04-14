# Gateway Resort - Setup Guide
**Complete integration: Clerk + Supabase + Cal.com**

## 📋 Prerequisites Checklist

- [ ] Clerk account created
- [ ] Supabase project created
- [ ] Cal.com account created
- [ ] Vercel account (for webhook deployment)

---

## 🔑 Step 1: Set Up Clerk

### 1.1 Create Clerk Application

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Click "Create Application"
3. Name it "Gateway Resort"
4. Enable email/password authentication
5. (Optional) Enable social logins (Google, Facebook)

### 1.2 Get API Keys

1. In Clerk Dashboard, go to **API Keys**
2. Copy **Publishable Key** → Add to `Client/.env.local`:
   ```env
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
   ```
3. Copy **Secret Key** → Save for webhook setup (Step 3)

### 1.3 Configure Clerk JWT Template for Supabase

**Critical for Supabase RLS to work!**

1. In Clerk Dashboard, go to **JWT Templates**
2. Click **New Template** → Select "Supabase"
3. Or manually create with these settings:
   - Name: `supabase`
   - Claims:
     ```json
     {
       "sub": "{{user.id}}"
     }
     ```
4. Save the template

### 1.4 Verify Supabase Client Auth Pattern

The app uses `Client/hooks/useSupabaseClient.ts` (not the static `Client/services/supabaseClient.ts`) so Clerk JWT can be attached per request.

Verify:
- Components performing authenticated reads/writes import `useSupabaseClient`.
- No new authenticated flow is added via static `supabaseClient.ts`.

---

## 🗄️ Step 2: Set Up Supabase Database

### 2.1 Run Schema SQL

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor**
4. Open `supabase-schema.sql` from the project root
5. Copy all contents and paste into SQL Editor
6. Click **Run** to create tables

### 2.2 Get Supabase Credentials

1. Go to **Settings** → **API**
2. Copy these values to `Client/.env.local`:
   ```env
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5...
   ```
3. **Important:** Also copy **Service Role Key** (secret) for webhook setup

### 2.3 Create Your Admin User

1. First, create your user account in the app
2. Get your Clerk user ID from Clerk Dashboard → Users
3. In Supabase SQL Editor, run:
   ```sql
   UPDATE profiles
   SET role = 'admin'
   WHERE id = 'YOUR_CLERK_USER_ID';
   ```

---

## 📅 Step 3: Set Up Cal.com

### 3.1 Create Event Type

1. Go to [Cal.com Dashboard](https://cal.com/event-types)
2. Click **New Event Type**
3. Settings:
   - Event Name: "Gateway Resort Stay"
   - URL Slug: `gateway-resort/stay`
   - Duration: Custom (1 day minimum)
   - Location: Your resort address

### 3.2 Configure Cal.com Booking Link

Set the booking link slug in `Client/.env.local`:

```env
VITE_CAL_BOOKING_LINK=william-diot-fbbkje/30min
```

Note: frontend runtime does not currently consume `VITE_CAL_API_KEY`.

### 3.3 Configure Cal.com Booking Questions

Add these custom fields to collect room info:

1. In Event Type Settings → **Booking Questions**
2. Add custom field:
   - Label: "Room Selection"
   - Type: Dropdown
   - Options: Sea View Deluxe, Garden Kubo, Private Villa
3. Add custom field:
   - Label: "Special Requests"
   - Type: Long Text

---

## 🔗 Step 4: Deploy Webhooks (Vercel)

### 4.1 Install Vercel CLI

```bash
npm install -g vercel
```

### 4.2 Create Vercel Project

```bash
# From project root
cd "c:\Users\Will\Documents\WEB\Web Development Projects\GatewayResortTest"
vercel
```

Follow prompts:
- Link to existing project? **No**
- Project name? **gateway-resort**
- Directory? **./** (current directory)

### 4.3 Add Environment Variables to Vercel

```bash
# Supabase
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Clerk
vercel env add CLERK_WEBHOOK_SECRET
```

Or add via Vercel Dashboard → Settings → Environment Variables

### 4.4 Deploy

```bash
vercel --prod
```

Copy your deployment URL (e.g., `https://gateway-resort.vercel.app`)

---

## 🪝 Step 5: Configure Webhooks

### 5.1 Clerk Webhook

1. Go to Clerk Dashboard → **Webhooks**
2. Click **Add Endpoint**
3. Settings:
   - Endpoint URL: `https://YOUR_VERCEL_URL/api/webhooks/clerk`
   - Subscribe to events:
     - ✅ `user.created`
     - ✅ `user.updated`
     - ✅ `user.deleted`
4. Copy **Signing Secret** → Add to Vercel env: `CLERK_WEBHOOK_SECRET`

### 5.2 Cal.com Webhook

1. Go to Cal.com Dashboard → **Webhooks**
2. Click **New Webhook**
3. Settings:
   - Subscriber URL: `https://YOUR_VERCEL_URL/api/webhooks/cal`
   - Event Triggers:
     - ✅ `BOOKING_CREATED`
     - ✅ `BOOKING_CANCELLED`
     - ✅ `BOOKING_RESCHEDULED`
4. Save webhook

---

## 🧪 Step 6: Test the Integration

### 6.1 Test User Creation (Clerk → Supabase)

1. Start your app: `npm run dev`
2. Click "Sign Up" and create a test account
3. Check Supabase Dashboard → **Table Editor** → `profiles`
4. Your user should appear automatically ✅

### 6.2 Test Booking Flow

1. Browse to a room
2. Click "Reserve"
3. If not signed in, Clerk sign-in modal appears
4. After sign-in, Cal.com booking widget loads with pre-filled email
5. Select date/time and book
6. Check Supabase `booking_metadata` table for the booking ✅

### 6.3 Test Admin Dashboard

1. Make your user an admin (Step 2.3)
2. Sign in to the app
3. Click "Admin" in header
4. You should see admin dashboard ✅

---

## 🚀 Step 7: Going to Production

### 7.1 Get Production API Keys

Replace all test keys with production keys:

**Clerk:**
- Switch to production instance
- Get new publishable key and secret

**Supabase:**
- (Same project, just ensure RLS is enabled)

**Cal.com:**
- Upgrade to paid plan if needed
- Update event type to production URL

### 7.2 Update Environment Variables

Update **both**:
1. `Client/.env.local` (for local dev)
2. Vercel dashboard (for production)

### 7.3 Deploy

```bash
npm run build
vercel --prod
```

---

## 🔧 Troubleshooting

### Issue: "User not syncing to Supabase"

**Solution:**
1. Check Clerk webhook logs (Clerk Dashboard → Webhooks → Logs)
2. Check Vercel function logs (`vercel logs`)
3. Verify `CLERK_WEBHOOK_SECRET` is correct
4. Test webhook manually with Clerk's "Send test event"

### Issue: "Booking page shows error"

**Solution:**
1. Verify `VITE_CLERK_PUBLISHABLE_KEY` in `.env.local`
2. Check browser console for errors
3. Verify Cal.com event slug matches in code (`gateway-resort/stay`)

### Issue: "RLS policy blocks my queries"

**Solution:**
1. Verify Clerk JWT template is named exactly `supabase`
2. Check `auth.uid()` function exists in Supabase:
   ```sql
   SELECT auth.uid();
   ```
3. Temporarily disable RLS to test:
   ```sql
   ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
   ```

### Issue: "Payment webhook not receiving events"

**Solution:**
1. Implement payment gateway webhook (not included yet)
2. Test webhook URL with curl:
   ```bash
   curl -X POST https://YOUR_URL/api/webhooks/cal -H "Content-Type: application/json" -d '{"triggerEvent":"BOOKING_CREATED","payload":{}}'
   ```

---

## 📚 Architecture Summary

```
User Action → Frontend (React + Clerk)
                  ↓
          Cal.com Booking Widget
                  ↓
          Webhook → Vercel Function
                  ↓
          Supabase (Store metadata)
                  ↓
          Payment Gateway (TODO)
```

**Data Ownership:**
- **Clerk:** User authentication, profiles
- **Cal.com:** Bookings, availability, scheduling
- **Supabase:** Custom metadata, analytics
- **Your DB:** Nothing! (unless you add custom features)

---

## 🎯 Next Steps (Optional Enhancements)

- [ ] Integrate payment gateway (Paymongo, PayPal, Stripe)
- [ ] Add email notifications (Resend, SendGrid)
- [ ] Add SMS confirmations (Twilio)
- [ ] Build custom admin analytics dashboard
- [ ] Add loyalty points system
- [ ] Implement promo codes
- [ ] Add guest reviews/ratings

---

## 📞 Support Resources

- **Clerk Docs:** https://clerk.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Cal.com Docs:** https://cal.com/docs
- **Vercel Docs:** https://vercel.com/docs

---

**You're all set! 🎉** Your authentication is now handled by Clerk, bookings by Cal.com, and custom data by Supabase.
