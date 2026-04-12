-- =====================================================
-- Gateway Resort - Minimal Supabase Schema
-- Purpose: Store only custom data that Cal.com can't handle
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROFILES TABLE (Synced from Clerk)
-- =====================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY,  -- Matches Clerk user ID
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'guest' CHECK (role IN ('guest', 'staff', 'admin')),
  loyalty_tier TEXT DEFAULT 'standard' CHECK (loyalty_tier IN ('standard', 'silver', 'gold', 'platinum')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);

-- =====================================================
-- 2. ANALYTICS EVENTS (Optional - for tracking)
-- =====================================================
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,  -- 'room_view', 'booking_start', 'booking_complete', 'inquiry_sent'
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id TEXT,  -- For anonymous tracking
  metadata JSONB,  -- Flexible event data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for analytics queries
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_created_at ON analytics_events(created_at);
CREATE INDEX idx_analytics_user_id ON analytics_events(user_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view and update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid()::text = id::text);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

-- Analytics: Anyone can insert events (for tracking)
CREATE POLICY "Anyone can insert analytics"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

-- Only admins can view analytics
CREATE POLICY "Admins can view analytics"
  ON analytics_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CLERK JWT AUTH FUNCTION
-- =====================================================

-- This function extracts the user ID from Clerk JWT
-- Required for RLS policies to work with Clerk tokens
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
  SELECT COALESCE(
    nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid
  );
$$ LANGUAGE sql STABLE;

-- =====================================================
-- SEED DATA (Optional - Create your admin user)
-- =====================================================

-- After you create your Clerk account, run this with your Clerk user ID:
-- INSERT INTO profiles (id, email, full_name, role)
-- VALUES (
--   'YOUR_CLERK_USER_ID',  -- Get this from Clerk Dashboard → Users
--   'admin@gatewayresort.com',
--   'Admin User',
--   'admin'
-- );

-- =====================================================
-- USEFUL QUERIES
-- =====================================================

-- Analytics: Count events by type
-- SELECT 
--   event_type,
--   COUNT(*) as count,
--   COUNT(DISTINCT user_id) as unique_users
-- FROM analytics_events
-- GROUP BY event_type
-- ORDER BY count DESC;
