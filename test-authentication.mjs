#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testAuthentication() {
  try {
    console.log('🔍 Testing authentication flow...');
    
    // Get the real user (Nischal Kanishk) who has assessment forms
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', 'user_31EBiXKr1roEoy0yjvQQ2RD4q0N')
      .single();
    
    if (userError) {
      console.log('❌ User lookup error:', userError);
      return;
    }
    
    console.log('✅ Found user:', user.full_name);
    console.log('  Database ID:', user.id);
    console.log('  Clerk ID:', user.clerk_id);
    console.log('  Assessment Link:', user.assessment_link);
    
    // Test the assessment forms endpoint with this user's ID
    console.log('\n🔍 Testing assessment forms endpoint...');
    
    // Simulate what the backend would do
    const { data: forms, error: formsError } = await supabase
      .from('assessment_forms')
      .select('*')
      .eq('user_id', user.id);
    
    if (formsError) {
      console.log('❌ Forms lookup error:', formsError);
      return;
    }
    
    console.log('✅ Assessment forms found:', forms?.length || 0);
    if (forms && forms.length > 0) {
      forms.forEach(form => {
        console.log(`  - ${form.name} (ID: ${form.id}, Active: ${form.is_active})`);
      });
    }
    
    // Test the main assessments endpoint
    console.log('\n🔍 Testing main assessments endpoint...');
    
    // Transform the forms to match the expected Assessment interface
    const assessments = forms?.map(form => ({
      id: form.id,
      user_id: form.user_id,
      title: form.name,
      slug: form.name.toLowerCase().replace(/\s+/g, '-'),
      framework_version_id: '',
      is_default: form.is_active,
      is_published: form.is_active,
      created_at: form.created_at,
      updated_at: form.updated_at
    })) || [];
    
    console.log('✅ Transformed assessments:', assessments.length);
    if (assessments.length > 0) {
      console.log('Sample assessment:', assessments[0]);
    }
    
    // Test the assessment link functionality
    console.log('\n🔍 Testing assessment link functionality...');
    
    if (user.assessment_link) {
      console.log('✅ User has assessment link:', user.assessment_link);
      console.log('  Format check: 5 digits + userid + 5 letters');
      
      // Parse the assessment link
      const link = user.assessment_link;
      const digits = link.substring(0, 5);
      const userId = link.substring(5, link.length - 5);
      const letters = link.substring(link.length - 5);
      
      console.log('  Parsed components:');
      console.log('    Digits:', digits);
      console.log('    User ID:', userId);
      console.log('    Letters:', letters);
      
      // Verify the user ID matches
      if (userId === user.id) {
        console.log('✅ Assessment link user ID matches database user ID');
      } else {
        console.log('❌ Assessment link user ID mismatch!');
        console.log('  Link user ID:', userId);
        console.log('  Database user ID:', user.id);
      }
    } else {
      console.log('❌ User missing assessment link');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testAuthentication();
