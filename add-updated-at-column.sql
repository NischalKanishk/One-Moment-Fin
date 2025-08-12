-- Add updated_at column to assessment_forms table
ALTER TABLE assessment_forms 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_assessment_forms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_assessment_forms_updated_at ON assessment_forms;

-- Create the trigger
CREATE TRIGGER trigger_update_assessment_forms_updated_at
  BEFORE UPDATE ON assessment_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_assessment_forms_updated_at();
