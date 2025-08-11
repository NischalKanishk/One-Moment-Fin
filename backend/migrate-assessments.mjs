#!/usr/bin/env node

/**
 * Migration script to add default assessments for existing users
 * Run this script after implementing the new default assessment system
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Default assessment questions
const DEFAULT_QUESTIONS = [
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
 * Check if a user already has a default assessment
 */
async function hasDefaultAssessment(userId) {
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

/**
 * Create default assessment for a user
 */
async function createDefaultAssessment(userId, userName) {
  try {
    console.log(`  Creating default assessment for user: ${userName}`);
    
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
      console.error(`    ❌ Failed to create assessment:`, assessmentError);
      throw new Error('Failed to create assessment');
    }

    // Create all default questions
    const questionsToInsert = DEFAULT_QUESTIONS.map(q => ({
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
      console.error(`    ❌ Failed to create questions:`, questionsError);
      // Clean up the assessment if questions fail
      await supabase
        .from('assessments')
        .delete()
        .eq('id', assessment.id);
      throw new Error('Failed to create questions');
    }

    console.log(`    ✅ Successfully created assessment with ${DEFAULT_QUESTIONS.length} questions`);
    return true;
  } catch (error) {
    console.error(`    ❌ Error creating default assessment:`, error);
    return false;
  }
}

/**
 * Main migration function
 */
async function migrateUsers() {
  try {
    console.log('🚀 Starting migration of existing users to default assessments...\n');
    
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, email');

    if (usersError) {
      console.error('❌ Failed to fetch users:', usersError);
      process.exit(1);
    }

    if (!users || users.length === 0) {
      console.log('ℹ️  No users found to migrate');
      return;
    }

    console.log(`📊 Found ${users.length} users to check for migration\n`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
      console.log(`👤 Processing user: ${user.full_name} (${user.email})`);
      
      try {
        // Check if user already has a default assessment
        const hasDefault = await hasDefaultAssessment(user.id);
        
        if (hasDefault) {
          console.log(`  ⏭️  User already has default assessment, skipping`);
          skipped++;
        } else {
          // Create default assessment
          const success = await createDefaultAssessment(user.id, user.full_name);
          if (success) {
            migrated++;
          } else {
            errors++;
          }
        }
      } catch (error) {
        console.error(`  ❌ Failed to process user ${user.full_name}:`, error);
        errors++;
      }
      
      console.log(''); // Empty line for readability
    }

    // Summary
    console.log('📋 Migration Summary:');
    console.log(`  Total users: ${users.length}`);
    console.log(`  Successfully migrated: ${migrated}`);
    console.log(`  Skipped (already had): ${skipped}`);
    console.log(`  Errors: ${errors}`);
    
    if (errors === 0) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log(`\n⚠️  Migration completed with ${errors} errors`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateUsers()
    .then(() => {
      console.log('\n🎉 Migration script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateUsers, createDefaultAssessment, hasDefaultAssessment };
