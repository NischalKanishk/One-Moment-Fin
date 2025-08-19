-- Seed CFA Three Pillar Framework with Questions
-- This script populates the database with the CFA framework structure

-- 1. Insert CFA Framework
INSERT INTO risk_frameworks (code, name, description, engine, is_active) 
VALUES ('cfa_three_pillar', 'CFA Three Pillar Framework', 'Comprehensive risk assessment framework based on CFA principles', 'three_pillar', true)
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  engine = EXCLUDED.engine,
  is_active = EXCLUDED.is_active;

-- 2. Insert Framework Version
INSERT INTO risk_framework_versions (framework_id, version, config, is_default, is_active)
SELECT 
  rf.id,
  1,
  '{"scoring_method": "weighted_sum", "risk_categories": ["low", "medium", "high"], "weights": {"capacity": 0.4, "tolerance": 0.3, "need": 0.3}}'::jsonb,
  true,
  true
FROM risk_frameworks rf
WHERE rf.code = 'cfa_three_pillar'
ON CONFLICT (framework_id, version) DO UPDATE SET
  config = EXCLUDED.config,
  is_default = EXCLUDED.is_default,
  is_active = EXCLUDED.is_active;

-- 3. Insert Questions into Question Bank
INSERT INTO question_bank (qkey, label, qtype, options, module, is_active) VALUES
-- Investment Capacity Questions
('investment_horizon', 'What is your investment horizon?', 'single', '["Less than 1 year", "1-3 years", "3-5 years", "More than 5 years"]', 'capacity', true),
('investment_amount', 'What percentage of your total assets do you plan to invest?', 'single', '["Less than 10%", "10-25%", "25-50%", "More than 50%"]', 'capacity', true),
('income_stability', 'How stable is your current income?', 'single', '["Very unstable", "Somewhat unstable", "Stable", "Very stable"]', 'capacity', true),
('emergency_fund', 'Do you have an emergency fund covering 6+ months of expenses?', 'single', '["No", "Less than 3 months", "3-6 months", "More than 6 months"]', 'capacity', true),

-- Risk Tolerance Questions
('risk_tolerance', 'How would you react to a 20% drop in your investment value?', 'single', '["Sell immediately", "Sell some", "Hold", "Buy more"]', 'tolerance', true),
('volatility_comfort', 'How comfortable are you with investment volatility?', 'single', '["Very uncomfortable", "Somewhat uncomfortable", "Comfortable", "Very comfortable"]', 'tolerance', true),
('loss_aversion', 'What is your maximum acceptable loss on investments?', 'single', '["0-5%", "5-15%", "15-25%", "More than 25%"]', 'tolerance', true),
('market_timing', 'Do you believe in timing the market?', 'single', '["Strongly disagree", "Disagree", "Agree", "Strongly agree"]', 'tolerance', true),

-- Investment Need Questions
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

-- 4. Map Questions to Framework
INSERT INTO framework_question_map (framework_version_id, question_id, qkey, required, order_index)
SELECT 
  fv.id,
  qb.id,
  qb.qkey,
  true,
  CASE qb.qkey
    -- Capacity questions (order 1-4)
    WHEN 'investment_horizon' THEN 1
    WHEN 'investment_amount' THEN 2
    WHEN 'income_stability' THEN 3
    WHEN 'emergency_fund' THEN 4
    -- Tolerance questions (order 5-8)
    WHEN 'risk_tolerance' THEN 5
    WHEN 'volatility_comfort' THEN 6
    WHEN 'loss_aversion' THEN 7
    WHEN 'market_timing' THEN 8
    -- Need questions (order 9-12)
    WHEN 'investment_goals' THEN 9
    WHEN 'investment_experience' THEN 10
    WHEN 'financial_knowledge' THEN 11
    WHEN 'professional_advice' THEN 12
  END
FROM risk_framework_versions fv
JOIN risk_frameworks rf ON rf.id = fv.framework_id
JOIN question_bank qb ON qb.is_active = true
WHERE rf.code = 'cfa_three_pillar' 
  AND fv.is_default = true
  AND qb.module IN ('capacity', 'tolerance', 'need')
ON CONFLICT (framework_version_id, qkey) DO UPDATE SET
  question_id = EXCLUDED.question_id,
  required = EXCLUDED.required,
  order_index = EXCLUDED.order_index;

-- 5. Create a default assessment form for users
-- This will be created dynamically when users access the system

-- 6. Verify the setup
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
