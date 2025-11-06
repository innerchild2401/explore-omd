-- Check if any email_sequence_logs were created for the reservation
SELECT 
  id,
  reservation_id,
  email_type,
  scheduled_at,
  status,
  created_at,
  error_message
FROM email_sequence_logs
WHERE reservation_id = '64889450-0d8f-4303-a173-6986847ca327'
ORDER BY created_at DESC;

-- Also check the constraint again to verify it was fixed
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'email_sequence_logs'::regclass
  AND contype = 'c'
  AND conname = 'email_sequence_logs_email_type_check';

