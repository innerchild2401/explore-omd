-- =============================================
-- Migration 47: Add booking_completed analytics event tracking
-- =============================================
-- This migration adds a trigger to insert booking_completed events into business_analytics
-- when a reservation is confirmed

DROP TRIGGER IF EXISTS trigger_analytics_booking_completed ON reservations;

CREATE OR REPLACE FUNCTION track_booking_completed_analytics()
RETURNS TRIGGER AS $$
DECLARE
  v_business_id UUID;
BEGIN
  -- Only track for completed bookings (reservation_status = 'confirmed')
  IF NEW.reservation_status = 'confirmed' AND (OLD.reservation_status IS NULL OR OLD.reservation_status != 'confirmed') THEN
    -- Get business_id from hotels table
    SELECT h.business_id INTO v_business_id
    FROM hotels h
    WHERE h.id = NEW.hotel_id;
    
    -- Only proceed if we found a valid business_id
    IF v_business_id IS NOT NULL THEN
      -- Insert booking_completed event into business_analytics
      INSERT INTO business_analytics (
        business_id,
        event_type,
        metadata,
        revenue_amount,
        currency,
        session_id
      ) VALUES (
        v_business_id,
        'booking_completed',
        jsonb_build_object(
          'reservation_id', NEW.id,
          'confirmation_number', NEW.confirmation_number,
          'check_in_date', NEW.check_in_date,
          'check_out_date', NEW.check_out_date
        ),
        NEW.total_amount,
        COALESCE(NEW.currency, 'EUR'),
        NULL  -- Session tracking not available for server-side triggers
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_analytics_booking_completed
  AFTER INSERT OR UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION track_booking_completed_analytics();

-- Verify the function was created
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'track_booking_completed_analytics';

