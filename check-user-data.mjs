#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkUserData() {
  try {
    console.log('🔍 Checking user data...');
    
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, clerk_id, full_name, email');
    
    if (usersError) {
      console.log('❌ Users error:', usersError);
      return;
    }
    
    console.log('✅ Users found:', users?.length || 0);
    users?.forEach(user => {
      console.log(`  User: ${user.full_name} (ID: ${user.id}, Clerk ID: ${user.clerk_id})`);
    });
    
    // Get assessment forms
    const { data: forms, error: formsError } = await supabase
      .from('assessment_forms')
      .select('id, user_id, name, is_active');
    
    if (formsError) {
      console.log('❌ Forms error:', formsError);
      return;
    }
    
    console.log('\n✅ Assessment forms found:', forms?.length || 0);
    forms?.forEach(form => {
      console.log(`  Form: ${form.name} (ID: ${form.id}, User ID: ${form.user_id}, Active: ${form.is_active})`);
    });
    
    // Check if there's a mismatch
    if (users && forms) {
      console.log('\n🔍 Checking for user ID mismatches...');
      forms.forEach(form => {
        const user = users.find(u => u.id === form.user_id);
        if (!user) {
          console.log(`❌ Form ${form.name} has user_id ${form.user_id} but no user found`);
        } else {
          console.log(`✅ Form ${form.name} matches user ${user.full_name}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUserData();
