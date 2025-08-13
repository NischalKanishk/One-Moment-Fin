-- Create missing assessments table for risk assessment system
-- This table should have been created by the original schema but is missing

-- Create the assessments table with the new structure
CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  framework_version_id UUID REFERENCES risk_framework_versions(id) ON DELETE RESTRICT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add unique constraint for owner + slug
ALTER TABLE assessments ADD CONSTRAINT IF NOT EXISTS unique_owner_slug UNIQUE (user_id, slug);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_framework_version_id ON assessments(framework_version_id);
CREATE INDEX IF NOT EXISTS idx_assessments_slug ON assessments(slug);
CREATE INDEX IF NOT EXISTS idx_assessments_is_default ON assessments(is_default);

-- Enable RLS
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assessments
CREATE POLICY "Users can view own assessments" ON assessments FOR SELECT USING (
  user_id = get_user_id_from_clerk()
);

CREATE POLICY "Users can insert own assessments" ON assessments FOR INSERT WITH CHECK (
  user_id = get_user_id_from_clerk()
);

CREATE POLICY "Users can update own assessments" ON assessments FOR UPDATE USING (
  user_id = get_user_id_from_clerk()
);

CREATE POLICY "Users can delete own assessments" ON assessments FOR DELETE USING (
  user_id = get_user_id_from_clerk()
);

CREATE POLICY "Service role can manage all assessments" ON assessments FOR ALL USING (
  auth.role() = 'service_role'
);

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_assessments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_assessments_updated_at' 
        AND conrelid = 'assessments'::regclass
    ) THEN
        CREATE TRIGGER update_assessments_updated_at 
        BEFORE UPDATE ON assessments
        FOR EACH ROW EXECUTE FUNCTION update_assessments_updated_at();
    END IF;
END $$;

-- Create a default assessment for existing users
INSERT INTO assessments (user_id, title, slug, framework_version_id, is_default, is_published)
SELECT 
  u.id,
  'Default Risk Assessment',
  'default-risk-assessment-' || u.id::text,
  (SELECT id FROM risk_framework_versions WHERE is_default = true LIMIT 1),
  true,
  false
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM assessments a WHERE a.user_id = u.id AND a.is_default = true
);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Assessments table created successfully!';
    RAISE NOTICE 'Default assessments created for existing users.';
END $$;
