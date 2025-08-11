-- Fix assessment_questions table to support additional question types
-- This migration adds support for 'dropdown' and 'number' question types

-- First, drop the existing constraint
ALTER TABLE assessment_questions DROP CONSTRAINT IF EXISTS assessment_questions_type_check;

-- Add the new constraint with all supported question types
ALTER TABLE assessment_questions ADD CONSTRAINT assessment_questions_type_check 
CHECK (type IN ('mcq', 'scale', 'text', 'dropdown', 'number'));

-- Verify the change
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'assessment_questions'::regclass 
AND contype = 'c';
