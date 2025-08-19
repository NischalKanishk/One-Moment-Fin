-- Seed CFA Three Pillar Framework with Questions
-- This script populates the database with the CFA framework structure
-- It first checks what exists and handles missing columns gracefully

-- 1. Check if CFA framework already exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM risk_frameworks WHERE code = 'cfa_three_pillar') THEN
        RAISE NOTICE 'CFA framework already exists, skipping creation';
    ELSE
        -- Insert CFA Framework (without description if column doesn't exist)
        INSERT INTO risk_frameworks (code, name, engine, is_active)
        VALUES ('cfa_three_pillar', 'CFA Three Pillar Framework', 'three_pillar', true);
        RAISE NOTICE 'CFA framework created successfully';
    END IF;
END $$;

-- 2. Check if framework version exists
DO $$
DECLARE
    framework_id UUID;
    version_id UUID;
BEGIN
    -- Get the framework ID
    SELECT id INTO framework_id FROM risk_frameworks WHERE code = 'cfa_three_pillar';
    
    IF framework_id IS NULL THEN
        RAISE EXCEPTION 'CFA framework not found';
    END IF;
    
    -- Check if version exists
    IF EXISTS (SELECT 1 FROM risk_framework_versions WHERE framework_id = framework_id AND version = 1) THEN
        RAISE NOTICE 'CFA framework version already exists, skipping creation';
        SELECT id INTO version_id FROM risk_framework_versions WHERE framework_id = framework_id AND version = 1;
    ELSE
        -- Insert Framework Version
        INSERT INTO risk_framework_versions (framework_id, version, config, is_default, is_active)
        VALUES (
            framework_id,
            1,
            '{"scoring_method": "weighted_sum", "risk_categories": ["low", "medium", "high"], "weights": {"capacity": 0.4, "tolerance": 0.3, "need": 0.3}}'::jsonb,
            true,
            true
        );
        SELECT id INTO version_id FROM risk_framework_versions WHERE framework_id = framework_id AND version = 1;
        RAISE NOTICE 'CFA framework version created successfully';
    END IF;
    
    -- 3. Insert Questions into Question Bank (only if they don't exist)
    INSERT INTO question_bank (qkey, label, qtype, options, module, is_active) VALUES
    ('investment_horizon', 'What is your investment horizon?', 'single', '["Less than 1 year", "1-3 years", "3-5 years", "More than 5 years"]', 'capacity', true),
    ('investment_amount', 'What percentage of your total assets do you plan to invest?', 'single', '["Less than 10%", "10-25%", "25-50%", "More than 50%"]', 'capacity', true),
    ('income_stability', 'How stable is your current income?', 'single', '["Very unstable", "Somewhat unstable", "Stable", "Very stable"]', 'capacity', true),
    ('emergency_fund', 'Do you have an emergency fund covering 6+ months of expenses?', 'single', '["No", "Less than 3 months", "3-6 months", "More than 6 months"]', 'capacity', true),
    ('risk_tolerance', 'How would you react to a 20% drop in your investment value?', 'single', '["Sell immediately", "Sell some", "Hold", "Buy more"]', 'tolerance', true),
    ('volatility_comfort', 'How comfortable are you with investment volatility?', 'single', '["Very uncomfortable", "Somewhat uncomfortable", "Comfortable", "Very comfortable"]', 'tolerance', true),
    ('loss_aversion', 'What is your maximum acceptable loss on investments?', 'single', '["0-5%", "5-15%", "15-25%", "More than 25%"]', 'tolerance', true),
    ('market_timing', 'Do you believe in timing the market?', 'single', '["Strongly disagree", "Disagree", "Agree", "Strongly agree"]', 'tolerance', true),
    ('investment_goals', 'What are your primary investment goals?', 'single', '["Capital preservation", "Income generation", "Growth", "Tax efficiency"]', 'need', true),
    ('investment_experience', 'How would you describe your investment experience?', 'single', '["Beginner", "Some experience", "Experienced", "Very experienced"]', 'need', true),
    ('financial_knowledge', 'How would you rate your financial knowledge?', 'single', '["Basic", "Intermediate", "Advanced", "Expert"]', 'need', true),
    ('professional_advice', 'Do you prefer professional financial advice?', 'single', '["Strongly prefer", "Somewhat prefer", "Neutral", "Prefer self-directed"]', 'need', true)
    ON CONFLICT (qkey) DO UPDATE SET
        label = EXCLUDED.label,
        qtype = EXCLUDED.qtype,
        options = EXCLUDED.options,
        module = EXCLUDED.module,
        is_active = EXCLUDED.is_active;
    
    RAISE NOTICE 'Questions inserted/updated successfully';
    
    -- 4. Map Questions to Framework (only if mapping doesn't exist)
    INSERT INTO framework_question_map (framework_version_id, question_id, qkey, required, order_index)
    SELECT
        version_id,
        qb.id,
        qb.qkey,
        true,
        CASE qb.qkey
            WHEN 'investment_horizon' THEN 1 WHEN 'investment_amount' THEN 2 WHEN 'income_stability' THEN 3 WHEN 'emergency_fund' THEN 4
            WHEN 'risk_tolerance' THEN 5 WHEN 'volatility_comfort' THEN 6 WHEN 'loss_aversion' THEN 7 WHEN 'market_timing' THEN 8
            WHEN 'investment_goals' THEN 9 WHEN 'investment_experience' THEN 10 WHEN 'financial_knowledge' THEN 11 WHEN 'professional_advice' THEN 12
        END
    FROM question_bank qb
    WHERE qb.is_active = true
      AND qb.module IN ('capacity', 'tolerance', 'need')
    ON CONFLICT (framework_version_id, qkey) DO UPDATE SET
        question_id = EXCLUDED.question_id,
        required = EXCLUDED.required,
        order_index = EXCLUDED.order_index;
    
    RAISE NOTICE 'Framework question mapping completed successfully';
END $$;

-- 5. Verify the setup
SELECT
    'Framework Setup Complete' as status,
    rf.name as framework_name,
    fv.version as framework_version,
    COUNT(fqm.id) as total_questions,
    COUNT(CASE WHEN qb.module = 'capacity' THEN 1 END) as capacity_questions,
    COUNT(CASE WHEN qb.module = 'tolerance' THEN 1 END) as tolerance_questions,
    COUNT(CASE WHEN qb.module = 'need' THEN 1 END) as need_questions
FROM risk_frameworks rf
JOIN risk_framework_versions fv ON fv.framework_id = rf.id
JOIN framework_question_map fqm ON fqm.framework_version_id = fv.id
JOIN question_bank qb ON qb.id = fqm.question_id
WHERE rf.code = 'cfa_three_pillar' AND fv.is_default = true
GROUP BY rf.name, fv.version;
