-- =====================================================
-- BOOKING METADATA TABLE
-- Purpose: Store booking history synced from Cal.com webhooks
-- =====================================================

-- Drop existing if needed (careful: this deletes data)
-- DROP TABLE IF EXISTS booking_metadata;

-- Create or update booking_metadata table
CREATE TABLE IF NOT EXISTS booking_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id TEXT NOT NULL UNIQUE,  -- Cal.com booking/event ID
  user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,  -- Clerk user ID
  user_email TEXT NOT NULL,
  user_name TEXT,
  room_id TEXT,  -- Gateway Resort room identifier
  booking_date TIMESTAMP WITH TIME ZONE,  -- When the booking is scheduled
  event_id TEXT,  -- Cal.com event ID for linking back
  metadata JSONB,  -- Flexible data from Cal.com webhook
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_booking_metadata_user_id ON booking_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_metadata_email ON booking_metadata(user_email);
CREATE INDEX IF NOT EXISTS idx_booking_metadata_booking_date ON booking_metadata(booking_date);
CREATE INDEX IF NOT EXISTS idx_booking_metadata_created_at ON booking_metadata(created_at);
CREATE INDEX IF NOT EXISTS idx_booking_metadata_room_id ON booking_metadata(room_id);

-- Enable RLS
ALTER TABLE booking_metadata ENABLE ROW LEVEL SECURITY;

-- Helper functions used by RLS policies.
CREATE OR REPLACE FUNCTION public.get_clerk_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '');
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id::text = public.get_clerk_user_id()
      AND p.role = 'admin'
  );
$$;

-- RLS Policies
-- Admins can view all bookings
DROP POLICY IF EXISTS "Admins can view all bookings" ON booking_metadata;
CREATE POLICY "Admins can view all bookings"
  ON booking_metadata FOR SELECT
  USING (public.is_admin());

-- Users can view their own bookings
DROP POLICY IF EXISTS "Users can view own bookings" ON booking_metadata;
CREATE POLICY "Users can view own bookings"
  ON booking_metadata FOR SELECT
  USING (user_id = public.get_clerk_user_id());

-- Only the webhook (via service role) can insert bookings
-- This would be enforced on the server-side via Vercel webhook only
DROP POLICY IF EXISTS "Service role can insert bookings" ON booking_metadata;
CREATE POLICY "Service role can insert bookings"
  ON booking_metadata FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_booking_metadata_updated_at ON booking_metadata;
CREATE TRIGGER update_booking_metadata_updated_at
  BEFORE UPDATE ON booking_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
