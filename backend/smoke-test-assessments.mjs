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

async function smokeTestAssessments() {
  console.log('🧪 Running Assessment v2 Smoke Test...\n');

  try {
    // Get the first user
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, clerk_id')
      .limit(1);

    if (usersError || !users.length) {
      throw new Error('No users found');
    }

    const user = users[0];
    console.log(`👤 Testing with user: ${user.full_name}`);

    // Test 1: Create a test form
    console.log('\n📝 Test 1: Creating test form...');
    const { data: form, error: formError } = await supabase
      .from('assessment_forms')
      .insert({
        user_id: user.id,
        name: 'Smoke Test Form',
        description: 'Form for testing assessment v2 functionality',
        is_active: true
      })
      .select()
      .single();

    if (formError) throw new Error(`Form creation failed: ${formError.message}`);
    console.log(`✅ Form created: ${form.name} (${form.id})`);

    // Test 2: Create a version with schema and scoring
    console.log('\n🔢 Test 2: Creating form version...');
    const testSchema = {
      type: 'object',
      properties: {
        test_question: {
          type: 'string',
          title: 'Test Question',
          enum: ['Option A', 'Option B', 'Option C'],
          default: 'Option A'
        }
      },
      required: ['test_question']
    };

    const testScoring = {
      weights: { test_question: 1.0 },
      scoring: { test_question: { 'Option A': 1, 'Option B': 2, 'Option C': 3 } },
      thresholds: { low: { min: 0, max: 1 }, medium: { min: 2, max: 2 }, high: { min: 3, max: 3 } }
    };

    const { data: version, error: versionError } = await supabase
      .from('assessment_form_versions')
      .insert({
        form_id: form.id,
        version: 1,
        schema: testSchema,
        scoring: testScoring
      })
      .select()
      .single();

    if (versionError) throw new Error(`Version creation failed: ${versionError.message}`);
    console.log(`✅ Version created: ${version.version}`);

    // Test 3: Set as default form
    console.log('\n⭐ Test 3: Setting as default form...');
    const { error: defaultError } = await supabase
      .from('users')
      .update({ default_assessment_form_id: form.id })
      .eq('id', user.id);

    if (defaultError) throw new Error(`Setting default failed: ${defaultError.message}`);
    console.log('✅ Set as default form');

    // Test 4: Create a test lead
    console.log('\n👥 Test 4: Creating test lead...');
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        user_id: user.id,
        full_name: 'Smoke Test Lead',
        email: 'smoke@test.com',
        phone: '+1234567890',
        age: 30,
        source_link: 'Smoke Test',
        status: 'lead'
      })
      .select()
      .single();

    if (leadError) throw new Error(`Lead creation failed: ${leadError.message}`);
    console.log(`✅ Lead created: ${lead.full_name}`);

    // Test 5: Assign form to lead
    console.log('\n📋 Test 5: Assigning form to lead...');
    const { error: assignError } = await supabase
      .from('lead_assessment_assignments')
      .insert({
        user_id: user.id,
        lead_id: lead.id,
        form_id: form.id,
        version_id: version.id
      });

    if (assignError) throw new Error(`Assignment failed: ${assignError.message}`);
    console.log('✅ Form assigned to lead');

    // Test 6: Submit assessment (MFD)
    console.log('\n📝 Test 6: Submitting assessment (MFD)...');
    const { data: submission, error: submitError } = await supabase
      .from('assessment_submissions')
      .insert({
        user_id: user.id,
        lead_id: lead.id,
        form_id: form.id,
        version_id: version.id,
        filled_by: 'mfd',
        answers: { test_question: 'Option B' },
        score: 2,
        risk_category: 'medium',
        status: 'submitted'
      })
      .select()
      .single();

    if (submitError) throw new Error(`Submission failed: ${submitError.message}`);
    console.log(`✅ Assessment submitted: Score ${submission.score}, Category ${submission.risk_category}`);

    // Test 7: Create assessment link
    console.log('\n🔗 Test 7: Creating assessment link...');
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

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

    if (linkError) throw new Error(`Link creation failed: ${linkError.message}`);
    console.log(`✅ Assessment link created: ${token.substring(0, 8)}...`);

    // Test 8: Submit via token (lead)
    console.log('\n📝 Test 8: Submitting via token (lead)...');
    const { data: leadSubmission, error: leadSubmitError } = await supabase
      .from('assessment_submissions')
      .insert({
        user_id: user.id,
        lead_id: lead.id,
        form_id: form.id,
        version_id: version.id,
        filled_by: 'lead',
        answers: { test_question: 'Option C' },
        score: 3,
        risk_category: 'high',
        status: 'submitted'
      })
      .select()
      .single();

    if (leadSubmitError) throw new Error(`Lead submission failed: ${leadSubmitError.message}`);
    console.log(`✅ Lead submission: Score ${leadSubmission.score}, Category ${leadSubmission.risk_category}`);

    // Test 9: Mark link as submitted
    console.log('\n✅ Test 9: Marking link as submitted...');
    const { error: updateLinkError } = await supabase
      .from('assessment_links')
      .update({ 
        status: 'submitted',
        submitted_at: new Date().toISOString()
      })
      .eq('id', link.id);

    if (updateLinkError) throw new Error(`Link update failed: ${updateLinkError.message}`);
    console.log('✅ Link marked as submitted');

    // Test 10: Verify all data exists
    console.log('\n🔍 Test 10: Verifying data integrity...');
    
    const { data: forms, error: formsError } = await supabase
      .from('assessment_forms')
      .select('*')
      .eq('user_id', user.id);

    const { data: versions, error: versionsError } = await supabase
      .from('assessment_form_versions')
      .select('*')
      .eq('form_id', form.id);

    const { data: submissions, error: submissionsError } = await supabase
      .from('assessment_submissions')
      .select('*')
      .eq('form_id', form.id);

    if (formsError || versionsError || submissionsError) {
      throw new Error('Data verification failed');
    }

    console.log(`✅ Data verification passed:`);
    console.log(`   • Forms: ${forms.length}`);
    console.log(`   • Versions: ${versions.length}`);
    console.log(`   • Submissions: ${submissions.length}`);

    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...');
    await supabase.from('assessment_submissions').delete().eq('form_id', form.id);
    await supabase.from('assessment_links').delete().eq('form_id', form.id);
    await supabase.from('lead_assessment_assignments').delete().eq('form_id', form.id);
    await supabase.from('assessment_form_versions').delete().eq('form_id', form.id);
    await supabase.from('assessment_forms').delete().eq('id', form.id);
    await supabase.from('leads').delete().eq('id', lead.id);
    
    // Reset user's default form if it was our test form
    if (user.default_assessment_form_id === form.id) {
      await supabase.from('users').update({ default_assessment_form_id: null }).eq('id', user.id);
    }

    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All smoke tests passed! Assessment v2 system is working correctly.');

  } catch (error) {
    console.error('❌ Smoke test failed:', error.message);
    process.exit(1);
  }
}

// Run the smoke test
smokeTestAssessments();
