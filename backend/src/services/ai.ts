import OpenAI from 'openai';
import { supabase } from '../config/supabase';

function getOpenAI(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    return new OpenAI({ apiKey });
  } catch {
    return null;
  }
}

export interface RiskAssessmentResult {
  risk_score: number;
  risk_category: 'low' | 'medium' | 'high';
  reasoning: string;
  confidence: number;
}

export interface ScoringConfig {
  weights: Record<string, number>;
  scoring: Record<string, Record<string, number>>;
  thresholds: {
    low: { min: number; max: number };
    medium: { min: number; max: number };
    high: { min: number; max: number };
  };
  reasoning: string;
}

export class AIService {
  static async assessRisk(
    answers: Array<{ question_text: string; answer_value: string }>,
    leadAge?: number
  ): Promise<RiskAssessmentResult> {
    try {
      const client = getOpenAI();
      if (!client) {
        // Fallback heuristic when OPENAI_API_KEY is not configured
        const base = 50;
        const modifier = Math.min(answers.length * 2, 20);
        const risk_score = Math.max(1, Math.min(100, base + modifier - (leadAge ? Math.floor(leadAge / 10) : 0)));
        const risk_category: 'low' | 'medium' | 'high' = risk_score < 40 ? 'low' : risk_score > 65 ? 'high' : 'medium';
        return {
          risk_score,
          risk_category,
          reasoning: 'Estimated locally without AI due to missing API key. Provide OPENAI_API_KEY to enable AI-generated assessments.',
          confidence: 50
        };
      }

      const prompt = `
You are a financial advisor specializing in mutual fund risk assessment. 
Analyze the following responses from a potential investor and provide a risk assessment.

Lead Age: ${leadAge || 'Not provided'}

Assessment Responses:
${answers.map((a, i) => `${i + 1}. ${a.question_text}: ${a.answer_value}`).join('\n')}

Please provide:
1. A risk score from 1-100 (1 = very conservative, 100 = very aggressive)
2. Risk category: low, medium, or high
3. Detailed reasoning for your assessment
4. Confidence level (0-100%)

Respond in JSON format:
{
  "risk_score": number,
  "risk_category": "low|medium|high",
  "reasoning": "detailed explanation",
  "confidence": number
}
`;

      const completion = await client.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a professional financial advisor. Provide accurate, conservative risk assessments."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from AI');
      }

      const result = JSON.parse(response);
      
      return {
        risk_score: Math.min(Math.max(result.risk_score, 1), 100),
        risk_category: result.risk_category,
        reasoning: result.reasoning,
        confidence: Math.min(Math.max(result.confidence, 0), 100)
      };
    } catch (error) {
      throw new Error('Failed to assess risk profile');
    }
  }

  static async generateLeadSummary(leadData: any, riskAssessment: any): Promise<string> {
    try {
      const client = getOpenAI();
      if (!client) {
        const parts = [
          `${leadData.full_name} (${leadData.age || 'N/A'}) shows a ${riskAssessment.risk_category} risk profile (score ${riskAssessment.risk_score}).`,
          `Contact: ${leadData.email || leadData.phone || 'N/A'}.`,
        ];
        return parts.join(' ');
      }

      const prompt = `
Generate a professional summary for a mutual fund lead.

Lead Information:
- Name: ${leadData.full_name}
- Age: ${leadData.age || 'Not provided'}
- Contact: ${leadData.email || leadData.phone || 'Not provided'}

Risk Assessment:
- Score: ${riskAssessment.risk_score}
- Category: ${riskAssessment.risk_category}
- Reasoning: ${riskAssessment.reasoning}

Create a 2-3 sentence professional summary suitable for a mutual fund distributor to understand the lead quickly.
`;

      const completion = await client.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a professional financial advisor assistant. Create concise, professional summaries."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      });

      return completion.choices[0]?.message?.content || 'Lead summary unavailable';
    } catch (error) {
      return 'Lead summary unavailable';
    }
  }

  static async generateScoringConfig(
    questions: Array<{ title: string; type: string; options?: string[] }>
  ): Promise<ScoringConfig> {
    try {
      const client = getOpenAI();
      if (!client) {
        // Fallback heuristic when OPENAI_API_KEY is not configured
        return this.generateHeuristicScoring(questions);
      }

      const prompt = `
You are a financial advisor specializing in mutual fund risk assessment. 
Analyze the following assessment questions and generate an intelligent scoring configuration.

Assessment Questions:
${questions.map((q, i) => `${i + 1}. ${q.title} (Type: ${q.type}${q.options ? `, Options: ${q.options.join(', ')}` : ''})`).join('\n')}

Please generate a scoring configuration that includes:

1. Question Weights: Assign weights (0.1 to 1.0) to each question based on its importance in risk assessment
2. Option Scoring: For questions with options, assign scores (1-5) to each option based on risk level
3. Risk Thresholds: Define score ranges for low, medium, and high risk categories
4. Reasoning: Explain your scoring logic

Respond in JSON format:
{
  "weights": {
    "question_id": weight_value
  },
  "scoring": {
    "question_id": {
      "option_value": score
    }
  },
  "thresholds": {
    "low": {"min": 0, "max": number},
    "medium": {"min": number, "max": number},
    "high": {"min": number, "max": number}
  },
  "reasoning": "Detailed explanation of scoring logic"
}

Focus on financial risk assessment best practices:
- Investment experience and knowledge should have higher weights
- Risk tolerance questions are critical
- Time horizon affects risk capacity
- Financial goals influence risk appetite
`;

      const completion = await client.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a professional financial advisor. Generate intelligent, balanced scoring configurations for risk assessments."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from AI');
      }

      const result = JSON.parse(response);
      
      // Validate and sanitize the response
      return {
        weights: result.weights || {},
        scoring: result.scoring || {},
        thresholds: {
          low: { min: Math.max(0, result.thresholds?.low?.min || 0), max: result.thresholds?.low?.max || 10 },
          medium: { min: Math.max(0, result.thresholds?.medium?.min || 0), max: result.thresholds?.medium?.max || 20 },
          high: { min: Math.max(0, result.thresholds?.high?.min || 0), max: result.thresholds?.high?.max || 30 }
        },
        reasoning: result.reasoning || 'AI-generated scoring configuration'
      };
    } catch (error) {
      // Fallback to heuristic scoring
      return this.generateHeuristicScoring(questions);
    }
  }

  private static generateHeuristicScoring(
    questions: Array<{ title: string; type: string; options?: string[] }>
  ): ScoringConfig {
    const weights: Record<string, number> = {};
    const scoring: Record<string, Record<string, number>> = {};
    
    // Assign weights based on question importance
    questions.forEach((question, index) => {
      const questionId = `question_${index}`;
      
      // Higher weights for key risk assessment questions
      if (question.title.toLowerCase().includes('risk') || question.title.toLowerCase().includes('tolerance')) {
        weights[questionId] = 1.0;
      } else if (question.title.toLowerCase().includes('experience') || question.title.toLowerCase().includes('knowledge')) {
        weights[questionId] = 0.9;
      } else if (question.title.toLowerCase().includes('horizon') || question.title.toLowerCase().includes('time')) {
        weights[questionId] = 0.8;
      } else if (question.title.toLowerCase().includes('goal') || question.title.toLowerCase().includes('objective')) {
        weights[questionId] = 0.7;
      } else {
        weights[questionId] = 0.6;
      }

      // Generate scoring for options
      if (question.options && question.options.length > 0) {
        scoring[questionId] = {};
        question.options.forEach((option, optionIndex) => {
          // Assign scores based on perceived risk level
          let score = 1;
          const optionLower = option.toLowerCase();
          
          if (optionLower.includes('conservative') || optionLower.includes('low') || optionLower.includes('none')) {
            score = 1;
          } else if (optionLower.includes('moderate') || optionLower.includes('medium')) {
            score = 3;
          } else if (optionLower.includes('aggressive') || optionLower.includes('high') || optionLower.includes('advanced')) {
            score = 5;
          } else {
            score = optionIndex + 1;
          }
          
          scoring[questionId][option] = score;
        });
      }
    });

    // Calculate total possible score
    const totalScore = questions.reduce((sum, _, index) => {
      const questionId = `question_${index}`;
      const maxOptionScore = Math.max(...Object.values(scoring[questionId] || { 1: 1 }));
      return sum + (weights[questionId] * maxOptionScore);
    }, 0);

    // Define thresholds based on total score
    const thresholds = {
      low: { min: 0, max: Math.floor(totalScore * 0.33) },
      medium: { min: Math.floor(totalScore * 0.33) + 1, max: Math.floor(totalScore * 0.66) },
      high: { min: Math.floor(totalScore * 0.66) + 1, max: Math.ceil(totalScore) }
    };

    return {
      weights,
      scoring,
      thresholds,
      reasoning: 'Heuristic scoring configuration generated locally. Enable AI scoring for more intelligent configurations.'
    };
  }
}
