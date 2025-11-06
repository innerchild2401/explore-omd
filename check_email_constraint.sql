-- Check the actual check constraint on email_sequence_logs.email_type
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'email_sequence_logs'::regclass
  AND contype = 'c'
  AND conname LIKE '%email_type%';

-- Also check all constraints on the table
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'email_sequence_logs'::regclass
ORDER BY contype, conname;

