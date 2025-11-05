-- =============================================
-- BOOKING EMAIL SEQUENCE SYSTEM
-- Migration: 54_booking_email_sequence.sql
-- =============================================

-- =============================================
-- 1. RESERVATION STAFF RATINGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS reservation_staff_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  guest_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one rating per reservation
  UNIQUE(reservation_id)
);

CREATE INDEX IF NOT EXISTS idx_reservation_staff_ratings_reservation_id ON reservation_staff_ratings(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_staff_ratings_hotel_id ON reservation_staff_ratings(hotel_id);
CREATE INDEX IF NOT EXISTS idx_reservation_staff_ratings_created_at ON reservation_staff_ratings(created_at DESC);

-- =============================================
-- 2. BOOKING ISSUE REPORTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS booking_issue_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('payment', 'confirmation', 'communication', 'other')),
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  guest_email TEXT NOT NULL,
  contact_preference TEXT CHECK (contact_preference IN ('email', 'phone')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_booking_issue_reports_reservation_id ON booking_issue_reports(reservation_id);
CREATE INDEX IF NOT EXISTS idx_booking_issue_reports_hotel_id ON booking_issue_reports(hotel_id);
CREATE INDEX IF NOT EXISTS idx_booking_issue_reports_status ON booking_issue_reports(status);
CREATE INDEX IF NOT EXISTS idx_booking_issue_reports_created_at ON booking_issue_reports(created_at DESC);

-- =============================================
-- 3. EMAIL SEQUENCE LOGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS email_sequence_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL CHECK (email_type IN ('post_booking_followup', 'pre_checkin', 'post_checkout', 'cancellation')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'failed', 'skipped')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Track which emails have been sent for a reservation
  UNIQUE(reservation_id, email_type, scheduled_at)
);

CREATE INDEX IF NOT EXISTS idx_email_sequence_logs_reservation_id ON email_sequence_logs(reservation_id);
CREATE INDEX IF NOT EXISTS idx_email_sequence_logs_status ON email_sequence_logs(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_sequence_logs_scheduled_at ON email_sequence_logs(scheduled_at) WHERE status = 'scheduled';

-- =============================================
-- 4. UPDATE TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION update_email_sequence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reservation_staff_ratings_updated_at
  BEFORE UPDATE ON reservation_staff_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_email_sequence_updated_at();

CREATE TRIGGER update_booking_issue_reports_updated_at
  BEFORE UPDATE ON booking_issue_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_email_sequence_updated_at();

-- =============================================
-- 5. RLS POLICIES
-- =============================================

-- Reservation staff ratings - public read for hotel owners, guests can create
ALTER TABLE reservation_staff_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create reservation staff ratings"
ON reservation_staff_ratings
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "Hotel owners can view ratings for their hotels"
ON reservation_staff_ratings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM hotels h
    WHERE h.id = reservation_staff_ratings.hotel_id
    AND h.business_id IN (
      SELECT id FROM businesses
      WHERE owner_id = auth.uid()
    )
  )
);

-- Booking issue reports - public create, admin read
ALTER TABLE booking_issue_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create booking issue reports"
ON booking_issue_reports
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "Hotel owners can view issue reports for their hotels"
ON booking_issue_reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM hotels h
    WHERE h.id = booking_issue_reports.hotel_id
    AND h.business_id IN (
      SELECT id FROM businesses
      WHERE owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Admins can view all issue reports"
ON booking_issue_reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'omd_admin')
  )
);

CREATE POLICY "Admins can update issue reports"
ON booking_issue_reports
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'omd_admin')
  )
);

-- Email sequence logs - admin and hotel owner access
ALTER TABLE email_sequence_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotel owners can view email logs for their hotels"
ON email_sequence_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM reservations r
    JOIN hotels h ON h.id = r.hotel_id
    WHERE r.id = email_sequence_logs.reservation_id
    AND h.business_id IN (
      SELECT id FROM businesses
      WHERE owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Admins can view all email logs"
ON email_sequence_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'omd_admin')
  )
);

