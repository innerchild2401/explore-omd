-- Fix the email_sequence_logs email_type constraint to include 'post_checkin'
-- The constraint is missing 'post_checkin' which causes all inserts to fail silently

-- Drop the existing constraint
ALTER TABLE email_sequence_logs 
DROP CONSTRAINT IF EXISTS email_sequence_logs_email_type_check;

-- Recreate the constraint with all required values
ALTER TABLE email_sequence_logs 
ADD CONSTRAINT email_sequence_logs_email_type_check 
CHECK (email_type IN (
  'post_booking_followup',
  'post_checkin',
  'pre_checkin',
  'post_checkout',
  'cancellation'
));

