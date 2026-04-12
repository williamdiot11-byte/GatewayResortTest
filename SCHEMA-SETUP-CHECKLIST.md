# Supabase Schema Setup Checklist

## ✅ Pre-Setup
- [ ] Supabase project created
- [ ] Project URL saved to `.env.local` as `VITE_SUPABASE_URL`
- [ ] Anon key saved to `.env.local` as `VITE_SUPABASE_ANON_KEY`
- [ ] Service role key saved for webhooks (keep this secret!)

## 📊 Apply Schema

### Via Supabase Dashboard (Easiest)
1. [ ] Go to Supabase Dashboard → SQL Editor
2. [ ] Open `supabase-schema.sql` from project root
3. [ ] Copy entire file contents
4. [ ] Paste into SQL Editor
5. [ ] Click **Run** button
6. [ ] Wait for success message

### Verify Tables Created
Go to **Table Editor** and check:
- [ ] `profiles` table exists (3 columns minimum)
- [ ] `booking_metadata` table exists
- [ ] `analytics_events` table exists (optional)

### Verify RLS Enabled
In **Table Editor**, each table should show:
- [ ] 🔒 Lock icon next to table name (RLS enabled)
- [ ] Policies tab shows at least 2 policies per table

## 🔐 Configure Clerk JWT

### In Clerk Dashboard
1. [ ] Go to **JWT Templates**
2. [ ] Click **New Template** → Select "Supabase"
3. [ ] OR create custom template named `supabase` with claim:
   ```json
   {
     "sub": "{{user.id}}"
   }
   ```
4. [ ] Save template

### Verify JWT Template
1. [ ] Sign in to your app with a test account
2. [ ] Open browser DevTools → Application → Local Storage
3. [ ] Find Clerk token (starts with `eyJ...`)
4. [ ] Decode at [jwt.io](https://jwt.io)
5. [ ] Verify `sub` claim has your Clerk user ID

## 👤 Create Your Admin User

### Step 1: Create Account in App
1. [ ] Run `npm run dev` from Client folder
2. [ ] Click "Sign Up" and create your account
3. [ ] Verify account creation (check email)

### Step 2: Get Your Clerk User ID
1. [ ] Go to Clerk Dashboard → Users
2. [ ] Find your user
3. [ ] Copy User ID (looks like: `user_2abc123...`)

### Step 3: Make Yourself Admin
1. [ ] Go to Supabase Dashboard → SQL Editor
2. [ ] Run this query (replace with your ID):
   ```sql
   UPDATE profiles
   SET role = 'admin'
   WHERE id = 'user_YOUR_CLERK_USER_ID';
   ```
3. [ ] Check that 1 row was updated

### Verify Admin Access
1. [ ] Refresh your app
2. [ ] Click "Admin" in header
3. [ ] You should see Admin Dashboard (not "Access Denied")

## 🧪 Test Database Connection

### Test 1: Profile Sync
1. [ ] Create new test account in app
2. [ ] Go to Supabase → Table Editor → `profiles`
3. [ ] Verify new row appears with correct email

### Test 2: Clerk JWT Auth
1. [ ] Sign in to app
2. [ ] Open browser console
3. [ ] Run: 
   ```javascript
   const token = await window.__clerk?.session?.getToken({ template: 'supabase' })
   console.log(token)
   ```
4. [ ] Token should print (long string starting with `eyJ`)

### Test 3: RLS Policies
1. [ ] Sign in as regular user (not admin)
2. [ ] Try to view Admin Dashboard
3. [ ] Should see "Access Denied" (RLS working!)

## 🚨 Troubleshooting

### Issue: Tables not appearing
**Solution:** 
- Check SQL Editor for errors when running schema
- Ensure you're in correct project
- Try refreshing Table Editor page

### Issue: "auth.uid() function not found"
**Solution:**
```sql
-- Run this in SQL Editor
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
  SELECT COALESCE(
    nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid
  );
$$ LANGUAGE sql STABLE;
```

### Issue: RLS blocking all queries
**Solution:**
- Verify Clerk JWT template is named exactly `supabase`
- Check that `sub` claim is in JWT token
- Temporarily disable RLS to test:
  ```sql
  ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
  ```

### Issue: User not syncing to Supabase
**Solution:**
- Webhook not set up yet (that's next step!)
- For now, manually insert profile:
  ```sql
  INSERT INTO profiles (id, email, full_name, role)
  VALUES ('your_clerk_user_id', 'your@email.com', 'Your Name', 'admin');
  ```

## ✅ Completion Checklist

Before moving to next step:
- [ ] All tables created successfully
- [ ] RLS enabled on all tables
- [ ] Clerk JWT template configured
- [ ] At least 1 admin user exists
- [ ] Can sign in and access Admin Dashboard
- [ ] Test user profile appears in Supabase

---

**Status:** Schema setup complete! 🎉

**Next:** Deploy webhooks to sync users automatically
