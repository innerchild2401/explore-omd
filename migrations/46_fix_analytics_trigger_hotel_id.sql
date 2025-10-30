-- =============================================
-- Migration 46: Fix analytics trigger to use correct business_id
-- =============================================
-- This migration fixes the auto_track_hotel_revenue function to get business_id
-- from the hotels table since hotel_id references hotels.id, not businesses.id

DROP TRIGGER IF EXISTS trigger_auto_track_hotel_revenue ON reservations;

CREATE OR REPLACE FUNCTION auto_track_hotel_revenue()
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
      PERFORM track_business_revenue(
        p_business_id := v_business_id,
        p_source_type := 'hotel_reservation',
        p_source_id := NEW.id,
        p_gross_amount := NEW.total_amount,
        p_check_in_date := NEW.check_in_date,
        p_check_out_date := NEW.check_out_date,
        p_payment_status := COALESCE(NEW.payment_status, 'pending')
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_track_hotel_revenue
  AFTER INSERT OR UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION auto_track_hotel_revenue();

-- Verify the function was updated
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'auto_track_hotel_revenue';

