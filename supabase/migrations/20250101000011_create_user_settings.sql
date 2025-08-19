-- Create user_settings table for Google Calendar integration
CREATE TABLE IF NOT EXISTS user_settings (
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

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own settings" ON user_settings
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Service role policy
CREATE POLICY "Service role can manage all user settings" ON user_settings
  FOR ALL USING (auth.role() = 'service_role');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_settings_updated_at 
  BEFORE UPDATE ON user_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
