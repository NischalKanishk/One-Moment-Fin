-- Fix CFA Questions RLS and create missing framework_questions table
-- This migration restores the working CFA questions functionality

-- 1. Create the missing framework_questions table that the working code expects
CREATE TABLE IF NOT EXISTS framework_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    framework_id UUID REFERENCES risk_frameworks(id) ON DELETE CASCADE,
    qkey TEXT NOT NULL,
    label TEXT NOT NULL,
    qtype TEXT NOT NULL CHECK (qtype IN ('single', 'multi', 'scale', 'number', 'percent', 'text')),
    options JSONB,
    required BOOLEAN DEFAULT true,
    order_index INTEGER NOT NULL,
    module TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS on framework_questions
ALTER TABLE framework_questions ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for framework_questions
-- Allow public read access to framework questions
CREATE POLICY "Anyone can view framework questions" ON framework_questions
    FOR SELECT USING (true);

-- Allow service role to manage framework questions
CREATE POLICY "Service role can manage framework questions" ON framework_questions
    FOR ALL USING (auth.role() = 'service_role');

-- 4. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_framework_questions_framework_id ON framework_questions(framework_id);
CREATE INDEX IF NOT EXISTS idx_framework_questions_order ON framework_questions(order_index);

-- 5. Insert CFA framework if it doesn't exist (checking what columns exist)
DO $$
BEGIN
    -- Check if description column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risk_frameworks' AND column_name = 'description') THEN
        INSERT INTO risk_frameworks (code, name, description, engine, is_active)
        VALUES ('cfa_three_pillar_v1', 'CFA Three Pillar v1', 'Three-pillar approach: capacity, tolerance, and need', 'three_pillar', true)
        ON CONFLICT (code) DO NOTHING;
    ELSE
        INSERT INTO risk_frameworks (code, name, engine, is_active)
        VALUES ('cfa_three_pillar_v1', 'CFA Three Pillar v1', 'three_pillar', true)
        ON CONFLICT (code) DO NOTHING;
    END IF;
END $$;

-- 6. Get the CFA framework ID
DO $$
DECLARE
    cfa_framework_id UUID;
BEGIN
    SELECT id INTO cfa_framework_id FROM risk_frameworks WHERE code = 'cfa_three_pillar_v1';
    
    -- 7. Insert CFA framework questions
    INSERT INTO framework_questions (framework_id, qkey, label, qtype, options, required, order_index, module) VALUES
    (cfa_framework_id, 'primary_goal', 'What is your primary investment goal?', 'single', 
     '[{"label": "Wealth build", "value": "Wealth build"}, {"label": "Child education", "value": "Child education"}, {"label": "House", "value": "House"}, {"label": "Retirement", "value": "Retirement"}, {"label": "Other", "value": "Other"}]', 
     true, 1, 'profile'),
    
    (cfa_framework_id, 'horizon', 'What is your investment time horizon?', 'single', 
     '[{"label": "Less than 1 year", "value": "<1y"}, {"label": "1-3 years", "value": "1-3y"}, {"label": "3-5 years", "value": "3-5y"}, {"label": "5-10 years", "value": "5-10y"}, {"label": "More than 10 years", "value": ">10y"}]', 
     true, 2, 'profile'),
    
    (cfa_framework_id, 'age', 'What is your age?', 'single', 
     '[{"label": "Under 25", "value": "<25"}, {"label": "25-35", "value": "25-35"}, {"label": "36-50", "value": "36-50"}, {"label": "51+", "value": "51+"}]', 
     true, 3, 'capacity'),
    
    (cfa_framework_id, 'dependents', 'How many dependents do you have?', 'single', 
     '[{"label": "0", "value": "0"}, {"label": "1", "value": "1"}, {"label": "2", "value": "2"}, {"label": "3", "value": "3"}, {"label": "4+", "value": "4+"}]', 
     true, 4, 'capacity'),
    
    (cfa_framework_id, 'income_security', 'How secure is your income?', 'single', 
     '[{"label": "Not secure", "value": "Not secure"}, {"label": "Somewhat secure", "value": "Somewhat secure"}, {"label": "Fairly secure", "value": "Fairly secure"}, {"label": "Very secure", "value": "Very secure"}]', 
     true, 5, 'capacity'),
    
    (cfa_framework_id, 'emi_ratio', 'What percentage of your income goes towards EMIs/loan payments?', 'percent', 
     '{"max": 100, "min": 0, "step": 5}', 
     true, 6, 'capacity'),
    
    (cfa_framework_id, 'liquidity_withdrawal_2y', 'What percentage of your investments might you need to withdraw in the next 2 years?', 'percent', 
     '{"max": 100, "min": 0, "step": 5}', 
     true, 7, 'capacity'),
    
    (cfa_framework_id, 'emergency_fund_months', 'How many months of expenses do you have in emergency funds?', 'single', 
     '[{"label": "Less than 3 months", "value": "<3"}, {"label": "3-6 months", "value": "3-6"}, {"label": "6-12 months", "value": "6-12"}, {"label": "More than 12 months", "value": ">12"}]', 
     true, 8, 'capacity'),
    
    (cfa_framework_id, 'market_knowledge', 'How would you rate your knowledge of financial markets? (1-5)', 'scale', 
     '{"max": 5, "min": 1, "labels": ["Beginner", "Basic", "Intermediate", "Advanced", "Expert"]}', 
     true, 9, 'knowledge'),
    
    (cfa_framework_id, 'investing_experience', 'What is your investment experience?', 'single', 
     '[{"label": "None", "value": "None"}, {"label": "Less than 3 years", "value": "<3y"}, {"label": "3-10 years", "value": "3-10y"}, {"label": "More than 10 years", "value": ">10y"}]', 
     true, 10, 'knowledge'),
    
    (cfa_framework_id, 'drawdown_reaction', 'How would you react if your investment lost 20% in a month?', 'single', 
     '[{"label": "Sell immediately", "value": "Sell"}, {"label": "Hold and wait", "value": "Do nothing"}, {"label": "Buy more at lower prices", "value": "Buy more"}]', 
     true, 11, 'behavior'),
    
    (cfa_framework_id, 'gain_loss_tradeoff', 'Which scenario would you prefer?', 'single', 
     '[{"label": "No loss even if returns are low", "value": "NoLossEvenIfLowGain"}, {"label": "Risk 8% loss for 22% gain", "value": "Loss8Gain22"}, {"label": "Risk 25% loss for 50% gain", "value": "Loss25Gain50"}]', 
     true, 12, 'behavior'),
    
    (cfa_framework_id, 'loss_threshold', 'What is the maximum loss you can tolerate?', 'single', 
     '[{"label": "Less than 3%", "value": "<3%"}, {"label": "3-8%", "value": "3-8%"}, {"label": "9-15%", "value": "9-15%"}, {"label": "More than 15%", "value": ">15%"}]', 
     true, 13, 'behavior'),
    
    (cfa_framework_id, 'goal_required_return', 'What annual return do you need to achieve your goals?', 'percent', 
     '{"max": 20, "min": 0, "step": 1}', 
     true, 14, 'need'),
    
    (cfa_framework_id, 'liquidity_constraint', 'How quickly might you need to access your investments?', 'single', 
     '[{"label": "Anytime", "value": "anytime"}, {"label": "3 months notice", "value": "3m"}, {"label": "1 year notice", "value": "1y"}, {"label": "Locked period is okay", "value": "locked_ok"}]', 
     true, 15, 'constraints'),
    
    (cfa_framework_id, 'preferences', 'Any specific investment preferences? (Optional)', 'text', 
     '{"placeholder": "e.g., tax efficiency, ESG focus, dividend preference"}', 
     false, 16, 'constraints')
    ON CONFLICT (framework_id, qkey) DO NOTHING;
    
    RAISE NOTICE 'Inserted CFA framework questions for framework ID: %', cfa_framework_id;
END $$;

-- 8. Fix RLS policies for other tables that might be causing issues
-- Ensure assessment_submissions can be inserted by public users
DROP POLICY IF EXISTS "Public can insert assessment submissions" ON assessment_submissions;
CREATE POLICY "Public can insert assessment submissions" ON assessment_submissions
    FOR INSERT WITH CHECK (true);

-- Ensure leads can be inserted by public users
DROP POLICY IF EXISTS "Public can insert leads" ON leads;
CREATE POLICY "Public can insert leads" ON leads
    FOR INSERT WITH CHECK (true);

-- Ensure assessment_links can be viewed by public
DROP POLICY IF EXISTS "Public can view active assessment links" ON assessment_links;
CREATE POLICY "Public can view active assessment links" ON assessment_links
    FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- 9. Grant necessary permissions
GRANT SELECT ON framework_questions TO anon, authenticated;
GRANT SELECT ON risk_frameworks TO anon, authenticated;
GRANT SELECT ON question_bank TO anon, authenticated;
GRANT INSERT ON assessment_submissions TO anon, authenticated;
GRANT INSERT ON leads TO anon, authenticated;
GRANT SELECT ON assessment_links TO anon, authenticated;

-- 10. Verify the setup
SELECT 'CFA Framework Questions Count:' as info, COUNT(*) as count FROM framework_questions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'cfa_three_pillar_v1');
