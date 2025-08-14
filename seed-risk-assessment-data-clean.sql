-- Clean seed data without Edward Jones framework
-- This file contains only the working frameworks

-- Insert frameworks
INSERT INTO risk_frameworks (code, name, description, engine) VALUES
('cfa_three_pillar_v1', 'CFA Three Pillar v1', 'Three-pillar approach: capacity, tolerance, and need', 'three_pillar'),
('dsp_style_10q_v1', 'DSP Style 10-Question v1', 'India-style 10-question framework', 'weighted_sum'),
('nippon_style_v1', 'Nippon Style v1', 'Japanese-style risk assessment framework', 'weighted_sum');

-- Insert framework versions
INSERT INTO risk_framework_versions (framework_id, version, is_default, created_at) VALUES
((SELECT id FROM risk_frameworks WHERE code = 'cfa_three_pillar_v1'), 1, true, NOW()),
((SELECT id FROM risk_frameworks WHERE code = 'dsp_style_10q_v1'), 1, true, NOW()),
((SELECT id FROM risk_frameworks WHERE code = 'nippon_style_v1'), 1, true, NOW());

-- Insert questions into question bank
INSERT INTO question_bank (qkey, label, qtype, options, module) VALUES
-- CFA Three Pillar questions
('capacity', 'What is your current financial capacity for investment?', 'select', '{"options": ["High - Significant disposable income", "Medium - Moderate disposable income", "Low - Limited disposable income"]}', 'Financial Capacity'),
('tolerance', 'How do you typically react to market volatility?', 'select', '{"options": ["Stay calm and hold", "Some concern but generally hold", "Significant anxiety and may sell"]}', 'Risk Tolerance'),
('need', 'What is your primary investment goal?', 'select', '{"options": ["Capital preservation", "Balanced growth", "Aggressive growth"]}', 'Investment Need'),

-- DSP Style questions
('dependents', 'How many dependents do you have?', 'select', '{"options": ["0-1", "2-3", "4+"]}', 'Personal'),
('income_bracket', 'What is your annual income bracket?', 'select', '{"options": ["Below 5L", "5L-10L", "10L-25L", "25L+"]}', 'Financial'),
('income_security', 'How secure is your income?', 'select', '{"options": ["Very secure", "Moderately secure", "Less secure"]}', 'Financial'),
('market_knowledge', 'How would you rate your market knowledge?', 'select', '{"options": ["Expert", "Intermediate", "Beginner"]}', 'Knowledge'),
('emi_ratio', 'What is your EMI to income ratio?', 'select', '{"options": ["Below 30%", "30-50%", "Above 50%"]}', 'Financial'),
('gain_loss_tradeoff', 'How do you view gains vs losses?', 'select', '{"options": ["Equal importance", "Gains more important", "Losses more concerning"]}', 'Psychology'),
('drawdown_reaction', 'How do you react to portfolio drawdowns?', 'select', '{"options": ["Stay invested", "Partial withdrawal", "Complete withdrawal"]}', 'Psychology'),
('education', 'What is your education level?', 'select', '{"options": ["High school", "Graduate", "Post-graduate"]}', 'Personal'),
('age', 'What is your age?', 'select', '{"options": ["18-30", "31-45", "46-60", "60+"]}', 'Personal'),
('liquidity_withdrawal_2y', 'How much might you need in next 2 years?', 'select', '{"options": ["Less than 10%", "10-25%", "25-50%", "More than 50%"]}', 'Financial'),

-- Nippon Style questions
('horizon', 'What is your investment horizon?', 'select', '{"options": ["1-3 years", "3-7 years", "7-15 years", "15+ years"]}', 'Time'),
('age', 'What is your age?', 'select', '{"options": ["18-30", "31-45", "46-60", "60+"]}', 'Personal'),
('market_knowledge', 'How would you rate your market knowledge?', 'select', '{"options": ["Expert", "Intermediate", "Beginner"]}', 'Knowledge'),
('income_security', 'How secure is your income?', 'select', '{"options": ["Very secure", "Moderately secure", "Less secure"]}', 'Financial');

-- Insert framework question mappings
INSERT INTO framework_question_map (framework_version_id, qkey, required, order_index) VALUES
-- CFA Three Pillar mapping
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'cfa_three_pillar_v1') AND version = 1), 'capacity', true, 1),
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'cfa_three_pillar_v1') AND version = 1), 'tolerance', true, 2),
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'cfa_three_pillar_v1') AND version = 1), 'need', true, 3),

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
((SELECT id FROM risk_framework_versions WHERE framework_id = (SELECT id FROM risk_frameworks WHERE code = 'nippon_style_v1') AND version = 1), 'income_security', true, 4);
