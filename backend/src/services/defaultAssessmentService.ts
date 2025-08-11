import { supabase } from '../config/supabase';

export interface DefaultQuestion {
  question_text: string;
  type: 'mcq' | 'scale' | 'text';
  options?: any;
  weight: number;
}

export class DefaultAssessmentService {
  // Default assessment questions that every new user gets
  private static readonly DEFAULT_QUESTIONS: DefaultQuestion[] = [
    {
      question_text: "What is your investment time horizon?",
      type: "mcq",
      options: ["Less than 1 year", "1-3 years", "3-5 years", "5-10 years", "More than 10 years"],
      weight: 3
    },
    {
      question_text: "How would you react if your investment lost 20% of its value in a short period?",
      type: "mcq",
      options: ["I would be very concerned and want to sell immediately", "I would be worried but wait to see if it recovers", "I would see it as a buying opportunity", "I would be comfortable with such volatility"],
      weight: 4
    },
    {
      question_text: "What percentage of your total savings are you planning to invest?",
      type: "mcq",
      options: ["Less than 10%", "10-25%", "25-50%", "50-75%", "More than 75%"],
      weight: 3
    },
    {
      question_text: "What is your primary investment goal?",
      type: "mcq",
      options: ["Capital preservation with minimal risk", "Steady income generation", "Balanced growth and income", "Aggressive capital appreciation", "Maximum returns regardless of risk"],
      weight: 3
    },
    {
      question_text: "How familiar are you with mutual funds and investment products?",
      type: "mcq",
      options: ["Not familiar at all", "Somewhat familiar", "Moderately familiar", "Very familiar", "Expert level"],
      weight: 2
    },
    {
      question_text: "What is your current monthly income?",
      type: "mcq",
      options: ["Less than ₹25,000", "₹25,000 - ₹50,000", "₹50,000 - ₹1,00,000", "₹1,00,000 - ₹2,00,000", "More than ₹2,00,000"],
      weight: 2
    },
    {
      question_text: "Do you have any existing investments?",
      type: "mcq",
      options: ["No, this is my first investment", "Yes, in fixed deposits/savings", "Yes, in some mutual funds", "Yes, in stocks and other instruments", "Yes, diversified portfolio"],
      weight: 2
    },
    {
      question_text: "How important is liquidity (ability to withdraw money quickly) to you?",
      type: "scale",
      options: { min: 1, max: 5, labels: ["Not important at all", "Somewhat important", "Moderately important", "Very important", "Extremely important"] },
      weight: 2
    },
    {
      question_text: "What is your tax bracket?",
      type: "mcq",
      options: ["No tax liability", "5%", "20%", "30%", "Don't know"],
      weight: 1
    },
    {
      question_text: "Additional comments or specific requirements:",
      type: "text",
      weight: 1
    }
  ];

  /**
   * Create a default assessment for a new user
   */
  static async createDefaultAssessment(userId: string): Promise<{ assessmentId: string; questionsCount: number }> {
    try {
      // Create the default assessment
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .insert({
          user_id: userId,
          name: 'Default Risk Assessment Form',
          description: 'Comprehensive risk assessment for mutual fund investments',
          is_active: true
        })
        .select()
        .single();

      if (assessmentError) {
        console.error('Failed to create default assessment:', assessmentError);
        throw new Error('Failed to create default assessment');
      }

      // Create all default questions
      const questionsToInsert = this.DEFAULT_QUESTIONS.map(q => ({
        assessment_id: assessment.id,
        question_text: q.question_text,
        type: q.type,
        options: q.options || null,
        weight: q.weight
      }));

      const { error: questionsError } = await supabase
        .from('assessment_questions')
        .insert(questionsToInsert);

      if (questionsError) {
        console.error('Failed to create default questions:', questionsError);
        // Clean up the assessment if questions fail
        await supabase
          .from('assessments')
          .delete()
          .eq('id', assessment.id);
        throw new Error('Failed to create default questions');
      }

      console.log(`Created default assessment for user ${userId} with ${this.DEFAULT_QUESTIONS.length} questions`);
      
      return {
        assessmentId: assessment.id,
        questionsCount: this.DEFAULT_QUESTIONS.length
      };
    } catch (error) {
      console.error('Error creating default assessment:', error);
      throw error;
    }
  }

  /**
   * Reset a user's assessment to default questions
   */
  static async resetToDefault(userId: string, assessmentId: string): Promise<{ success: boolean; questionsCount: number }> {
    try {
      // Delete existing questions
      const { error: deleteError } = await supabase
        .from('assessment_questions')
        .delete()
        .eq('assessment_id', assessmentId);

      if (deleteError) {
        console.error('Failed to delete existing questions:', deleteError);
        throw new Error('Failed to delete existing questions');
      }

      // Insert default questions
      const questionsToInsert = this.DEFAULT_QUESTIONS.map(q => ({
        assessment_id: assessmentId,
        question_text: q.question_text,
        type: q.type,
        options: q.options || null,
        weight: q.weight
      }));

      const { error: insertError } = await supabase
        .from('assessment_questions')
        .insert(questionsToInsert);

      if (insertError) {
        console.error('Failed to insert default questions:', insertError);
        throw new Error('Failed to insert default questions');
      }

      // Update assessment name and description to default
      const { error: updateError } = await supabase
        .from('assessments')
        .update({
          name: 'Default Risk Assessment Form',
          description: 'Comprehensive risk assessment for mutual fund investments'
        })
        .eq('id', assessmentId);

      if (updateError) {
        console.error('Failed to update assessment details:', updateError);
        // Don't throw here as questions were created successfully
      }

      console.log(`Reset assessment ${assessmentId} to default for user ${userId}`);
      
      return {
        success: true,
        questionsCount: this.DEFAULT_QUESTIONS.length
      };
    } catch (error) {
      console.error('Error resetting to default:', error);
      throw error;
    }
  }

  /**
   * Get default questions (useful for frontend display)
   */
  static getDefaultQuestions(): DefaultQuestion[] {
    return [...this.DEFAULT_QUESTIONS];
  }

  /**
   * Check if a user has a default assessment
   */
  static async hasDefaultAssessment(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('id')
        .eq('user_id', userId)
        .eq('name', 'Default Risk Assessment Form')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking default assessment:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking default assessment:', error);
      return false;
    }
  }
}
