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

// Helper function to get CFA framework questions
async function getCFAQuestions() {
  const questionKeys = CFA_FRAMEWORK_STRUCTURE.map(q => q.qkey);
  const { data: questions, error: questionsError } = await supabase
    .from('question_bank')
    .select('*')
    .in('qkey', questionKeys)
    .eq('is_active', true)
    .order('id');

  if (questionsError) {
    throw new Error('Failed to fetch questions');
  }

  // Transform questions to match the CFA framework structure
  return questions.map((q) => {
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

// Risk scoring function based on CFA Three-Pillar framework
function calculateRiskScore(answers) {
  console.log('🔍 Risk calculation input:', answers);
  
  let capacityScore = 0;
  let toleranceScore = 0;
  let needScore = 0;
  
  // Capacity scoring (financial ability to take risk)
  if (answers.age) {
    const ageMap = { '<25': 85, '25-35': 75, '36-50': 60, '51+': 40 };
    capacityScore += ageMap[answers.age] || 50;
  }
  
  if (answers.income_security) {
    const securityMap = { 'Not secure': 25, 'Somewhat secure': 50, 'Fairly secure': 70, 'Very secure': 90 };
    capacityScore += securityMap[answers.income_security] || 50;
  }
  
  if (answers.emi_ratio) {
    const emiValue = parseInt(answers.emi_ratio) || 0;
    capacityScore += Math.max(0, 100 - emiValue); // Lower EMI ratio = higher capacity
  }
  
  if (answers.emergency_fund_months) {
    const fundMap = { '<3': 30, '3-6': 50, '6-12': 70, '>12': 90 };
    capacityScore += fundMap[answers.emergency_fund_months] || 50;
  }
  
  // Tolerance scoring (psychological ability to handle risk)
  if (answers.drawdown_reaction) {
    // Handle both formats: "Sell" and "Sell immediately"
    const reactionMap = { 
      'Sell': 20, 'Sell immediately': 20,
      'Do nothing': 60, 
      'Buy more': 85 
    };
    toleranceScore += reactionMap[answers.drawdown_reaction] || 50;
  }
  
  if (answers.gain_loss_tradeoff) {
    // Handle both formats: "NoLossEvenIfLowGain" and "No loss even if low gain"
    const tradeoffMap = { 
      'NoLossEvenIfLowGain': 20, 'No loss even if low gain': 20,
      'Loss8Gain22': 60, '8% loss for 22% gain': 60,
      'Loss25Gain50': 85, '25% loss for 50% gain': 85
    };
    toleranceScore += tradeoffMap[answers.gain_loss_tradeoff] || 50;
  }
  
  if (answers.market_knowledge) {
    // Handle both formats: "1", "2", "3" and "Low", "Medium", "High"
    const knowledgeMap = { 
      '1': 20, 'Low': 20,
      '2': 40, 'Medium': 40,
      '3': 60, 'High': 60,
      '4': 75,
      '5': 90
    };
    toleranceScore += knowledgeMap[answers.market_knowledge] || 50;
  }
  
  // Need scoring (required return for goals)
  if (answers.goal_required_return) {
    // Handle both formats: "6" and "6-8%"
    let returnValue = 0;
    if (typeof answers.goal_required_return === 'string') {
      // Extract the first number from strings like "6-8%" or "6%"
      const match = answers.goal_required_return.match(/(\d+)/);
      if (match) {
        returnValue = parseInt(match[1]);
      }
    } else {
      returnValue = parseInt(answers.goal_required_return) || 0;
    }
    
    if (returnValue <= 4) needScore = 30;
    else if (returnValue <= 6) needScore = 45;
    else if (returnValue <= 8) needScore = 60;
    else if (returnValue <= 10) needScore = 75;
    else if (returnValue <= 12) needScore = 85;
    else needScore = 95;
  }
  
  // Calculate final scores (normalize to 0-100)
  capacityScore = Math.min(100, Math.max(0, capacityScore / 4));
  toleranceScore = Math.min(100, Math.max(0, toleranceScore / 3));
  needScore = Math.min(100, Math.max(0, needScore));
  
  // Final risk score is the minimum of capacity and tolerance
  const finalScore = Math.min(capacityScore, toleranceScore);
  
  // Determine risk bucket
  let riskBucket = 'Conservative';
  if (finalScore >= 76) riskBucket = 'Aggressive';
  else if (finalScore >= 56) riskBucket = 'Growth';
  else if (finalScore >= 36) riskBucket = 'Moderate';
  
  const result = {
    bucket: riskBucket,
    score: Math.round(finalScore),
    rubric: {
      capacity: Math.round(capacityScore),
      tolerance: Math.round(toleranceScore),
      need: Math.round(needScore)
    }
  };
  
  console.log('🎯 Risk calculation result:', result);
  return result;
}

// Main handler for all assessment routes
export async function GET(req, { params }) {
  const url = new URL(req.url);
  const path = url.pathname;
  
  console.log(`🔍 Assessment API Request: ${path}`);
  
  // Handle different assessment endpoints
  if (path === '/api/assessments/cfa/questions') {
    return await handleCFAQuestions();
  } else if (path.startsWith('/api/assessment/')) {
    const code = path.split('/').pop();
    return await handleAssessmentByCode(code);
  } else if (path === '/api/assessments/forms') {
    return await handleAssessmentForms();
  } else if (path.startsWith('/a/')) {
    // Handle the /a/ route for assessment links
    const code = path.split('/')[2]; // Extract assessment code from /a/code
    return await handleAssessmentByCode(code);
  }
  
  // Default response for unknown endpoints
  return new Response(JSON.stringify({ error: 'Assessment endpoint not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Handle POST requests for assessment submissions
export async function POST(req, { params }) {
  const url = new URL(req.url);
  const path = url.pathname;
  
  console.log(`🔍 Assessment API POST Request: ${path}`);
  
  try {
    const body = await req.json();
    
    // Handle different submission endpoints
    if (path.startsWith('/api/assessment/') && path.endsWith('/submit')) {
      const code = path.split('/')[3]; // Extract assessment code
      return await handleAssessmentSubmission(code, body);
    } else if (path.startsWith('/api/assessments/public/') && path.endsWith('/submit')) {
      const slug = path.split('/')[4]; // Extract slug
      return await handlePublicAssessmentSubmission(slug, body);
    }
    
    // Default response for unknown endpoints
    return new Response(JSON.stringify({ error: 'Submission endpoint not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error in POST request:', error);
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle assessment submission
async function handleAssessmentSubmission(assessmentCode, submissionData) {
  try {
    console.log('🔍 Processing assessment submission for code:', assessmentCode);
    
    // Look up the user by assessment_link (stored in users table)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('assessment_link', assessmentCode)
      .single();
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Assessment link not found or expired' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Calculate risk score
    const riskResult = calculateRiskScore(submissionData.answers);
    
    // Check if lead already exists for this user and email
    let leadId = null;
    const { data: existingLead, error: leadCheckError } = await supabase
      .from('leads')
      .select('id')
      .eq('user_id', user.id)
      .eq('email', submissionData.submitterInfo.email)
      .single();
    
    if (existingLead) {
      leadId = existingLead.id;
      console.log('✅ Using existing lead:', leadId);
    } else {
      // Create new lead
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({
          user_id: user.id,
          full_name: submissionData.submitterInfo.full_name,
          email: submissionData.submitterInfo.email,
          phone: submissionData.submitterInfo.phone,
          age: submissionData.submitterInfo.age,
          source_link: `Assessment: ${assessmentCode}`,
          status: 'assessment_done'
        })
        .select('id')
        .single();
      
      if (leadError) {
        console.error('❌ Error creating lead:', leadError);
        return new Response(JSON.stringify({ error: 'Failed to create lead' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      leadId = lead.id;
      console.log('✅ Created new lead:', leadId);
    }
    
    // Create assessment submission
    const { data: submission, error: submissionError } = await supabase
      .from('assessment_submissions')
      .insert({
        assessment_id: null, // We don't have a specific assessment form ID yet
        framework_version_id: null, // We don't have a specific framework version ID yet
        owner_id: user.id,
        lead_id: leadId,
        answers: submissionData.answers,
        result: riskResult,
        status: 'submitted'
      })
      .select('*')
      .single();
    
    if (submissionError) {
      console.error('❌ Error creating assessment submission:', submissionError);
      return new Response(JSON.stringify({ error: 'Failed to save assessment submission' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('✅ Assessment submission processed successfully');
    
    return new Response(JSON.stringify({
      success: true,
      result: riskResult,
      submissionId: submission.id,
      leadId: leadId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error processing assessment submission:', error);
    return new Response(JSON.stringify({ error: 'Failed to process assessment submission' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle public assessment submission
async function handlePublicAssessmentSubmission(slug, submissionData) {
  try {
    console.log('🔍 Processing public assessment submission for slug:', slug);
    
    // For public assessments, we'll create a default user/assessment structure
    // In a real implementation, you might want to create a public user account
    
    // Calculate risk score
    const riskResult = calculateRiskScore(submissionData.answers);
    
    // Create a public lead (without user_id for now)
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        full_name: submissionData.submitterInfo.full_name,
        email: submissionData.submitterInfo.email,
        phone: submissionData.submitterInfo.phone,
        age: submissionData.submitterInfo.age,
        source_link: `Public Assessment: ${slug}`,
        status: 'assessment_done'
      })
      .select('id')
      .single();
    
    if (leadError) {
      console.error('❌ Error creating public lead:', leadError);
      return new Response(JSON.stringify({ error: 'Failed to create lead' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('✅ Public assessment submission processed successfully');
    
    return new Response(JSON.stringify({
      success: true,
      result: riskResult,
      leadId: lead.id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error processing public assessment submission:', error);
    return new Response(JSON.stringify({ error: 'Failed to process public assessment submission' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle CFA questions endpoint
async function handleCFAQuestions() {
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
      return new Response(JSON.stringify({ error: 'Failed to fetch questions', details: questionsError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
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
      return new Response(JSON.stringify({ questions: defaultQuestions }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
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

    return new Response(JSON.stringify({ questions: transformedQuestions }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error fetching CFA questions:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch CFA questions', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle assessment by code endpoint
async function handleAssessmentByCode(code) {
  if (!code) {
    return new Response(JSON.stringify({ error: 'Assessment code is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('🔍 Looking up assessment by code:', code);
    
    // Look up the user by assessment_link (stored in users table)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('assessment_link', code)
      .single();

    if (userError || !user) {
      console.log('❌ User not found for assessment code:', code);
      // Instead of failing, return a default assessment with the questions
      // This allows the frontend to work even without pre-existing assessment links
      console.log('🔄 Falling back to default assessment structure');
      
      // Get the CFA framework questions using helper function
      const transformedQuestions = await getCFAQuestions();

      // Return default assessment structure
      const defaultAssessment = {
        id: `default-${code}`,
        title: 'CFA Three-Pillar Risk Assessment',
        slug: code,
        user_id: null, // No specific user for default assessment
        user_name: 'OneMFin'
      };

      console.log('✅ Returning default assessment with', transformedQuestions.length, 'questions');

      return new Response(JSON.stringify({
        assessment: defaultAssessment,
        questions: transformedQuestions
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ User found for assessment code:', user.id);

    // Get the CFA framework questions using helper function
    const transformedQuestions = await getCFAQuestions();

    // Prepare the assessment data
    const assessment = {
      id: user.id,
      title: 'CFA Three-Pillar Risk Assessment',
      slug: code,
      user_id: user.id,
      user_name: user.full_name || 'Unknown User'
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
    console.error('❌ Error loading assessment:', error);
    return new Response(JSON.stringify({ error: 'Failed to load assessment' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle assessment forms endpoint
async function handleAssessmentForms() {
  try {
    console.log('🔍 Fetching assessment forms...');
    
    // For now, return a default form since we don't have custom forms yet
    const defaultForm = {
      id: 'default-cfa-form',
      name: 'CFA Three-Pillar Risk Assessment',
      description: 'Standard risk assessment based on CFA framework',
      is_active: true,
      created_at: new Date().toISOString()
    };
    
    return new Response(JSON.stringify({ forms: [defaultForm] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error fetching assessment forms:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch assessment forms' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
