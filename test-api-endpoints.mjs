#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testAPIEndpoints() {
  try {
    console.log('🔍 Testing backend API endpoints...');
    
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
    
    console.log('✅ Testing with user:', user.full_name);
    console.log('  Database ID:', user.id);
    console.log('  Clerk ID:', user.clerk_id);
    
    // Test the backend endpoints
    const baseURL = 'http://localhost:3001';
    
    // Test 1: Health endpoint (no auth required)
    console.log('\n🔍 Test 1: Health endpoint');
    try {
      const healthResponse = await fetch(`${baseURL}/api/assessments/health`);
      const healthData = await healthResponse.json();
      console.log('  Status:', healthResponse.status);
      console.log('  Response:', healthData);
    } catch (error) {
      console.log('  ❌ Error:', error.message);
    }
    
    // Test 2: Main assessments endpoint (with mock token)
    console.log('\n🔍 Test 2: Main assessments endpoint');
    try {
      // Create a mock JWT token with the correct user ID
      const mockPayload = {
        sub: user.clerk_id, // This should match the clerk_id in the database
        user_id: user.id,
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };
      
      // Encode as base64 (simplified JWT structure)
      const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify(mockPayload)).toString('base64')}.test`;
      
      const assessmentsResponse = await fetch(`${baseURL}/api/assessments`, {
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (assessmentsResponse.ok) {
        const assessmentsData = await assessmentsResponse.json();
        console.log('  ✅ Status:', assessmentsResponse.status);
        console.log('  ✅ Assessments found:', assessmentsData.assessments?.length || 0);
        if (assessmentsData.assessments && assessmentsData.assessments.length > 0) {
          console.log('  ✅ Sample assessment:', assessmentsData.assessments[0].title);
        }
      } else {
        const errorData = await assessmentsResponse.text();
        console.log('  ❌ Status:', assessmentsResponse.status);
        console.log('  ❌ Error:', errorData);
      }
    } catch (error) {
      console.log('  ❌ Error:', error.message);
    }
    
    // Test 3: Assessment forms endpoint (with mock token)
    console.log('\n🔍 Test 3: Assessment forms endpoint');
    try {
      const mockPayload = {
        sub: user.clerk_id,
        user_id: user.id,
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };
      
      const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify(mockPayload)).toString('base64')}.test`;
      
      const formsResponse = await fetch(`${baseURL}/api/assessments/forms`, {
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (formsResponse.ok) {
        const formsData = await formsResponse.json();
        console.log('  ✅ Status:', formsResponse.status);
        console.log('  ✅ Forms found:', formsData.forms?.length || 0);
        if (formsData.forms && formsData.forms.length > 0) {
          console.log('  ✅ Sample form:', formsData.forms[0].name);
          console.log('  ✅ Questions count:', formsData.forms[0].questions?.length || 0);
        }
      } else {
        const errorData = await formsResponse.text();
        console.log('  ❌ Status:', formsResponse.status);
        console.log('  ❌ Error:', errorData);
      }
    } catch (error) {
      console.log('  ❌ Error:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testAPIEndpoints();
