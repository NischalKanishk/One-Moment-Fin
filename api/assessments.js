// Fixed Assessments API - Returns only proper CFA framework questions
// This version maps existing database questions to the CFA framework structure

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://zldljufeyskfzvzftjos.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Define the CFA framework structure using questions that actually exist in the database
const CFA_FRAMEWORK_STRUCTURE = [
  // Capacity questions (6 questions)
  { qkey: 'age', module: 'capacity', order: 1, label: 'What is your age?' },
  { qkey: 'dependents', module: 'capacity', order: 2, label: 'How many dependents do you have?' },
  { qkey: 'income_security', module: 'capacity', order: 3, label: 'How secure is your income?' },
  { qkey: 'emi_ratio', module: 'capacity', order: 4, label: 'What percentage of your income goes towards EMIs?' },
  { qkey: 'emergency_fund_months', module: 'capacity', order: 5, label: 'How many months of expenses do you have in emergency funds?' },
  { qkey: 'liquidity_withdrawal_2y', module: 'capacity', order: 6, label: 'What percentage of your investments might you need to withdraw in the next 2 years?' },
  
  // Tolerance/Behavior questions (4 questions)
  { qkey: 'drawdown_reaction', module: 'tolerance', order: 7, label: 'How would you react to a 20% drop in your investment value?' },
  { qkey: 'gain_loss_tradeoff', module: 'tolerance', order: 8, label: 'Which scenario would you prefer?' },
  { qkey: 'loss_threshold', module: 'tolerance', order: 9, label: 'What is your maximum acceptable loss in a year?' },
  { qkey: 'market_knowledge', module: 'tolerance', order: 10, label: 'How would you rate your knowledge of financial markets?' },
  
  // Need/Profile questions (6 questions)
  { qkey: 'goal_required_return', module: 'need', order: 11, label: 'What annual return do you need to achieve your goals?' },
  { qkey: 'horizon', module: 'need', order: 12, label: 'What is your investment time horizon?' },
  { qkey: 'primary_goal', module: 'need', order: 13, label: 'What is your primary investment goal?' },
  { qkey: 'investing_experience', module: 'need', order: 14, label: 'What is your investing experience?' },
  { qkey: 'income_bracket', module: 'need', order: 15, label: 'What is your annual income bracket?' },
  { qkey: 'education', module: 'need', order: 16, label: 'What is your highest level of education?' }
];

// GET /api/assessment/:code - Get assessment by code (for public assessment links)
export async function GET(req, { params }) {
  const { code } = params;
  
  if (!code) {
    return new Response(JSON.stringify({ error: 'Assessment code is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('🔍 Looking up assessment by code:', code);
    
    // First, look up the assessment link
    const { data: assessmentLink, error: linkError } = await supabase
      .from('assessment_links')
      .select(`
        *,
        user:user_id (
          id,
          email,
          full_name
        )
      `)
      .eq('token', code)
      .eq('is_active', true)
      .single();

    if (linkError || !assessmentLink) {
      console.log('❌ Assessment link not found for code:', code);
      return new Response(JSON.stringify({ error: 'Assessment not found or inactive' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Assessment link found:', assessmentLink.id);

    // Get the CFA framework questions
    const questionKeys = CFA_FRAMEWORK_STRUCTURE.map(q => q.qkey);
    const { data: questions, error: questionsError } = await supabase
      .from('question_bank')
      .select('*')
      .in('qkey', questionKeys)
      .eq('is_active', true)
      .order('id');

    if (questionsError) {
      console.error('❌ Error fetching questions:', questionsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch questions' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Transform questions to match the CFA framework structure
    const transformedQuestions = questions.map((q) => {
      const frameworkQuestion = CFA_FRAMEWORK_STRUCTURE.find(fq => fq.qkey === q.qkey);
      return {
        id: q.id,
        qkey: q.qkey,
        label: q.label || frameworkQuestion?.label || q.qkey,
        qtype: q.qtype || 'single',
        options: q.options || getDefaultOptions(q.qkey),
        required: q.required !== false,
        order_index: frameworkQuestion?.order || 999,
        module: frameworkQuestion?.module || q.module || 'risk_assessment'
      };
    }).sort((a, b) => a.order_index - b.order_index);

    // Prepare the assessment data
    const assessment = {
      id: assessmentLink.id,
      title: 'CFA Three-Pillar Risk Assessment',
      slug: code,
      user_id: assessmentLink.user_id,
      user_name: assessmentLink.user?.full_name || 'Unknown User'
    };

    console.log('✅ Assessment loaded successfully:', {
      assessmentId: assessment.id,
      questionsCount: transformedQuestions.length,
      userId: assessment.user_id
    });

    return new Response(JSON.stringify({
      assessment,
      questions: transformedQuestions
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error loading assessment by code:', error);
    return new Response(JSON.stringify({ error: 'Failed to load assessment' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// GET /api/assessments/cfa/questions - Get CFA questions (mapped from existing database)
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Fetching CFA framework questions (mapped from database)...');

    // Get the questions that are part of the CFA framework
    const questionKeys = CFA_FRAMEWORK_STRUCTURE.map(q => q.qkey);
    const { data: questions, error: questionsError } = await supabase
      .from('question_bank')
      .select('*')
      .in('qkey', questionKeys)
      .eq('is_active', true)
      .order('id');

    if (questionsError) {
      console.error('❌ Error fetching questions:', questionsError);
      return res.status(500).json({ error: 'Failed to fetch questions', details: questionsError.message });
    }

    if (!questions || questions.length === 0) {
      console.log('🔍 No CFA framework questions found, returning default questions');
      // Return the proper CFA framework questions as fallback
      const defaultQuestions = CFA_FRAMEWORK_STRUCTURE.map((q, index) => ({
        id: q.qkey,
        qkey: q.qkey,
        label: q.label,
        qtype: 'single',
        options: getDefaultOptions(q.qkey),
        required: true,
        order_index: q.order,
        module: q.module
      }));
      return res.json({ questions: defaultQuestions });
    }

    // Transform the database questions to match the CFA framework structure
    const transformedQuestions = questions.map((q) => {
      const frameworkQuestion = CFA_FRAMEWORK_STRUCTURE.find(fq => fq.qkey === q.qkey);
      return {
        id: q.id,
        qkey: q.qkey,
        label: q.label || frameworkQuestion?.label || q.qkey,
        qtype: q.qtype || 'single',
        options: q.options || getDefaultOptions(q.qkey),
        required: q.required !== false, // Default to true if not specified
        order_index: frameworkQuestion?.order || 999,
        module: frameworkQuestion?.module || q.module || 'risk_assessment'
      };
    }).sort((a, b) => a.order_index - b.order_index); // Sort by proper order

    console.log(`✅ Returning ${transformedQuestions.length} CFA framework questions from database`);
    console.log(`📊 Questions by module:`);
    const moduleCounts = transformedQuestions.reduce((acc, q) => {
      acc[q.module] = (acc[q.module] || 0) + 1;
      return acc;
    }, {});
    Object.entries(moduleCounts).forEach(([module, count]) => {
      console.log(`   ${module}: ${count} questions`);
    });

    return res.json({ questions: transformedQuestions });

  } catch (error) {
    console.error('❌ Error fetching CFA questions:', error);
    return res.status(500).json({ error: 'Failed to fetch CFA questions', details: error.message });
  }
}

// Helper function to provide default options for questions
function getDefaultOptions(qkey) {
  const defaultOptions = {
    'age': ['<25', '25-35', '36-50', '51+'],
    'dependents': ['0', '1', '2', '3', '4+'],
    'income_security': ['Not secure', 'Somewhat secure', 'Fairly secure', 'Very secure'],
    'emi_ratio': ['0%', '1-25%', '26-50%', '51-75%', '>75%'],
    'emergency_fund_months': ['<3 months', '3-6 months', '6-12 months', '>12 months'],
    'liquidity_withdrawal_2y': ['0-10%', '11-25%', '26-50%', '51-75%', '>75%'],
    'drawdown_reaction': ['Sell immediately', 'Do nothing', 'Buy more'],
    'gain_loss_tradeoff': ['No loss even if low gain', '8% loss for 22% gain', '25% loss for 50% gain'],
    'loss_threshold': ['<3%', '3-8%', '9-15%', '>15%'],
    'market_knowledge': ['Low', 'Medium', 'High'],
    'goal_required_return': ['<4%', '4-6%', '6-8%', '8-10%', '10-12%', '>12%'],
    'horizon': ['<1 year', '1-3 years', '3-5 years', '5-10 years', '>10 years'],
    'primary_goal': ['Wealth building', 'Child education', 'House purchase', 'Retirement planning', 'Other'],
    'investing_experience': ['None', '<3 years', '3-10 years', '>10 years'],
    'income_bracket': ['<5L', '5-25L', '25-50L', '50L-1C', '1-3C', '>3C'],
    'education': ['<12th', '12th', 'Bachelors', 'Postgrad+']
  };
  
  return defaultOptions[qkey] || ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
}
