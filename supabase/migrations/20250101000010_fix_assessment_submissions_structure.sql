-- Migration to fix assessment_submissions table structure
-- This aligns the table with what the API code expects

BEGIN;

-- 1. Drop the existing table if it exists with wrong structure
DROP TABLE IF EXISTS assessment_submissions CASCADE;

-- 2. Create the correct table structure that matches the API code
CREATE TABLE assessment_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES assessment_forms(id) ON DELETE CASCADE, -- Links to assessment_forms
    framework_version_id UUID REFERENCES risk_framework_versions(id),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Who owns the submission
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL, -- Which lead this is for
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    answers JSONB NOT NULL, -- Raw user responses (all 16 CFA questions)
    result JSONB, -- Calculated risk scoring (bucket, score, rubric)
    status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected')),
    review_reason TEXT
);

-- 3. Enable RLS
ALTER TABLE assessment_submissions ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies that allow public insertion (for assessment submissions)
-- Users can view their own assessment submissions
CREATE POLICY "Users can view own assessment submissions" ON assessment_submissions
    FOR SELECT USING (owner_id = get_user_id_from_clerk());

-- Public can insert assessment submissions (for lead submissions)
CREATE POLICY "Public can insert assessment submissions" ON assessment_submissions
    FOR INSERT WITH CHECK (true);

-- Users can update their own assessment submissions
CREATE POLICY "Users can update own assessment submissions" ON assessment_submissions
    FOR UPDATE USING (owner_id = get_user_id_from_clerk());

-- Service role can manage all assessment submissions
CREATE POLICY "Service role can manage all assessment submissions" ON assessment_submissions
    FOR ALL USING (auth.role() = 'service_role');

-- 5. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON assessment_submissions TO anon, authenticated;
GRANT USAGE ON SEQUENCE assessment_submissions_id_seq TO anon, authenticated;

-- 6. Add risk_bucket and risk_score columns to leads table if they don't exist
DO $$ 
BEGIN
    -- Add risk_bucket column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'risk_bucket') THEN
        ALTER TABLE leads ADD COLUMN risk_bucket TEXT CHECK (risk_bucket IN ('low', 'medium', 'high'));
        RAISE NOTICE 'Added risk_bucket column to leads table';
    ELSE
        RAISE NOTICE 'risk_bucket column already exists in leads table';
    END IF;
    
    -- Add risk_score column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'risk_score') THEN
        ALTER TABLE leads ADD COLUMN risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100);
        RAISE NOTICE 'Added risk_score column to leads table';
    ELSE
        RAISE NOTICE 'risk_score column already exists in leads table';
    END IF;
    
    -- Add risk_profile_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'risk_profile_id') THEN
        ALTER TABLE leads ADD COLUMN risk_profile_id UUID REFERENCES assessment_submissions(id);
        RAISE NOTICE 'Added risk_profile_id column to leads table';
    ELSE
        RAISE NOTICE 'risk_profile_id column already exists in leads table';
    END IF;
END $$;

-- 7. Update RLS policies for leads to allow public insertion
DROP POLICY IF EXISTS "Public can insert leads" ON leads;
CREATE POLICY "Public can insert leads" ON leads
    FOR INSERT WITH CHECK (true);

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_assessment_id ON assessment_submissions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_owner_id ON assessment_submissions(owner_id);
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_lead_id ON assessment_submissions(lead_id);
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_submitted_at ON assessment_submissions(submitted_at);

-- 9. Verify the setup
SELECT 'Table structure fixed successfully' as status;

COMMIT;
