#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAssessmentLinks() {
  try {
    console.log('🔍 Checking assessment links for all users...');
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, clerk_id, full_name, assessment_link');
    
    if (usersError) {
      console.log('❌ Users error:', usersError);
      return;
    }
    
    console.log('✅ Users with assessment links:');
    users?.forEach(user => {
      console.log(`${user.full_name}:`);
      console.log(`  Clerk ID: ${user.clerk_id}`);
      console.log(`  Assessment Link: ${user.assessment_link || 'NOT SET'}`);
      console.log(`  Database ID: ${user.id}`);
      console.log('');
    });
    
    // Check if any users are missing assessment links
    const usersWithoutLinks = users?.filter(u => !u.assessment_link);
    if (usersWithoutLinks && usersWithoutLinks.length > 0) {
      console.log('⚠️  Users missing assessment links:');
      usersWithoutLinks.forEach(user => {
        console.log(`  - ${user.full_name} (Clerk ID: ${user.clerk_id})`);
      });
    } else {
      console.log('✅ All users have assessment links');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAssessmentLinks();
