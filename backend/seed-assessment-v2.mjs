#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedAssessmentV2() {
  console.log('🌱 Seeding Assessment v2 System...\n');

  try {
    // Get the first user (for demo purposes)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, clerk_id')
      .limit(1);

    if (usersError || !users.length) {
      console.error('❌ No users found. Please create a user first.');
      process.exit(1);
    }

    const user = users[0];
    console.log(`👤 Using user: ${user.full_name} (${user.clerk_id})`);

    // Check if user already has a default form
    if (user.default_assessment_form_id) {
      console.log('✅ User already has a default assessment form');
      return;
    }

    // 1. Create default assessment form
    console.log('\n📝 Creating default assessment form...');
    const { data: form, error: formError } = await supabase
      .from('assessment_forms')
      .insert({
        user_id: user.id,
        name: 'Default Risk Assessment',
        description: 'Standard risk tolerance assessment for new clients',
        is_active: true
      })
      .select()
      .single();

    if (formError) {
      throw new Error(`Failed to create form: ${formError.message}`);
    }

    console.log(`✅ Created form: ${form.name} (${form.id})`);

    // 2. Create version 1 with sample schema and scoring
    console.log('\n🔢 Creating form version 1...');
    const sampleSchema = {
      type: 'object',
      properties: {
        investment_experience: {
          type: 'string',
          title: 'What is your investment experience?',
          enum: ['None', 'Beginner', 'Intermediate', 'Advanced'],
          default: 'None'
        },
        risk_tolerance: {
          type: 'string',
          title: 'How would you describe your risk tolerance?',
          enum: ['Conservative', 'Moderate', 'Aggressive'],
          default: 'Moderate'
        },
        investment_horizon: {
          type: 'string',
          title: 'What is your investment time horizon?',
          enum: ['Less than 3 years', '3-5 years', '5-10 years', 'More than 10 years'],
          default: '5-10 years'
        },
        financial_goals: {
          type: 'string',
          title: 'What is your primary financial goal?',
          enum: ['Capital preservation', 'Income generation', 'Growth', 'Tax efficiency'],
          default: 'Growth'
        },
        emergency_fund: {
          type: 'string',
          title: 'Do you have an emergency fund?',
          enum: ['Yes, 6+ months', 'Yes, 3-6 months', 'Yes, less than 3 months', 'No'],
          default: 'Yes, 3-6 months'
        }
      },
      required: ['investment_experience', 'risk_tolerance', 'investment_horizon', 'financial_goals', 'emergency_fund']
    };

    const sampleScoring = {
      weights: {
        investment_experience: 0.2,
        risk_tolerance: 0.3,
        investment_horizon: 0.25,
        financial_goals: 0.15,
        emergency_fund: 0.1
      },
      scoring: {
        investment_experience: { 'None': 1, 'Beginner': 2, 'Intermediate': 3, 'Advanced': 4 },
        risk_tolerance: { 'Conservative': 1, 'Moderate': 2, 'Aggressive': 3 },
        investment_horizon: { 'Less than 3 years': 1, '3-5 years': 2, '5-10 years': 3, 'More than 10 years': 4 },
        financial_goals: { 'Capital preservation': 1, 'Income generation': 2, 'Growth': 3, 'Tax efficiency': 2 },
        emergency_fund: { 'Yes, 6+ months': 3, 'Yes, 3-6 months': 2, 'Yes, less than 3 months': 1, 'No': 0 }
      },
      thresholds: {
        low: { min: 0, max: 8 },
        medium: { min: 9, max: 12 },
        high: { min: 13, max: 16 }
      }
    };

    const { data: version, error: versionError } = await supabase
      .from('assessment_form_versions')
      .insert({
        form_id: form.id,
        version: 1,
        schema: sampleSchema,
        ui: {
          layout: 'vertical',
          theme: 'default',
          showProgress: true
        },
        scoring: sampleScoring
      })
      .select()
      .single();

    if (versionError) {
      throw new Error(`Failed to create version: ${versionError.message}`);
    }

    console.log(`✅ Created version ${version.version} with schema and scoring`);

    // 3. Set as user's default form
    console.log('\n⭐ Setting as default form...');
    const { error: updateError } = await supabase
      .from('users')
      .update({ default_assessment_form_id: form.id })
      .eq('id', user.id);

    if (updateError) {
      throw new Error(`Failed to set default form: ${updateError.message}`);
    }

    console.log('✅ Set as default assessment form');

    // 4. Create a sample lead for testing
    console.log('\n👥 Creating sample lead for testing...');
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        user_id: user.id,
        full_name: 'Sample Client',
        email: 'sample@example.com',
        phone: '+1234567890',
        age: 35,
        source_link: 'Assessment v2 Demo',
        status: 'lead'
      })
      .select()
      .single();

    if (leadError) {
      console.warn('⚠️  Could not create sample lead:', leadError.message);
    } else {
      console.log(`✅ Created sample lead: ${lead.full_name}`);

      // 5. Create an assessment link for the lead
      console.log('\n🔗 Creating assessment link for sample lead...');
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      const { data: link, error: linkError } = await supabase
        .from('assessment_links')
        .insert({
          token,
          user_id: user.id,
          lead_id: lead.id,
          form_id: form.id,
          version_id: version.id,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (linkError) {
        console.warn('⚠️  Could not create assessment link:', linkError.message);
      } else {
        console.log(`✅ Created assessment link: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/assess/${token}`);
      }
    }

    console.log('\n🎉 Assessment v2 system seeded successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • Form: ${form.name}`);
    console.log(`   • Version: ${version.version}`);
    console.log(`   • Default for user: ${user.full_name}`);
    console.log(`   • Sample lead: ${lead ? lead.full_name : 'Not created'}`);
    console.log(`   • Assessment link: ${lead ? 'Created' : 'Not applicable'}`);

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

// Run the seeding
seedAssessmentV2();
