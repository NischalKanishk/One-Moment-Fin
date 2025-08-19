-- Check if user_settings table exists, if not create it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_settings') THEN
        -- Create user_settings table for Google Calendar integration
        CREATE TABLE user_settings (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          google_access_token TEXT,
          google_refresh_token TEXT,
          google_email TEXT,
          google_name TEXT,
          google_calendar_id TEXT DEFAULT 'primary',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id)
        );
        
        RAISE NOTICE 'user_settings table created successfully';
    ELSE
        RAISE NOTICE 'user_settings table already exists';
    END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON user_settings;
DROP POLICY IF EXISTS "Service role can manage all user settings" ON user_settings;

-- Create RLS Policies for Clerk authentication
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can delete own settings" ON user_settings
  FOR DELETE USING (user_id = get_user_id_from_clerk());

-- Service role policy
CREATE POLICY "Service role can manage all user settings" ON user_settings
  FOR ALL USING (auth.role() = 'service_role');

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Check if trigger function exists, if not create it
DO $$ 
DECLARE
    func_exists BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT FROM pg_proc WHERE proname = 'update_updated_at_column') INTO func_exists;
    
    IF NOT func_exists THEN
        -- Create updated_at trigger function
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
        
        RAISE NOTICE 'update_updated_at_column function created successfully';
    ELSE
        RAISE NOTICE 'update_updated_at_column function already exists';
    END IF;
END $$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;

-- Create the trigger
CREATE TRIGGER update_user_settings_updated_at 
  BEFORE UPDATE ON user_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
END $$;
