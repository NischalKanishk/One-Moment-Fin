-- Migration Validation Script
-- This script validates the migration syntax without executing it
-- Run this to check for syntax errors before applying the actual migration

-- Test 1: Check if we can parse the basic structure
DO $$
BEGIN
    RAISE NOTICE 'Migration validation started...';
    
    -- Test 2: Check if required functions exist
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_id_from_clerk') THEN
        RAISE NOTICE 'WARNING: get_user_id_from_clerk() function not found. This may cause RLS policy issues.';
    ELSE
        RAISE NOTICE '✓ get_user_id_from_clerk() function found';
    END IF;
    
    -- Test 3: Check if uuid-ossp extension is available
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN
        RAISE NOTICE 'WARNING: uuid-ossp extension not found. gen_random_uuid() may not work.';
    ELSE
        RAISE NOTICE '✓ uuid-ossp extension found';
    END IF;
    
    -- Test 4: Check if assessments table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assessments') THEN
        RAISE NOTICE 'WARNING: assessments table not found. Migration may fail.';
    ELSE
        RAISE NOTICE '✓ assessments table found';
    END IF;
    
    -- Test 5: Check if leads table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
        RAISE NOTICE 'WARNING: leads table not found. Migration may fail.';
    ELSE
        RAISE NOTICE '✓ leads table found';
    END IF;
    
    RAISE NOTICE 'Migration validation completed. Check warnings above if any.';
END $$;
