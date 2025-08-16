const { supabase } = require('./lib/supabase.js');
const { authenticateUser } = require('./lib/auth.js');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    const { method, url } = req;
    const path = url.replace('/api/ai', '');

    // ============================================================================
    // AI ENDPOINTS
    // ============================================================================

    // POST /api/ai/analyze-assessment - Analyze assessment submission
    if (method === 'POST' && path === '/analyze-assessment') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const { submission_id, analysis_type = 'risk_profile' } = req.body;
        if (!submission_id) {
          return res.status(400).json({ error: 'Submission ID is required' });
        }

        // Get assessment submission
        const { data: submission, error: submissionError } = await supabase
          .from('assessment_submissions')
          .select(`
            *,
            assessment_forms (
              id,
              name,
              description
            )
          `)
          .eq('id', submission_id)
          .eq('user_id', user.supabase_user_id)
          .single();

        if (submissionError || !submission) {
          return res.status(404).json({ error: 'Assessment submission not found' });
        }

        // For now, return a mock analysis
        // In production, you would integrate with OpenAI or other AI services
        const mockAnalysis = {
          risk_score: Math.floor(Math.random() * 100) + 1,
          risk_category: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
          insights: [
            'Based on your responses, you show a moderate risk tolerance',
            'Your investment horizon appears to be medium-term',
            'Consider diversifying your portfolio across different asset classes'
          ],
          recommendations: [
            'Equity funds: 40-60%',
            'Debt funds: 30-40%',
            'Hybrid funds: 10-20%'
          ],
          analysis_type,
          timestamp: new Date().toISOString()
        };

        // Update submission with analysis results
        await supabase
          .from('assessment_submissions')
          .update({
            score: mockAnalysis.risk_score,
            risk_category: mockAnalysis.risk_category,
            updated_at: new Date().toISOString()
          })
          .eq('id', submission_id);

        return res.json({
          message: 'Assessment analysis completed',
          analysis: mockAnalysis,
          submission_id
        });
      } catch (error) {
        if (error.message.includes('authorization')) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
        return res.status(500).json({ error: 'Failed to analyze assessment' });
      }
    }

    // POST /api/ai/generate-recommendations - Generate product recommendations
    if (method === 'POST' && path === '/generate-recommendations') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const { risk_category, investment_horizon, amount, preferences } = req.body;
        if (!risk_category || !investment_horizon || !amount) {
          return res.status(400).json({ error: 'Risk category, investment horizon, and amount are required' });
        }

        // For now, return mock recommendations
        // In production, integrate with AI service for personalized recommendations
        const mockRecommendations = [
          {
            id: `rec_${Date.now()}_1`,
            title: 'HDFC Mid-Cap Opportunities Fund',
            description: 'A well-diversified mid-cap fund suitable for moderate risk investors',
            amc_name: 'HDFC Mutual Fund',
            product_type: 'equity',
            risk_level: 'moderate',
            expected_return: '12-15%',
            min_investment: 5000,
            is_ai_generated: true,
            created_at: new Date().toISOString()
          },
          {
            id: `rec_${Date.now()}_2`,
            title: 'ICICI Prudential Balanced Advantage Fund',
            description: 'Dynamic asset allocation fund that adjusts equity-debt mix based on market conditions',
            amc_name: 'ICICI Prudential Mutual Fund',
            product_type: 'hybrid',
            risk_level: 'moderate',
            expected_return: '10-12%',
            min_investment: 5000,
            is_ai_generated: true,
            created_at: new Date().toISOString()
          }
        ];

        // Store recommendations in database
        const recommendationsToInsert = mockRecommendations.map(rec => ({
          ...rec,
          user_id: user.supabase_user_id,
          risk_category,
          investment_horizon,
          amount
        }));

        const { data: storedRecommendations, error: storeError } = await supabase
          .from('product_recommendations')
          .insert(recommendationsToInsert)
          .select();

        if (storeError) {
          console.error('Failed to store recommendations:', storeError);
          // Don't fail the request if storage fails
        }

        return res.json({
          message: 'Product recommendations generated successfully',
          recommendations: mockRecommendations,
          risk_category,
          investment_horizon,
          amount
        });
      } catch (error) {
        if (error.message.includes('authorization')) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
        return res.status(500).json({ error: 'Failed to generate recommendations' });
      }
    }

    // GET /api/ai/recommendations - Get user's AI-generated recommendations
    if (method === 'GET' && path === '/recommendations') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const { limit = 20, risk_category } = req.query;
        let query = supabase
          .from('product_recommendations')
          .select('*')
          .eq('user_id', user.supabase_user_id)
          .eq('is_ai_generated', true);

        if (risk_category) {
          query = query.eq('risk_category', risk_category);
        }

        const { data: recommendations, error: recommendationsError } = await query
          .order('created_at', { ascending: false })
          .limit(parseInt(limit));

        if (recommendationsError) {
          return res.status(500).json({ error: 'Failed to fetch recommendations' });
        }

        return res.json({ recommendations: recommendations || [] });
      } catch (error) {
        if (error.message.includes('authorization')) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
        return res.status(500).json({ error: 'Failed to fetch recommendations' });
      }
    }

    // POST /api/ai/feedback - Submit feedback on AI recommendations
    if (method === 'POST' && path === '/feedback') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const { assessment_submission_id, product_ids, rating, comment } = req.body;
        if (!assessment_submission_id || !rating) {
          return res.status(400).json({ error: 'Assessment submission ID and rating are required' });
        }

        if (rating < 1 || rating > 5) {
          return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        // Store feedback
        const { data: feedback, error: feedbackError } = await supabase
          .from('ai_feedback')
          .insert({
            user_id: user.supabase_user_id,
            assessment_submission_id,
            product_ids: product_ids || null,
            rating,
            comment: comment || null,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (feedbackError) {
          return res.status(500).json({ error: 'Failed to submit feedback' });
        }

        return res.json({
          message: 'Feedback submitted successfully',
          feedback
        });
      } catch (error) {
        if (error.message.includes('authorization')) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
        return res.status(500).json({ error: 'Failed to submit feedback' });
      }
    }

    // ============================================================================
    // PUBLIC ASSESSMENTS ENDPOINTS
    // ============================================================================

    // GET /api/ai/public/:slug - Get assessment by slug
    if (method === 'GET' && path.match(/^\/public\/[^\/]+$/)) {
      try {
        const slug = path.split('/')[2];
        
        // Get assessment link
        const { data: assessmentLink, error: linkError } = await supabase
          .from('assessment_links')
          .select(`
            *,
            users (
              id,
              full_name,
              referral_link
            ),
            assessment_forms (
              id,
              name,
              description
            )
          `)
          .eq('token', slug)
          .eq('status', 'active')
          .single();

        if (linkError || !assessmentLink) {
          return res.status(404).json({ error: 'Assessment not found or expired' });
        }

        // Check if expired
        if (assessmentLink.expires_at && new Date(assessmentLink.expires_at) < new Date()) {
          return res.status(410).json({ error: 'Assessment link has expired' });
        }

        // Get framework questions
        const { data: questions, error: questionsError } = await supabase
          .from('framework_questions')
          .select('*')
          .eq('framework_version_id', assessmentLink.framework_version_id)
          .order('order_index');

        if (questionsError) {
          return res.status(500).json({ error: 'Failed to fetch assessment questions' });
        }

        return res.json({
          assessment: {
            id: assessmentLink.id,
            title: assessmentLink.assessment_forms?.name || 'Risk Assessment',
            description: assessmentLink.assessment_forms?.description || 'Complete your risk assessment',
            questions: questions || [],
            user: assessmentLink.users,
            expires_at: assessmentLink.expires_at
          }
        });
      } catch (error) {
        console.error('Get public assessment error:', error);
        return res.status(500).json({ error: 'Failed to fetch assessment' });
      }
    }

    // POST /api/ai/public/:slug/submit - Submit assessment
    if (method === 'POST' && path.match(/^\/public\/[^\/]+\/submit$/)) {
      try {
        const slug = path.split('/')[2];
        
        // Get assessment link
        const { data: assessmentLink, error: linkError } = await supabase
          .from('assessment_links')
          .select('*')
          .eq('token', slug)
          .eq('status', 'active')
          .single();

        if (linkError || !assessmentLink) {
          return res.status(404).json({ error: 'Assessment not found or expired' });
        }

        // Check if expired
        if (assessmentLink.expires_at && new Date(assessmentLink.expires_at) < new Date()) {
          return res.status(410).json({ error: 'Assessment link has expired' });
        }

        const { answers, lead_info } = req.body;
        if (!answers || !lead_info) {
          return res.status(400).json({ error: 'Answers and lead information are required' });
        }

        // Create or get lead
        let lead_id = assessmentLink.lead_id;
        
        if (!lead_id && lead_info) {
          const { data: newLead, error: leadError } = await supabase
            .from('leads')
            .insert({
              user_id: assessmentLink.user_id,
              full_name: lead_info.full_name,
              email: lead_info.email || null,
              phone: lead_info.phone || null,
              age: lead_info.age ? parseInt(lead_info.age) : null,
              source_link: `Assessment: ${assessmentLink.token}`,
              status: 'assessment_done',
              kyc_status: 'pending',
              created_at: new Date().toISOString()
            })
            .select('id')
            .single();

          if (leadError) {
            return res.status(500).json({ error: 'Failed to create lead' });
          }

          lead_id = newLead.id;
        }

        // Create assessment submission
        const { data: submission, error: submissionError } = await supabase
          .from('assessment_submissions')
          .insert({
            user_id: assessmentLink.user_id,
            lead_id,
            form_id: assessmentLink.form_id,
            version_id: assessmentLink.version_id,
            filled_by: 'lead',
            answers,
            status: 'submitted',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (submissionError) {
          return res.status(500).json({ error: 'Failed to submit assessment' });
        }

        // Update assessment link status
        await supabase
          .from('assessment_links')
          .update({
            status: 'submitted',
            submitted_at: new Date().toISOString()
          })
          .eq('id', assessmentLink.id);

        // Update lead status if lead was created
        if (lead_id) {
          await supabase
            .from('leads')
            .update({ status: 'assessment_done' })
            .eq('id', lead_id);
        }

        return res.json({
          message: 'Assessment submitted successfully',
          submission_id: submission.id
        });
      } catch (error) {
        console.error('Submit assessment error:', error);
        return res.status(500).json({ error: 'Failed to submit assessment' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('AI & Public Assessments API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
