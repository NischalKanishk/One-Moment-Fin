#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testBackendFix() {
  try {
    console.log('🔍 Testing backend fix...');
    
    // Get the real user
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
    
    // Test what the backend should return
    console.log('\n🔍 Testing what backend should return...');
    
    const { data: assessments, error: assessmentsError } = await supabase
      .from('assessments')
      .select('*')
      .eq('user_id', user.id);
    
    if (assessmentsError) {
      console.log('❌ Assessments lookup error:', assessmentsError);
      return;
    }
    
    console.log('✅ Assessments found:', assessments?.length || 0);
    if (assessments && assessments.length > 0) {
      assessments.forEach(assessment => {
        console.log('  Assessment:', assessment.title);
        console.log('    ID:', assessment.id);
        console.log('    Framework Version ID:', assessment.framework_version_id);
        console.log('    Is Default:', assessment.is_default);
        console.log('    Is Published:', assessment.is_published);
        console.log('');
      });
    }
    
    // Test the API endpoint with a mock token
    console.log('🔍 Testing API endpoint...');
    
    const baseURL = 'http://localhost:3001';
    
    // Create a mock token with the correct user ID
    const mockPayload = {
      sub: user.clerk_id,
      user_id: user.id,
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    
    const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify(mockPayload)).toString('base64')}.test`;
    
    try {
      const response = await fetch(`${baseURL}/api/assessments`, {
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API endpoint working!');
        console.log('  Status:', response.status);
        console.log('  Assessments returned:', data.assessments?.length || 0);
        if (data.assessments && data.assessments.length > 0) {
          console.log('  Sample assessment:', data.assessments[0].title);
        }
      } else {
        const errorData = await response.text();
        console.log('❌ API endpoint error:');
        console.log('  Status:', response.status);
        console.log('  Error:', errorData);
      }
    } catch (error) {
      console.log('❌ API call failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testBackendFix();
