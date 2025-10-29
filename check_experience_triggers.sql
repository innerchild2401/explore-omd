-- Check if updated_at trigger exists for experiences table
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'experiences';

-- Check if update_updated_at_column function exists
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name = 'update_updated_at_column';

-- If the trigger doesn't exist, create it
-- This is likely the issue - the migration might not have run completely
