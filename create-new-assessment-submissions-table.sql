-- Create new assessment submissions table for the new assessment forms system
-- This avoids conflicts with the legacy system

CREATE TABLE IF NOT EXISTS assessment_form_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID REFERENCES assessment_forms(id) ON DELETE CASCADE,
    form_version_id UUID REFERENCES assessment_form_versions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    answers JSONB NOT NULL, -- Store all question answers at once
    result JSONB, -- Store calculated risk score and category
    metadata JSONB DEFAULT '{}', -- Additional metadata like source, user agent, etc.
    
    -- Add constraints
    CONSTRAINT valid_answers CHECK (jsonb_typeof(answers) = 'object'),
    CONSTRAINT valid_result CHECK (result IS NULL OR jsonb_typeof(result) = 'object')
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assessment_form_submissions_form_id ON assessment_form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_assessment_form_submissions_user_id ON assessment_form_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_form_submissions_lead_id ON assessment_form_submissions(lead_id);
CREATE INDEX IF NOT EXISTS idx_assessment_form_submissions_submitted_at ON assessment_form_submissions(submitted_at);

-- Enable RLS
ALTER TABLE assessment_form_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assessment_form_submissions table
-- Users can view submissions for forms they own
CREATE POLICY "Users can view own form submissions" ON assessment_form_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assessment_forms 
            WHERE assessment_forms.id = assessment_form_submissions.form_id 
            AND assessment_forms.user_id = get_user_id_from_clerk()
        )
    );

-- Users can insert submissions for forms they own
CREATE POLICY "Users can insert own form submissions" ON assessment_form_submissions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM assessment_forms 
            WHERE assessment_forms.id = assessment_form_submissions.form_id 
            AND assessment_forms.user_id = get_user_id_from_clerk()
        )
    );

-- Service role can manage all submissions
CREATE POLICY "Service role can manage all form submissions" ON assessment_form_submissions
    FOR ALL USING (auth.role() = 'service_role');

-- Add comment to table
COMMENT ON TABLE assessment_form_submissions IS 'Stores submissions for the new assessment forms system';
COMMENT ON COLUMN assessment_form_submissions.answers IS 'JSON object containing all question answers';
COMMENT ON COLUMN assessment_form_submissions.result IS 'JSON object containing calculated risk score and category';
COMMENT ON COLUMN assessment_form_submissions.metadata IS 'Additional metadata like source, user agent, etc.';
