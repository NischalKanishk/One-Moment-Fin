-- Seed Risk Assessment System Data
-- This script populates the risk assessment system with frameworks and questions
-- Run this after the migration script

-- 1) Seed the question bank with canonical qkeys
INSERT INTO question_bank (qkey, label, qtype, options, module) VALUES
-- Profile & Goals
('primary_goal', 'What is your primary investment goal?', 'single', 
 '["Wealth building", "Child education", "House purchase", "Retirement planning", "Other"]', 'profile'),
('horizon', 'What is your investment time horizon?', 'single', 
 '["<1 year", "1-3 years", "3-5 years", "5-10 years", ">10 years"]', 'profile'),

-- Capacity
('age', 'What is your age?', 'single', 
 '["<25", "25-35", "36-50", "51+"]', 'capacity'),
('dependents', 'How many dependents do you have?', 'single', 
 '["0", "1", "2", "3", "4+"]', 'capacity'),
('income_security', 'How secure is your income?', 'single', 
 '["Not secure", "Somewhat secure", "Fairly secure", "Very secure"]', 'capacity'),
('emi_ratio', 'What percentage of your income goes towards EMIs?', 'single', 
 '["0%", "1-25%", "26-50%", "51-75%", ">75%"]', 'capacity'),
('liquidity_withdrawal_2y', 'What percentage of your investments might you need to withdraw in the next 2 years?', 'percent', 
 '{"min": 0, "max": 100}', 'capacity'),
('emergency_fund_months', 'How many months of expenses do you have in emergency funds?', 'single', 
 '["<3 months", "3-6 months", "6-12 months", ">12 months"]', 'capacity'),

-- Knowledge & Experience
('market_knowledge', 'How would you rate your knowledge of financial markets?', 'single', 
 '["Low", "Medium", "High"]', 'knowledge'),
('investing_experience', 'What is your investing experience?', 'single', 
 '["None", "<3 years", "3-10 years", ">10 years"]', 'knowledge'),

-- Behavioral Tolerance
('drawdown_reaction', 'How would you react to a 20% drop in your investment value?', 'single', 
 '["Sell immediately", "Do nothing", "Buy more"]', 'behavior'),
('gain_loss_tradeoff', 'Which scenario would you prefer?', 'single', 
 '["No loss even if low gain", "8% loss for 22% gain", "25% loss for 50% gain"]', 'behavior'),
('loss_threshold', 'What is your maximum acceptable loss in a year?', 'single', 
 '["<3%", "3-8%", "9-15%", ">15%"]', 'behavior'),

-- Need
('goal_required_return', 'What annual return do you need to achieve your goals?', 'single', 
 '["<4%", "4-6%", "6-8%", "8-10%", "10-12%", ">12%"]', 'need'),

-- Constraints
('liquidity_constraint', 'How quickly do you need access to your investments?', 'single', 
 '["Anytime", "3 months notice", "1 year notice", "Locked period is okay"]', 'constraints'),
('preferences', 'Any specific investment preferences? (e.g., tax sensitivity, ESG focus)', 'text', 
 '{"placeholder": "Enter your preferences..."}', 'constraints'),

-- Edward Jones specific questions
('edj_q1', 'How would you describe your investment knowledge?', 'single', 
 '["A", "B", "C", "D"]', 'capacity'),
('edj_q2', 'How would you react to a significant market decline?', 'single', 
 '["A", "B", "C"]', 'behavior'),
('edj_q3', 'What is your time horizon for this investment?', 'single', 
 '["A", "B", "C"]', 'profile'),
('edj_q4', 'How important is it to maintain your principal?', 'single', 
 '["A", "B", "C"]', 'capacity'),
('edj_q5', 'What is your primary investment objective?', 'single', 
 '["A", "B", "C", "D"]', 'profile'),
('edj_q6', 'How would you describe your risk tolerance?', 'single', 
 '["A", "B", "C"]', 'behavior')
ON CONFLICT (qkey) DO NOTHING;

-- 2) Seed risk frameworks
INSERT INTO risk_frameworks (code, name, description, engine) VALUES
('edj_6q_2023', 'Edward Jones 6-Question 2023', 'Six-question risk assessment framework with explicit scoring', 'weighted_sum'),
('cfa_three_pillar_v1', 'CFA Three Pillar v1', 'Three-pillar approach: capacity, tolerance, and need', 'three_pillar'),
('dsp_style_10q_v1', 'DSP Style 10-Question v1', 'India-style 10-question framework covering capacity/tolerance/knowledge', 'weighted_sum'),
('nippon_style_v1', 'Nippon Style v1', 'Minimalist framework focusing on horizon, age, knowledge, and income stability', 'weighted_sum')
ON CONFLICT (code) DO NOTHING;

-- 3) Seed framework versions with configs
INSERT INTO risk_framework_versions (framework_id, version, config, is_default) VALUES
-- Edward Jones framework
((SELECT id FROM risk_frameworks WHERE code = 'edj_6q_2023'), 1, 
'{
  "engine": "weighted_sum",
  "questions": [
    {"qkey":"edj_q1","map":{"A":0,"B":5,"C":12,"D":17}},
    {"qkey":"edj_q2","map":{"A":0,"B":8,"C":16}},
    {"qkey":"edj_q3","map":{"A":0,"B":8,"C":16}},
    {"qkey":"edj_q4","map":{"A":0,"B":8,"C":17}},
    {"qkey":"edj_q5","map":{"A":0,"B":6,"C":12,"D":17}},
    {"qkey":"edj_q6","map":{"A":0,"B":8,"C":17}}
  ],
  "bands":[
    {"min":0,"max":18,"bucket":"Low"},
    {"min":19,"max":39,"bucket":"Low to Medium"},
    {"min":40,"max":59,"bucket":"Medium"},
    {"min":60,"max":79,"bucket":"Medium to High"},
    {"min":80,"max":102,"bucket":"High"}
  ],
  "scale_max":102
}', false),

-- CFA Three Pillar framework
((SELECT id FROM risk_frameworks WHERE code = 'cfa_three_pillar_v1'), 1, 
'{
  "engine":"three_pillar",
  "capacity":{
    "inputs":[
      {"qkey":"age","map":{"<25":85,"25-35":75,"36-50":60,"51+":40}},
      {"qkey":"liquidity_withdrawal_2y","type":"percent","transform":"100 - value"},
      {"qkey":"emi_ratio","type":"percent","transform":"100 - value"},
      {"qkey":"income_security","map":{"Not secure":25,"Somewhat secure":50,"Fairly secure":70,"Very secure":90}}
    ],
    "weights":{"age":0.25,"liquidity_withdrawal_2y":0.30,"emi_ratio":0.25,"income_security":0.20}
  },
  "tolerance":{
    "inputs":[
      {"qkey":"drawdown_reaction","map":{"Sell":20,"Do nothing":60,"Buy more":85}},
      {"qkey":"gain_loss_tradeoff","map":{"NoLossEvenIfLowGain":20,"Loss8Gain22":60,"Loss25Gain50":85}},
      {"qkey":"market_knowledge","map":{"Low":20,"Medium":40,"High":60}}
    ],
    "weights":{"drawdown_reaction":0.45,"gain_loss_tradeoff":0.35,"market_knowledge":0.20}
  },
  "need":{
    "inputs":[
      {"qkey":"goal_required_return","type":"percent","scale":[0,4,6,8,10,12,15],"scores":[10,30,45,60,75,85,95]}
    ],
    "weights":{"goal_required_return":1.0}
  },
  "decision":{
    "formula":"min(capacity, tolerance)",
    "warnings":[{"if":"need > capacity + 10","message":"Required return exceeds risk capacity; revisit goals/savings."}],
    "bucket_bands":[
      {"min":0,"max":35,"bucket":"Conservative"},
      {"min":36,"max":55,"bucket":"Moderate"},
      {"min":56,"max":75,"bucket":"Growth"},
      {"min":76,"max":100,"bucket":"Aggressive"}
    ]
  }
}', true),

-- DSP Style framework
((SELECT id FROM risk_frameworks WHERE code = 'dsp_style_10q_v1'), 1, 
'{
  "engine":"weighted_sum",
  "questions":[
    {"qkey":"dependents","map":{"0":15,"1":12,"2":8,"3":4,"4+":0}},
    {"qkey":"income_bracket","map":{"<5L":0,"5-25L":5,"25-50L":8,"50L-1C":12,"1-3C":15,">3C":18}},
    {"qkey":"income_security","map":{"Not secure":0,"Somewhat secure":6,"Fairly secure":12,"Very secure":18}},
    {"qkey":"market_knowledge","map":{"Low":0,"Medium":5,"High":10}},
    {"qkey":"emi_ratio","map":{"75-100%":0,"50-75%":4,"25-50%":9,"1-25%":14,"0%":18}},
    {"qkey":"gain_loss_tradeoff","map":{"NoLossEvenIfLowGain":0,"Loss8Gain22":10,"Loss25Gain50":18}},
    {"qkey":"drawdown_reaction","map":{"Sell":0,"Do nothing":10,"Buy more":18}},
    {"qkey":"education","map":{"<12th":0,"12th":4,"Bachelors":10,"Postgrad+":14}},
    {"qkey":"age","map":{"<25":18,"25-35":15,"36-50":8,"51+":2}},
    {"qkey":"liquidity_withdrawal_2y","type":"percent","transform":"100 - value","max":18}
  ],
  "bands":[
    {"min":0,"max":45,"bucket":"Conservative"},
    {"min":46,"max":90,"bucket":"Moderate"},
    {"min":91,"max":130,"bucket":"Growth"},
    {"min":131,"max":160,"bucket":"Aggressive"}
  ],
  "scale_max":160
}', false),

-- Nippon Style framework
((SELECT id FROM risk_frameworks WHERE code = 'nippon_style_v1'), 1, 
'{
  "engine":"weighted_sum",
  "questions":[
    {"qkey":"horizon","map":{"<1y":0,"1-3y":5,"3-5y":10,">5y":15}},
    {"qkey":"age","map":{"51+":0,"36-50":5,"25-35":10,"<25":12}},
    {"qkey":"market_knowledge","map":{"Low":0,"Medium":6,"High":12}},
    {"qkey":"income_security","map":{"Not secure":0,"Somewhat":4,"Fairly":8,"Very":12}}
  ],
  "bands":[
    {"min":0,"max":15,"bucket":"Conservative"},
    {"min":16,"max":30,"bucket":"Moderate"},
    {"min":31,"max":51,"bucket":"Aggressive"}
  ],
  "scale_max":51
}', false)
ON CONFLICT (framework_id, version) DO NOTHING;

-- 4) Create framework question mappings
INSERT INTO framework_question_map (framework_version_id, qkey, required, order_index) VALUES
-- Edward Jones mapping
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'edj_6q_2023') AND version = 1), 'edj_q1', true, 1),
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'edj_6q_2023') AND version = 1), 'edj_q2', true, 2),
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'edj_6q_2023') AND version = 1), 'edj_q3', true, 3),
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'edj_6q_2023') AND version = 1), 'edj_q4', true, 4),
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'edj_6q_2023') AND version = 1), 'edj_q5', true, 5),
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'edj_6q_2023') AND version = 1), 'edj_q6', true, 6),

-- CFA Three Pillar mapping
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'cfa_three_pillar_v1') AND version = 1), 'age', true, 1),
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'cfa_three_pillar_v1') AND version = 1), 'liquidity_withdrawal_2y', true, 2),
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'cfa_three_pillar_v1') AND version = 1), 'emi_ratio', true, 3),
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'cfa_three_pillar_v1') AND version = 1), 'income_security', true, 4),
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'cfa_three_pillar_v1') AND version = 1), 'drawdown_reaction', true, 5),
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'cfa_three_pillar_v1') AND version = 1), 'gain_loss_tradeoff', true, 6),
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'cfa_three_pillar_v1') AND version = 1), 'market_knowledge', true, 7),
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'cfa_three_pillar_v1') AND version = 1), 'goal_required_return', true, 8),

-- DSP Style mapping
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'dsp_style_10q_v1') AND version = 1), 'dependents', true, 1),
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'dsp_style_10q_v1') AND version = 1), 'income_bracket', true, 2),
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'dsp_style_10q_v1') AND version = 1), 'income_security', true, 3),
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'dsp_style_10q_v1') AND version = 1), 'market_knowledge', true, 4),
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'dsp_style_10q_v1') AND version = 1), 'emi_ratio', true, 5),
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'dsp_style_10q_v1') AND version = 1), 'gain_loss_tradeoff', true, 6),
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'dsp_style_10q_v1') AND version = 1), 'drawdown_reaction', true, 7),
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'dsp_style_10q_v1') AND version = 1), 'education', true, 8),
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'dsp_style_10q_v1') AND version = 1), 'age', true, 9),
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'dsp_style_10q_v1') AND version = 1), 'liquidity_withdrawal_2y', true, 10),

-- Nippon Style mapping
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'nippon_style_v1') AND version = 1), 'horizon', true, 1),
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'nippon_style_v1') AND version = 1), 'age', true, 2),
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'nippon_style_v1') AND version = 1), 'market_knowledge', true, 3),
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'nippon_style_v1') AND version = 1), 'income_security', true, 4)
ON CONFLICT DO NOTHING;

-- Seed complete message
DO $$
BEGIN
    RAISE NOTICE 'Risk Assessment System seed data completed successfully!';
    RAISE NOTICE 'Question bank populated with % questions', (SELECT COUNT(*) FROM question_bank);
    RAISE NOTICE 'Risk frameworks created: %', (SELECT COUNT(*) FROM risk_frameworks);
    RAISE NOTICE 'Framework versions created: %', (SELECT COUNT(*) FROM risk_framework_versions);
    RAISE NOTICE 'Question mappings created: %', (SELECT COUNT(*) FROM framework_question_map);
    RAISE NOTICE 'Default framework set to: CFA Three Pillar v1';
    RAISE NOTICE 'Next step: Update existing assessments to use the new framework system';
END $$;
