-- Migration: Implement CFA Three-Pillar as single fixed framework
-- This migration creates the necessary tables and data for the CFA Three-Pillar framework
-- while maintaining backward compatibility with existing data.

-- 1. Create risk_frameworks table if not exists
CREATE TABLE IF NOT EXISTS risk_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,          -- 'cfa_three_pillar_v1'
  name TEXT NOT NULL,                 -- 'CFA Three-Pillar (Capacity, Tolerance, Need)'
  engine TEXT NOT NULL,               -- 'three_pillar'
  config JSONB NOT NULL,              -- scoring config
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create framework_questions table if not exists
CREATE TABLE IF NOT EXISTS framework_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES risk_frameworks(id) ON DELETE CASCADE,
  qkey TEXT NOT NULL,                 -- stable key (e.g., 'age', 'drawdown_reaction')
  label TEXT NOT NULL,
  qtype TEXT NOT NULL,                -- 'single' | 'multi' | 'scale' | 'number' | 'percent' | 'text'
  options JSONB,                      -- [{value:'<25', label:'Under 25'}, ...] when applicable
  module TEXT,                        -- 'profile' | 'capacity' | 'behavior' | 'need' | 'constraints'
  required BOOLEAN NOT NULL DEFAULT true,
  order_index INT NOT NULL DEFAULT 0,
  UNIQUE(framework_id, qkey)
);

-- 3. Add framework_id to assessments table if not exists
ALTER TABLE assessments 
  ADD COLUMN IF NOT EXISTS framework_id UUID REFERENCES risk_frameworks(id) ON DELETE RESTRICT;

-- 4. Add framework_id to assessment_submissions table if not exists
ALTER TABLE assessment_submissions 
  ADD COLUMN IF NOT EXISTS framework_id UUID REFERENCES risk_frameworks(id) ON DELETE RESTRICT;

-- 5. Add source_submission_id to leads table if not exists
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS source_submission_id UUID REFERENCES assessment_submissions(id) ON DELETE SET NULL;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_risk_frameworks_code ON risk_frameworks(code);
CREATE INDEX IF NOT EXISTS idx_framework_questions_framework_id ON framework_questions(framework_id);
CREATE INDEX IF NOT EXISTS idx_framework_questions_qkey ON framework_questions(qkey);
CREATE INDEX IF NOT EXISTS idx_framework_questions_order_index ON framework_questions(order_index);
CREATE INDEX IF NOT EXISTS idx_assessments_framework_id ON assessments(framework_id);
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_framework_id ON assessment_submissions(framework_id);
CREATE INDEX IF NOT EXISTS idx_leads_source_submission_id ON leads(source_submission_id);

-- 7. Insert CFA Three-Pillar framework
INSERT INTO risk_frameworks (code, name, engine, config) 
VALUES (
  'cfa_three_pillar_v1',
  'CFA Three-Pillar (Capacity, Tolerance, Need)',
  'three_pillar',
  '{
    "engine": "three_pillar",
    "capacity": {
      "inputs": [
        {"qkey": "age", "map": {"<25": 85, "25-35": 75, "36-50": 60, "51+": 40}},
        {"qkey": "liquidity_withdrawal_2y", "type": "percent", "transform": "100 - value"},
        {"qkey": "emi_ratio", "type": "percent", "transform": "100 - value"},
        {"qkey": "income_security", "map": {"Not secure": 25, "Somewhat secure": 50, "Fairly secure": 70, "Very secure": 90}}
      ],
      "weights": {"age": 0.25, "liquidity_withdrawal_2y": 0.30, "emi_ratio": 0.25, "income_security": 0.20}
    },
    "tolerance": {
      "inputs": [
        {"qkey": "drawdown_reaction", "map": {"Sell": 20, "Do nothing": 60, "Buy more": 85}},
        {"qkey": "gain_loss_tradeoff", "map": {"NoLossEvenIfLowGain": 20, "Loss8Gain22": 60, "Loss25Gain50": 85}},
        {"qkey": "market_knowledge", "map": {"1": 20, "2": 40, "3": 60, "4": 75, "5": 90}}
      ],
      "weights": {"drawdown_reaction": 0.45, "gain_loss_tradeoff": 0.35, "market_knowledge": 0.20}
    },
    "need": {
      "inputs": [
        {"qkey": "goal_required_return", "type": "percent", "scale": [0, 4, 6, 8, 10, 12, 15], "scores": [10, 30, 45, 60, 75, 85, 95]}
      ],
      "weights": {"goal_required_return": 1.0}
    },
    "decision": {
      "formula": "min(capacity, tolerance)",
      "warnings": [{"if": "need > capacity + 10", "message": "Required return exceeds risk capacity; revisit goals/savings."}],
      "bucket_bands": [
        {"min": 0, "max": 35, "bucket": "Conservative"},
        {"min": 36, "max": 55, "bucket": "Moderate"},
        {"min": 56, "max": 75, "bucket": "Growth"},
        {"min": 76, "max": 100, "bucket": "Aggressive"}
      ]
    }
  }'::jsonb
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  engine = EXCLUDED.engine,
  config = EXCLUDED.config;

-- 8. Insert CFA questions
WITH cfa_framework AS (
  SELECT id FROM risk_frameworks WHERE code = 'cfa_three_pillar_v1'
)
INSERT INTO framework_questions (framework_id, qkey, label, qtype, options, module, required, order_index)
SELECT 
  cf.id,
  q.qkey,
  q.label,
  q.qtype,
  q.options,
  q.module,
  q.required,
  q.order_index
FROM cfa_framework cf
CROSS JOIN (VALUES
  -- Profile & Goals
  ('primary_goal', 'What is your primary investment goal?', 'single', 
   '[{"value": "Wealth build", "label": "Wealth build"}, {"value": "Child education", "label": "Child education"}, {"value": "House", "label": "House"}, {"value": "Retirement", "label": "Retirement"}, {"value": "Other", "label": "Other"}]'::jsonb, 
   'profile', true, 1),
  
  ('horizon', 'What is your investment time horizon?', 'single',
   '[{"value": "<1y", "label": "Less than 1 year"}, {"value": "1-3y", "label": "1-3 years"}, {"value": "3-5y", "label": "3-5 years"}, {"value": "5-10y", "label": "5-10 years"}, {"value": ">10y", "label": "More than 10 years"}]'::jsonb,
   'profile', true, 2),
  
  -- Capacity (Ability)
  ('age', 'What is your age?', 'single',
   '[{"value": "<25", "label": "Under 25"}, {"value": "25-35", "label": "25-35"}, {"value": "36-50", "label": "36-50"}, {"value": "51+", "label": "51+"}]'::jsonb,
   'capacity', true, 3),
  
  ('dependents', 'How many dependents do you have?', 'single',
   '[{"value": "0", "label": "0"}, {"value": "1", "label": "1"}, {"value": "2", "label": "2"}, {"value": "3", "label": "3"}, {"value": "4+", "label": "4+"}]'::jsonb,
   'capacity', true, 4),
  
  ('income_security', 'How secure is your income?', 'single',
   '[{"value": "Not secure", "label": "Not secure"}, {"value": "Somewhat secure", "label": "Somewhat secure"}, {"value": "Fairly secure", "label": "Fairly secure"}, {"value": "Very secure", "label": "Very secure"}]'::jsonb,
   'capacity', true, 5),
  
  ('emi_ratio', 'What percentage of your income goes towards EMIs/loan payments?', 'percent',
   '{"min": 0, "max": 100, "step": 5}'::jsonb,
   'capacity', true, 6),
  
  ('liquidity_withdrawal_2y', 'What percentage of your investments might you need to withdraw in the next 2 years?', 'percent',
   '{"min": 0, "max": 100, "step": 5}'::jsonb,
   'capacity', true, 7),
  
  ('emergency_fund_months', 'How many months of expenses do you have in emergency funds?', 'single',
   '[{"value": "<3", "label": "Less than 3 months"}, {"value": "3-6", "label": "3-6 months"}, {"value": "6-12", "label": "6-12 months"}, {"value": ">12", "label": "More than 12 months"}]'::jsonb,
   'capacity', true, 8),
  
  -- Knowledge & Experience
  ('market_knowledge', 'How would you rate your knowledge of financial markets? (1-5)', 'scale',
   '{"min": 1, "max": 5, "labels": ["Beginner", "Basic", "Intermediate", "Advanced", "Expert"]}'::jsonb,
   'knowledge', true, 9),
  
  ('investing_experience', 'What is your investment experience?', 'single',
   '[{"value": "None", "label": "None"}, {"value": "<3y", "label": "Less than 3 years"}, {"value": "3-10y", "label": "3-10 years"}, {"value": ">10y", "label": "More than 10 years"}]'::jsonb,
   'knowledge', true, 10),
  
  -- Behavioral Tolerance
  ('drawdown_reaction', 'How would you react if your investment lost 20% in a month?', 'single',
   '[{"value": "Sell", "label": "Sell immediately"}, {"value": "Do nothing", "label": "Hold and wait"}, {"value": "Buy more", "label": "Buy more at lower prices"}]'::jsonb,
   'behavior', true, 11),
  
  ('gain_loss_tradeoff', 'Which scenario would you prefer?', 'single',
   '[{"value": "NoLossEvenIfLowGain", "label": "No loss even if returns are low"}, {"value": "Loss8Gain22", "label": "Risk 8% loss for 22% gain"}, {"value": "Loss25Gain50", "label": "Risk 25% loss for 50% gain"}]'::jsonb,
   'behavior', true, 12),
  
  ('loss_threshold', 'What is the maximum loss you can tolerate?', 'single',
   '[{"value": "<3%", "label": "Less than 3%"}, {"value": "3-8%", "label": "3-8%"}, {"value": "9-15%", "label": "9-15%"}, {"value": ">15%", "label": "More than 15%"}]'::jsonb,
   'behavior', true, 13),
  
  -- Need
  ('goal_required_return', 'What annual return do you need to achieve your goals?', 'percent',
   '{"min": 0, "max": 20, "step": 1}'::jsonb,
   'need', true, 14),
  
  -- Constraints
  ('liquidity_constraint', 'How quickly might you need to access your investments?', 'single',
   '[{"value": "anytime", "label": "Anytime"}, {"value": "3m", "label": "3 months notice"}, {"value": "1y", "label": "1 year notice"}, {"value": "locked_ok", "label": "Locked period is okay"}]'::jsonb,
   'constraints', true, 15),
  
  ('preferences', 'Any specific investment preferences? (Optional)', 'text',
   '{"placeholder": "e.g., tax efficiency, ESG focus, dividend preference"}'::jsonb,
   'constraints', false, 16)
) AS q(qkey, label, qtype, options, module, required, order_index)
ON CONFLICT (framework_id, qkey) DO UPDATE SET
  label = EXCLUDED.label,
  qtype = EXCLUDED.qtype,
  options = EXCLUDED.options,
  module = EXCLUDED.module,
  required = EXCLUDED.required,
  order_index = EXCLUDED.order_index;

-- 9. Update existing assessments to use CFA framework
UPDATE assessments 
SET framework_id = (SELECT id FROM risk_frameworks WHERE code = 'cfa_three_pillar_v1')
WHERE framework_id IS NULL;

-- 10. Update existing assessment_submissions to use CFA framework
UPDATE assessment_submissions 
SET framework_id = (SELECT id FROM risk_frameworks WHERE code = 'cfa_three_pillar_v1')
WHERE framework_id IS NULL;

-- 11. Create a function to get CFA framework questions
CREATE OR REPLACE FUNCTION get_cfa_questions()
RETURNS TABLE (
  id UUID,
  qkey TEXT,
  label TEXT,
  qtype TEXT,
  options JSONB,
  module TEXT,
  required BOOLEAN,
  order_index INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fq.id,
    fq.qkey,
    fq.label,
    fq.qtype,
    fq.options,
    fq.module,
    fq.required,
    fq.order_index
  FROM framework_questions fq
  JOIN risk_frameworks rf ON fq.framework_id = rf.id
  WHERE rf.code = 'cfa_three_pillar_v1'
  ORDER BY fq.order_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create a function to get CFA framework config
CREATE OR REPLACE FUNCTION get_cfa_config()
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT config 
    FROM risk_frameworks 
    WHERE code = 'cfa_three_pillar_v1'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
