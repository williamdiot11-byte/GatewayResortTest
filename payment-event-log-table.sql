-- =====================================================
-- PAYMENT EVENT LOG TABLE
-- Purpose: Persist payment-provider webhook events for reconciliation
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_event_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  booking_id TEXT,
  matched_booking BOOLEAN DEFAULT FALSE,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_event_log_provider ON payment_event_log(provider);
CREATE INDEX IF NOT EXISTS idx_payment_event_log_booking_id ON payment_event_log(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_event_log_created_at ON payment_event_log(created_at);

ALTER TABLE payment_event_log ENABLE ROW LEVEL SECURITY;

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

-- Service role writes from webhook handlers.
DROP POLICY IF EXISTS "Service role can insert payment events" ON payment_event_log;
CREATE POLICY "Service role can insert payment events"
  ON payment_event_log FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Admin read policy for dashboard/ops checks.
DROP POLICY IF EXISTS "Admins can view payment event logs" ON payment_event_log;
CREATE POLICY "Admins can view payment event logs"
  ON payment_event_log FOR SELECT
  USING (public.is_admin());