// Fixed Assessments API - Works with existing database structure
// This version gets questions directly from question_bank instead of the missing mapping table

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://zldljufeyskfzvzftjos.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET /api/assessments/cfa/questions - Get CFA questions (fixed for existing structure)
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Fetching CFA questions (fixed version)...');

    // Get questions directly from question_bank since framework_question_map doesn't exist
    const { data: questions, error: questionsError } = await supabase
      .from('question_bank')
      .select('*')
      .in('module', ['capacity', 'tolerance', 'need', 'profile', 'knowledge', 'behavior'])
      .eq('is_active', true)
      .order('id');

    if (questionsError) {
      console.error('❌ Error fetching questions:', questionsError);
      return res.status(500).json({ error: 'Failed to fetch questions', details: questionsError.message });
    }

    if (!questions || questions.length === 0) {
      console.log('🔍 No questions found, returning default questions');
      // Return the same default questions as the original API
      const defaultQuestions = [
        {
          id: 'investment_horizon',
          qkey: 'investment_horizon',
          label: 'What is your investment horizon?',
          qtype: 'single',
          options: ['Less than 1 year', '1-3 years', '3-5 years', 'More than 5 years'],
          required: true,
          order_index: 1,
          module: 'capacity'
        },
        {
          id: 'investment_amount',
          qkey: 'investment_amount',
          label: 'What percentage of your total assets do you plan to invest?',
          qtype: 'single',
          options: ['Less than 10%', '10-25%', '25-50%', 'More than 50%'],
          required: true,
          order_index: 2,
          module: 'capacity'
        },
        {
          id: 'income_stability',
          qkey: 'income_stability',
          label: 'How stable is your current income?',
          qtype: 'single',
          options: ['Very unstable', 'Somewhat unstable', 'Stable', 'Very stable'],
          required: true,
          order_index: 3,
          module: 'capacity'
        },
        {
          id: 'emergency_fund',
          qkey: 'emergency_fund',
          label: 'Do you have an emergency fund covering 6+ months of expenses?',
          qtype: 'single',
          options: ['No', 'Less than 3 months', '3-6 months', 'More than 6 months'],
          required: true,
          order_index: 4,
          module: 'capacity'
        },
        {
          id: 'risk_tolerance',
          qkey: 'risk_tolerance',
          label: 'How would you react to a 20% drop in your investment value?',
          qtype: 'single',
          options: ['Sell immediately', 'Sell some', 'Hold', 'Buy more'],
          required: true,
          order_index: 5,
          module: 'tolerance'
        },
        {
          id: 'volatility_comfort',
          qkey: 'volatility_comfort',
          label: 'How comfortable are you with investment volatility?',
          qtype: 'single',
          options: ['Very uncomfortable', 'Somewhat uncomfortable', 'Comfortable', 'Very comfortable'],
          required: true,
          order_index: 6,
          module: 'tolerance'
        },
        {
          id: 'loss_aversion',
          qkey: 'loss_aversion',
          label: 'What is your maximum acceptable loss on investments?',
          qtype: 'single',
          options: ['0-5%', '5-15%', '15-25%', 'More than 25%'],
          required: true,
          order_index: 7,
          module: 'tolerance'
        },
        {
          id: 'market_timing',
          qkey: 'market_timing',
          label: 'Do you believe in timing the market?',
          qtype: 'single',
          options: ['Strongly disagree', 'Disagree', 'Agree', 'Strongly agree'],
          required: true,
          order_index: 8,
          module: 'tolerance'
        },
        {
          id: 'investment_goals',
          qkey: 'investment_goals',
          label: 'What are your primary investment goals?',
          qtype: 'single',
          options: ['Capital preservation', 'Income generation', 'Growth', 'Tax efficiency'],
          required: true,
          order_index: 9,
          module: 'need'
        },
        {
          id: 'investment_experience',
          qkey: 'investment_experience',
          label: 'How would you describe your investment experience?',
          qtype: 'single',
          options: ['Beginner', 'Some experience', 'Experienced', 'Very experienced'],
          required: true,
          order_index: 10,
          module: 'need'
        },
        {
          id: 'financial_knowledge',
          qkey: 'financial_knowledge',
          label: 'How would you rate your financial knowledge?',
          qtype: 'single',
          options: ['Basic', 'Intermediate', 'Advanced', 'Expert'],
          required: true,
          order_index: 11,
          module: 'need'
        },
        {
          id: 'professional_advice',
          qkey: 'professional_advice',
          label: 'Do you prefer professional financial advice?',
          qtype: 'single',
          options: ['Strongly prefer', 'Somewhat prefer', 'Neutral', 'Prefer self-directed'],
          required: true,
          order_index: 12,
          module: 'need'
        }
      ];
      return res.json({ questions: defaultQuestions });
    }

    // Transform the database questions to match the expected format
    const transformedQuestions = questions.map((q, index) => ({
      id: q.id,
      qkey: q.qkey,
      label: q.label || q.qkey,
      qtype: q.qtype || 'single',
      options: q.options || [],
      required: q.required !== false, // Default to true if not specified
      order_index: q.order_index || (index + 1),
      module: q.module || 'risk_assessment'
    }));

    console.log(`✅ Returning ${transformedQuestions.length} questions from database`);
    return res.json({ questions: transformedQuestions });

  } catch (error) {
    console.error('❌ Error fetching CFA questions:', error);
    return res.status(500).json({ error: 'Failed to fetch CFA questions', details: error.message });
  }
}
