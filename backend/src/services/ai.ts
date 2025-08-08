import OpenAI from 'openai';
import { supabase } from '../config/supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface RiskAssessmentResult {
  risk_score: number;
  risk_category: 'low' | 'medium' | 'high';
  reasoning: string;
  confidence: number;
}

export interface ProductRecommendation {
  title: string;
  description: string;
  amc_name: string;
  product_type: 'equity' | 'debt' | 'hybrid' | 'balanced';
  risk_category: 'low' | 'medium' | 'high';
  reasoning: string;
}

export class AIService {
  static async assessRisk(
    answers: Array<{ question_text: string; answer_value: string }>,
    leadAge?: number
  ): Promise<RiskAssessmentResult> {
    try {
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

      const completion = await openai.chat.completions.create({
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
      console.error('AI risk assessment error:', error);
      throw new Error('Failed to assess risk profile');
    }
  }

  static async suggestProducts(
    riskCategory: 'low' | 'medium' | 'high',
    leadAge?: number
  ): Promise<ProductRecommendation[]> {
    try {
      const prompt = `
You are a mutual fund advisor. Suggest 3-5 mutual fund products for a ${riskCategory} risk investor.

Investor Age: ${leadAge || 'Not specified'}

For ${riskCategory} risk investors, suggest appropriate mutual fund products with:
- Product name and AMC
- Brief description
- Product type (equity/debt/hybrid/balanced)
- Why it's suitable for this risk profile

Focus on well-known AMCs like:
- HDFC Mutual Fund
- ICICI Prudential Mutual Fund
- SBI Mutual Fund
- Axis Mutual Fund
- Kotak Mutual Fund
- Nippon India Mutual Fund
- Aditya Birla Sun Life Mutual Fund

Respond in JSON format:
[
  {
    "title": "Fund Name",
    "description": "Brief description",
    "amc_name": "AMC Name",
    "product_type": "equity|debt|hybrid|balanced",
    "risk_category": "${riskCategory}",
    "reasoning": "Why this fund is suitable"
  }
]
`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a professional mutual fund advisor. Suggest appropriate, well-established mutual fund products."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 800
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from AI');
      }

      const products = JSON.parse(response);
      
      return products.map((product: any) => ({
        title: product.title,
        description: product.description,
        amc_name: product.amc_name,
        product_type: product.product_type,
        risk_category: product.risk_category,
        reasoning: product.reasoning
      }));
    } catch (error) {
      console.error('AI product suggestion error:', error);
      throw new Error('Failed to suggest products');
    }
  }

  static async generateLeadSummary(leadData: any, riskAssessment: any): Promise<string> {
    try {
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

      const completion = await openai.chat.completions.create({
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
      console.error('AI summary generation error:', error);
      return 'Lead summary unavailable';
    }
  }
}
