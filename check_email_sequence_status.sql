-- =============================================
-- CHECK EMAIL SEQUENCE STATUS FOR RESERVATIONS
-- This query shows all reservations and their email sequence status
-- =============================================

SELECT 
  r.id as reservation_id,
  r.confirmation_number,
  r.reservation_status,
  r.check_in_date,
  r.check_out_date,
  r.created_at as booking_date,
  gp.email as guest_email,
  gp.first_name || ' ' || gp.last_name as guest_name,
  
  -- Calculate time-based information
  CASE 
    WHEN r.reservation_status NOT IN ('confirmed', 'tentative') THEN '❌ Status not eligible'
    WHEN r.created_at IS NULL THEN '❌ No booking date'
    WHEN r.check_in_date IS NULL THEN '❌ No check-in date'
    ELSE '✅ Eligible'
  END as eligibility_status,
  
  -- Days until check-in (from booking date)
  CASE 
    WHEN r.created_at IS NOT NULL AND r.check_in_date IS NOT NULL 
    THEN (r.check_in_date::date - r.created_at::date)
    ELSE NULL
  END as days_until_checkin,
  
  -- EXPECTED SCHEDULING (what should have been scheduled based on schedule.ts logic)
  -- Post-booking followup: Only if days_until_checkin > 3, scheduled for booking_date + 3 days at 10:00 AM UTC
  CASE 
    WHEN r.reservation_status IN ('confirmed', 'tentative') 
      AND r.created_at IS NOT NULL 
      AND r.check_in_date IS NOT NULL
      AND (r.check_in_date::date - r.created_at::date) > 3
    THEN (DATE(r.created_at) + INTERVAL '3 days' + INTERVAL '10 hours')::timestamptz
    ELSE NULL
  END as expected_post_booking_scheduled_at,
  
  -- Post-checkin: Always scheduled for check-in + 1 day at 10:00 AM UTC (if eligible)
  CASE 
    WHEN r.reservation_status IN ('confirmed', 'tentative') 
      AND r.check_in_date IS NOT NULL
    THEN (r.check_in_date::date + INTERVAL '1 day' + INTERVAL '10 hours')::timestamptz
    ELSE NULL
  END as expected_post_checkin_scheduled_at,
  
  -- Post-checkout: Always scheduled for check-out + 1 day at 10:00 AM UTC (if eligible)
  CASE 
    WHEN r.reservation_status IN ('confirmed', 'tentative') 
      AND r.check_out_date IS NOT NULL
    THEN (r.check_out_date::date + INTERVAL '1 day' + INTERVAL '10 hours')::timestamptz
    ELSE NULL
  END as expected_post_checkout_scheduled_at,
  
  -- Email sequence status
  COALESCE(post_booking.status, '❌ Not scheduled') as post_booking_followup,
  COALESCE(post_checkin.status, '❌ Not scheduled') as post_checkin_email,
  COALESCE(post_checkout.status, '❌ Not scheduled') as post_checkout_email,
  
  -- ACTUAL Scheduled times (from email_sequence_logs)
  post_booking.scheduled_at as post_booking_scheduled_at,
  post_checkin.scheduled_at as post_checkin_scheduled_at,
  post_checkout.scheduled_at as post_checkout_scheduled_at,
  
  -- COMPARISON: Expected vs Actual
  CASE 
    WHEN r.reservation_status IN ('confirmed', 'tentative') 
      AND r.created_at IS NOT NULL 
      AND r.check_in_date IS NOT NULL
      AND (r.check_in_date::date - r.created_at::date) > 3
      AND post_booking.status IS NULL
    THEN '⚠️ MISSING - Should be scheduled'
    WHEN post_booking.scheduled_at IS NOT NULL 
      AND (DATE(r.created_at) + INTERVAL '3 days' + INTERVAL '10 hours')::timestamptz IS NOT NULL
      AND ABS(EXTRACT(EPOCH FROM (post_booking.scheduled_at - ((DATE(r.created_at) + INTERVAL '3 days' + INTERVAL '10 hours')::timestamptz)))) > 3600
    THEN '⚠️ MISMATCH - Wrong date'
    WHEN post_booking.status IS NOT NULL THEN '✅ Scheduled'
    ELSE NULL
  END as post_booking_validation,
  
  CASE 
    WHEN r.reservation_status IN ('confirmed', 'tentative') 
      AND r.check_in_date IS NOT NULL
      AND post_checkin.status IS NULL
    THEN '⚠️ MISSING - Should be scheduled'
    WHEN post_checkin.scheduled_at IS NOT NULL 
      AND (r.check_in_date::date + INTERVAL '1 day' + INTERVAL '10 hours')::timestamptz IS NOT NULL
      AND ABS(EXTRACT(EPOCH FROM (post_checkin.scheduled_at - ((r.check_in_date::date + INTERVAL '1 day' + INTERVAL '10 hours')::timestamptz)))) > 3600
    THEN '⚠️ MISMATCH - Wrong date'
    WHEN post_checkin.status IS NOT NULL THEN '✅ Scheduled'
    ELSE NULL
  END as post_checkin_validation,
  
  CASE 
    WHEN r.reservation_status IN ('confirmed', 'tentative') 
      AND r.check_out_date IS NOT NULL
      AND post_checkout.status IS NULL
    THEN '⚠️ MISSING - Should be scheduled'
    WHEN post_checkout.scheduled_at IS NOT NULL 
      AND (r.check_out_date::date + INTERVAL '1 day' + INTERVAL '10 hours')::timestamptz IS NOT NULL
      AND ABS(EXTRACT(EPOCH FROM (post_checkout.scheduled_at - ((r.check_out_date::date + INTERVAL '1 day' + INTERVAL '10 hours')::timestamptz)))) > 3600
    THEN '⚠️ MISMATCH - Wrong date'
    WHEN post_checkout.status IS NOT NULL THEN '✅ Scheduled'
    ELSE NULL
  END as post_checkout_validation,
  
  -- Sent times
  post_booking.sent_at as post_booking_sent_at,
  post_checkin.sent_at as post_checkin_sent_at,
  post_checkout.sent_at as post_checkout_sent_at,
  
  -- Error messages if any
  post_booking.error_message as post_booking_error,
  post_checkin.error_message as post_checkin_error,
  post_checkout.error_message as post_checkout_error,
  
  -- Due status (emails that should have been sent by now)
  CASE 
    WHEN post_booking.status = 'scheduled' AND post_booking.scheduled_at <= NOW() THEN '⚠️ DUE NOW'
    WHEN post_booking.status = 'scheduled' THEN '⏳ Scheduled'
    WHEN post_booking.status = 'sent' THEN '✅ Sent'
    WHEN post_booking.status = 'failed' THEN '❌ Failed'
    ELSE NULL
  END as post_booking_due_status,
  
  CASE 
    WHEN post_checkin.status = 'scheduled' AND post_checkin.scheduled_at <= NOW() THEN '⚠️ DUE NOW'
    WHEN post_checkin.status = 'scheduled' THEN '⏳ Scheduled'
    WHEN post_checkin.status = 'sent' THEN '✅ Sent'
    WHEN post_checkin.status = 'failed' THEN '❌ Failed'
    ELSE NULL
  END as post_checkin_due_status,
  
  CASE 
    WHEN post_checkout.status = 'scheduled' AND post_checkout.scheduled_at <= NOW() THEN '⚠️ DUE NOW'
    WHEN post_checkout.status = 'scheduled' THEN '⏳ Scheduled'
    WHEN post_checkout.status = 'sent' THEN '✅ Sent'
    WHEN post_checkout.status = 'failed' THEN '❌ Failed'
    ELSE NULL
  END as post_checkout_due_status

FROM reservations r
LEFT JOIN guest_profiles gp ON r.guest_id = gp.id

-- Join email sequence logs for each email type
LEFT JOIN LATERAL (
  SELECT status, scheduled_at, sent_at, error_message
  FROM email_sequence_logs
  WHERE reservation_id = r.id 
    AND email_type = 'post_booking_followup'
  ORDER BY created_at DESC
  LIMIT 1
) post_booking ON true

LEFT JOIN LATERAL (
  SELECT status, scheduled_at, sent_at, error_message
  FROM email_sequence_logs
  WHERE reservation_id = r.id 
    AND email_type = 'post_checkin'
  ORDER BY created_at DESC
  LIMIT 1
) post_checkin ON true

LEFT JOIN LATERAL (
  SELECT status, scheduled_at, sent_at, error_message
  FROM email_sequence_logs
  WHERE reservation_id = r.id 
    AND email_type = 'post_checkout'
  ORDER BY created_at DESC
  LIMIT 1
) post_checkout ON true

-- Order by most recent reservations first
ORDER BY r.created_at DESC
LIMIT 50;

-- =============================================
-- SUMMARY QUERY: Emails that are DUE NOW
-- =============================================

SELECT 
  '📧 DUE EMAILS SUMMARY' as report_type,
  COUNT(*) as total_due_emails,
  COUNT(*) FILTER (WHERE email_type = 'post_booking_followup') as post_booking_due,
  COUNT(*) FILTER (WHERE email_type = 'post_checkin') as post_checkin_due,
  COUNT(*) FILTER (WHERE email_type = 'post_checkout') as post_checkout_due
FROM email_sequence_logs
WHERE status = 'scheduled'
  AND scheduled_at <= NOW();

-- =============================================
-- DETAILED VIEW: All emails that are DUE NOW
-- =============================================

SELECT 
  esl.id as email_log_id,
  esl.reservation_id,
  r.confirmation_number,
  esl.email_type,
  esl.status,
  esl.scheduled_at,
  esl.sent_at,
  esl.error_message,
  esl.created_at,
  gp.email as guest_email,
  r.reservation_status,
  r.check_in_date,
  r.check_out_date
FROM email_sequence_logs esl
JOIN reservations r ON esl.reservation_id = r.id
LEFT JOIN guest_profiles gp ON r.guest_id = gp.id
WHERE esl.status = 'scheduled'
  AND esl.scheduled_at <= NOW()
ORDER BY esl.scheduled_at ASC;

