import { supabase } from '../config/supabase';
import { AssessmentFormService } from './assessmentFormService';
import { getDefaultScoring } from '../lib/forms/score';
import { FormSchema } from '../lib/forms/validate';

export class SeedAssessmentDataService {
  /**
   * Create default assessment form and version for a new user
   */
  static async createDefaultAssessmentForUser(userId: string): Promise<{
    form: any;
    version: any;
  }> {
    try {
      // Create the default form
      const form = await AssessmentFormService.createForm(userId, {
        name: 'Default Risk Assessment',
        description: 'Comprehensive risk assessment for mutual fund investments',
        is_active: true
      });

      // Create the default schema
      const defaultSchema: FormSchema = {
        title: 'Default Risk Form',
        type: 'object',
        properties: {
          fullName: {
            type: 'string',
            title: 'Full Name',
            minLength: 2
          },
          email: {
            type: 'string',
            title: 'Email Address',
            format: 'email'
          },
          phone: {
            type: 'string',
            title: 'Phone Number'
          },
          age: {
            type: 'integer',
            title: 'Age',
            minimum: 18,
            maximum: 99
          },
          horizon: {
            type: 'string',
            title: 'Investment Horizon',
            enum: ['<1y', '1-3y', '3-5y', '>5y'],
            enumNames: ['Less than 1 year', '1-3 years', '3-5 years', 'More than 5 years']
          },
          volatilityTolerance: {
            type: 'integer',
            title: 'Volatility Tolerance',
            description: 'Rate your comfort with market fluctuations (1 = Very Low, 5 = Very High)',
            minimum: 1,
            maximum: 5
          },
          monthlyInvestment: {
            type: 'integer',
            title: 'Monthly Investment Amount (₹)',
            minimum: 1000,
            maximum: 1000000
          },
          experience: {
            type: 'string',
            title: 'Investment Experience',
            enum: ['new', 'some', 'experienced'],
            enumNames: ['New to investing', 'Some experience', 'Experienced investor']
          }
        },
        required: ['fullName', 'age', 'volatilityTolerance', 'horizon']
      };

      // Create the default UI hints
      const defaultUI = {
        'ui:order': ['fullName', 'email', 'phone', 'age', 'horizon', 'volatilityTolerance', 'monthlyInvestment', 'experience'],
        'ui:title': 'Risk Assessment Form',
        'ui:description': 'Please fill out this form to help us understand your investment profile and provide personalized recommendations.',
        fullName: {
          'ui:placeholder': 'Enter your full name'
        },
        email: {
          'ui:placeholder': 'Enter your email address'
        },
        phone: {
          'ui:placeholder': 'Enter your phone number'
        },
        age: {
          'ui:placeholder': 'Enter your age'
        },
        horizon: {
          'ui:placeholder': 'Select your investment horizon'
        },
        volatilityTolerance: {
          'ui:placeholder': 'Select your comfort level'
        },
        monthlyInvestment: {
          'ui:placeholder': 'Enter amount in ₹'
        },
        experience: {
          'ui:placeholder': 'Select your experience level'
        }
      };

      // Get default scoring configuration
      const defaultScoring = getDefaultScoring();

      // Create version 1
      const version = await AssessmentFormService.createVersion(form.id, {
        schema: defaultSchema,
        ui: defaultUI,
        scoring: defaultScoring
      });

      // Set this as the user's default form
      await AssessmentFormService.setDefaultForm(userId, form.id);

      return { form, version };
    } catch (error) {
      console.error('Failed to create default assessment for user:', error);
      throw error;
    }
  }

  /**
   * Migrate existing user to new assessment system
   */
  static async migrateExistingUser(userId: string): Promise<void> {
    try {
      // Check if user already has the new assessment system
      const { data: existingForm } = await supabase
        .from('assessment_forms')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingForm) {
        console.log('User already has assessment forms, skipping migration');
        return;
      }

      // Check if user has old assessments
      const { data: oldAssessments } = await supabase
        .from('assessments')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (oldAssessments) {
        // Migrate the old assessment to new format
        await this.migrateOldAssessment(userId, oldAssessments);
      } else {
        // Create new default assessment
        await this.createDefaultAssessmentForUser(userId);
      }
    } catch (error) {
      console.error('Failed to migrate existing user:', error);
      // Fallback to creating default assessment
      await this.createDefaultAssessmentForUser(userId);
    }
  }

  /**
   * Migrate old assessment format to new JSON schema
   */
  private static async migrateOldAssessment(userId: string, oldAssessment: any): Promise<void> {
    try {
      // Get old questions
      const { data: oldQuestions } = await supabase
        .from('assessment_questions')
        .select('*')
        .eq('assessment_id', oldAssessment.id)
        .order('created_at', { ascending: true });

      if (!oldQuestions || oldQuestions.length === 0) {
        // No questions to migrate, create default
        await this.createDefaultAssessmentForUser(userId);
        return;
      }

      // Create new form
      const form = await AssessmentFormService.createForm(userId, {
        name: oldAssessment.name || 'Migrated Assessment',
        description: oldAssessment.description || 'Assessment migrated from legacy system',
        is_active: true
      });

      // Convert old questions to JSON schema
      const schema = this.convertQuestionsToSchema(oldQuestions);
      const ui = this.generateUIFromQuestions(oldQuestions);
      const scoring = this.generateScoringFromQuestions(oldQuestions);

      // Create version 1
      await AssessmentFormService.createVersion(form.id, {
        schema,
        ui,
        scoring
      });

      // Set as default
      await AssessmentFormService.setDefaultForm(userId, form.id);

      console.log(`Successfully migrated assessment ${oldAssessment.id} for user ${userId}`);
    } catch (error) {
      console.error('Failed to migrate old assessment:', error);
      // Fallback to creating default assessment
      await this.createDefaultAssessmentForUser(userId);
    }
  }

  /**
   * Convert old question format to JSON schema
   */
  private static convertQuestionsToSchema(questions: any[]): any {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    questions.forEach((question, index) => {
      const fieldName = `question_${index + 1}`;
      
      let property: any = {
        title: question.question_text,
        type: this.mapQuestionType(question.type)
      };

      if (question.options && question.options.length > 0) {
        if (question.type === 'mcq') {
          property.enum = question.options;
          property.enumNames = question.options;
        } else if (question.type === 'scale') {
          property.minimum = 1;
          property.maximum = question.options.length;
        }
      }

     properties[fieldName] = property;
      required.push(fieldName);
    });

    return {
      title: 'Risk Assessment',
      type: 'object',
      properties,
      required
    };
  }

  /**
   * Map old question types to JSON schema types
   */
  private static mapQuestionType(oldType: string): string {
    switch (oldType) {
      case 'mcq':
        return 'string';
      case 'scale':
        return 'integer';
      case 'text':
        return 'string';
      case 'number':
        return 'integer';
      case 'dropdown':
        return 'string';
      default:
        return 'string';
    }
  }

  /**
   * Generate UI hints from old questions
   */
  private static generateUIFromQuestions(questions: any[]): any {
    const ui: any = {
      'ui:order': questions.map((_, index) => `question_${index + 1}`)
    };

    questions.forEach((question, index) => {
      const fieldName = `question_${index + 1}`;
      ui[fieldName] = {
        'ui:placeholder': question.question_text
      };
    });

    return ui;
  }

  /**
   * Generate scoring configuration from old questions
   */
  private static generateScoringFromQuestions(questions: any[]): any {
    const weights: Record<string, number> = {};
    let totalWeight = 0;

    questions.forEach((question, index) => {
      const fieldName = `question_${index + 1}`;
      const weight = question.weight || 1;
      weights[fieldName] = weight;
      totalWeight += weight;
    });

    return {
      weights,
      thresholds: {
        low: Math.round(totalWeight * 0.33),
        medium: Math.round(totalWeight * 0.66),
        high: totalWeight
      }
    };
  }
}
