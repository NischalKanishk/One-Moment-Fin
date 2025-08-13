-- Risk Assessment System Migration
-- This migration adds the new risk assessment framework system
-- Run this migration to add the new tables and update existing ones

-- 1) Global question bank
CREATE TABLE IF NOT EXISTS question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qkey TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  qtype TEXT NOT NULL,              -- 'single' | 'multi' | 'scale' | 'number' | 'percent' | 'text'
  options JSONB,
  module TEXT,                      -- 'profile' | 'capacity' | 'behavior' | 'need' | 'constraints'
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Frameworks + versions
CREATE TABLE IF NOT EXISTS risk_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  engine TEXT NOT NULL,             -- 'weighted_sum' | 'three_pillar' | 'decision_table'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS risk_framework_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES risk_frameworks(id) ON DELETE CASCADE,
  version INT NOT NULL,
  config JSONB NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(framework_id, version)
);

-- 3) Map framework version -> which qkeys it uses (and any overrides)
CREATE TABLE IF NOT EXISTS framework_question_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_version_id UUID NOT NULL REFERENCES risk_framework_versions(id) ON DELETE CASCADE,
  qkey TEXT NOT NULL REFERENCES question_bank(qkey),
  required BOOLEAN NOT NULL DEFAULT true,
  order_index INT NOT NULL DEFAULT 0,
  alias TEXT,
  transform JSONB,
  options_override JSONB
);

-- 4) Update assessments table to support new framework system
-- Add new columns to existing assessments table
DO $$
BEGIN
    -- Add title column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'title') THEN
        ALTER TABLE assessments ADD COLUMN title TEXT;
    END IF;
    
    -- Add slug column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'slug') THEN
        ALTER TABLE assessments ADD COLUMN slug TEXT;
    END IF;
    
    -- Add framework_version_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'framework_version_id') THEN
        ALTER TABLE assessments ADD COLUMN framework_version_id UUID REFERENCES risk_framework_versions(id) ON DELETE RESTRICT;
    END IF;
    
    -- Add is_default column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'is_default') THEN
        ALTER TABLE assessments ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT false;
    END IF;
    
    -- Add is_published column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'is_published') THEN
        ALTER TABLE assessments ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT false;
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'updated_at') THEN
        ALTER TABLE assessments ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
    END IF;
END $$;

-- Update existing assessments to have default values
UPDATE assessments 
SET title = COALESCE(name, 'Default Assessment'),
    slug = COALESCE(name, 'default-assessment') || '-' || id::text,
    is_published = COALESCE(is_active, false)
WHERE title IS NULL;

-- Add unique constraint for owner + slug
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_owner_slug' 
        AND conrelid = 'assessments'::regclass
    ) THEN
        ALTER TABLE assessments ADD CONSTRAINT unique_owner_slug UNIQUE (user_id, slug);
    END IF;
END $$;

-- 5) Immutable snapshot of the exact questions shown publicly
CREATE TABLE IF NOT EXISTS assessment_question_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  qkey TEXT NOT NULL,
  label TEXT NOT NULL,
  qtype TEXT NOT NULL,
  options JSONB,
  required BOOLEAN NOT NULL DEFAULT true,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6) Submissions (+ link to leads)
CREATE TABLE IF NOT EXISTS assessment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  framework_version_id UUID NOT NULL REFERENCES risk_framework_versions(id) ON DELETE RESTRICT,
  owner_id UUID NOT NULL,                    -- assessment owner (MFD)
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answers JSONB NOT NULL,                    -- { qkey: value }
  result JSONB NOT NULL,                     -- { score, bucket, rubric:{ capacity, tolerance, need, warnings[] } }
  lead_id UUID
);

-- 7) Add backref to leads table if it exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'source_submission_id') THEN
        ALTER TABLE leads ADD COLUMN source_submission_id UUID REFERENCES assessment_submissions(id);
    END IF;
END $$;

-- 8) Add risk assessment fields to leads table
DO $$
BEGIN
    -- Add risk_bucket column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'risk_bucket') THEN
        ALTER TABLE leads ADD COLUMN risk_bucket TEXT;
    END IF;
    
    -- Add risk_score column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'risk_score') THEN
        ALTER TABLE leads ADD COLUMN risk_score INTEGER;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_question_bank_qkey ON question_bank(qkey);
CREATE INDEX IF NOT EXISTS idx_question_bank_module ON question_bank(module);
CREATE INDEX IF NOT EXISTS idx_risk_frameworks_code ON risk_frameworks(code);
CREATE INDEX IF NOT EXISTS idx_risk_framework_versions_framework_id ON risk_framework_versions(framework_id);
CREATE INDEX IF NOT EXISTS idx_framework_question_map_framework_version_id ON framework_question_map(framework_version_id);
CREATE INDEX IF NOT EXISTS idx_assessments_framework_version_id ON assessments(framework_version_id);
CREATE INDEX IF NOT EXISTS idx_assessments_slug ON assessments(slug);
CREATE INDEX IF NOT EXISTS idx_assessment_question_snapshots_assessment_id ON assessment_question_snapshots(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_assessment_id ON assessment_submissions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_owner_id ON assessment_submissions(owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_source_submission_id ON leads(source_submission_id);

-- Enable RLS for new tables
ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_framework_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE framework_question_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_question_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for question_bank (public read, service role write)
CREATE POLICY "Anyone can view question bank" ON question_bank FOR SELECT USING (true);
CREATE POLICY "Service role can manage question bank" ON question_bank FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for risk_frameworks (public read, service role write)
CREATE POLICY "Anyone can view risk frameworks" ON risk_frameworks FOR SELECT USING (true);
CREATE POLICY "Service role can manage risk frameworks" ON risk_frameworks FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for risk_framework_versions (public read, service role write)
CREATE POLICY "Anyone can view framework versions" ON risk_framework_versions FOR SELECT USING (true);
CREATE POLICY "Service role can manage framework versions" ON risk_framework_versions FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for framework_question_map (public read, service role write)
CREATE POLICY "Anyone can view framework question maps" ON framework_question_map FOR SELECT USING (true);
CREATE POLICY "Service role can manage framework question maps" ON framework_question_map FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for assessment_question_snapshots
CREATE POLICY "Users can view own assessment snapshots" ON assessment_question_snapshots FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM assessments 
    WHERE assessments.id = assessment_question_snapshots.assessment_id 
    AND assessments.user_id = get_user_id_from_clerk()
  )
);
CREATE POLICY "Service role can manage assessment snapshots" ON assessment_question_snapshots FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for assessment_submissions
CREATE POLICY "Users can view own assessment submissions" ON assessment_submissions FOR SELECT USING (
  owner_id = get_user_id_from_clerk()
);
CREATE POLICY "Public can submit to published assessments" ON assessment_submissions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM assessments 
    WHERE assessments.id = assessment_submissions.assessment_id 
    AND assessments.is_published = true
  )
);
CREATE POLICY "Service role can manage assessment submissions" ON assessment_submissions FOR ALL USING (auth.role() = 'service_role');

-- Create trigger for updating updated_at timestamp on assessments
CREATE OR REPLACE FUNCTION update_assessments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updating updated_at timestamp on assessments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_assessments_updated_at' 
        AND tgrelid = 'assessments'::regclass
    ) THEN
        CREATE TRIGGER update_assessments_updated_at 
        BEFORE UPDATE ON assessments
        FOR EACH ROW EXECUTE FUNCTION update_assessments_updated_at();
    END IF;
END $$;

-- Migration complete message
DO $$
BEGIN
    RAISE NOTICE 'Risk Assessment System migration completed successfully!';
    RAISE NOTICE 'New tables created: question_bank, risk_frameworks, risk_framework_versions, framework_question_map, assessment_question_snapshots, assessment_submissions';
    RAISE NOTICE 'Existing tables updated: assessments, leads';
    RAISE NOTICE 'Next step: Run the seed data script to populate frameworks and questions';
END $$;
