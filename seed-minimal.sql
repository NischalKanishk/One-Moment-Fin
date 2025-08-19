-- Minimal seed script that handles missing columns
-- Run this in Supabase SQL Editor

-- 1. Check if CFA framework exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM risk_frameworks WHERE code = 'cfa_three_pillar') THEN
        -- Try to insert with description column if it exists
        BEGIN
            INSERT INTO risk_frameworks (code, name, description, engine, is_active)
            VALUES ('cfa_three_pillar', 'CFA Three Pillar Framework', 'Comprehensive risk assessment framework', 'three_pillar', true);
        EXCEPTION WHEN undefined_column THEN
            -- If description column doesn't exist, insert without it
            INSERT INTO risk_frameworks (code, name, engine, is_active)
            VALUES ('cfa_three_pillar', 'CFA Three Pillar Framework', 'three_pillar', true);
        END;
        RAISE NOTICE 'CFA framework created';
    ELSE
        RAISE NOTICE 'CFA framework already exists';
    END IF;
END $$;

-- 2. Create framework version if it doesn't exist
DO $$
DECLARE
    framework_id UUID;
BEGIN
    SELECT id INTO framework_id FROM risk_frameworks WHERE code = 'cfa_three_pillar';
    
    IF NOT EXISTS (SELECT 1 FROM risk_framework_versions WHERE framework_id = framework_id AND version = 1) THEN
        INSERT INTO risk_framework_versions (framework_id, version, config, is_default, is_active)
        VALUES (
            framework_id,
            1,
            '{"scoring_method": "weighted_sum", "risk_categories": ["low", "medium", "high"]}'::jsonb,
            true,
            true
        );
        RAISE NOTICE 'Framework version created';
    ELSE
        RAISE NOTICE 'Framework version already exists';
    END IF;
END $$;

-- 3. Insert basic questions if they don't exist
INSERT INTO question_bank (qkey, label, qtype, options, module, is_active) VALUES
('investment_horizon', 'What is your investment horizon?', 'single', '["Less than 1 year", "1-3 years", "3-5 years", "More than 5 years"]', 'capacity', true),
('risk_tolerance', 'How would you react to a 20% drop in your investment value?', 'single', '["Sell immediately", "Sell some", "Hold", "Buy more"]', 'tolerance', true),
('investment_goals', 'What are your primary investment goals?', 'single', '["Capital preservation", "Income generation", "Growth", "Tax efficiency"]', 'need', true)
ON CONFLICT (qkey) DO NOTHING;

-- 4. Map questions to framework
DO $$
DECLARE
    framework_version_id UUID;
BEGIN
    SELECT fv.id INTO framework_version_id 
    FROM risk_framework_versions fv
    JOIN risk_frameworks rf ON rf.id = fv.framework_id
    WHERE rf.code = 'cfa_three_pillar' AND fv.version = 1;
    
    INSERT INTO framework_question_map (framework_version_id, question_id, qkey, required, order_index)
    SELECT
        framework_version_id,
        qb.id,
        qb.qkey,
        true,
        CASE qb.qkey
            WHEN 'investment_horizon' THEN 1
            WHEN 'risk_tolerance' THEN 2
            WHEN 'investment_goals' THEN 3
        END
    FROM question_bank qb
    WHERE qb.qkey IN ('investment_horizon', 'risk_tolerance', 'investment_goals')
    ON CONFLICT (framework_version_id, qkey) DO NOTHING;
    
    RAISE NOTICE 'Questions mapped to framework';
END $$;

-- 5. Verify setup
SELECT 
    'Setup Complete' as status,
    COUNT(rf.id) as frameworks,
    COUNT(fv.id) as versions,
    COUNT(qb.id) as questions,
    COUNT(fqm.id) as mappings
FROM risk_frameworks rf
LEFT JOIN risk_framework_versions fv ON fv.framework_id = rf.id
LEFT JOIN framework_question_map fqm ON fqm.framework_version_id = fv.id
LEFT JOIN question_bank qb ON qb.id = fqm.question_id
WHERE rf.code = 'cfa_three_pillar';
