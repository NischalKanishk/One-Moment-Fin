#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testClerkAuth() {
  try {
    console.log('🔍 Testing Clerk Authentication Flow...');
    
    // Check environment variables
    console.log('\n📋 Environment Check:');
    console.log('  VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing');
    console.log('  SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');
    console.log('  VITE_CLERK_PUBLISHABLE_KEY:', process.env.VITE_CLERK_PUBLISHABLE_KEY ? '✅ Set' : '❌ Missing');
    
    // Check all users in the database
    console.log('\n👥 Database Users:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, clerk_id, full_name, email, assessment_link');
    
    if (usersError) {
      console.log('❌ Users lookup error:', usersError);
      return;
    }
    
    users?.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.full_name}`);
      console.log(`     Clerk ID: ${user.clerk_id}`);
      console.log(`     Database ID: ${user.id}`);
      console.log(`     Email: ${user.email || 'Not set'}`);
      console.log(`     Assessment Link: ${user.assessment_link || 'NOT SET'}`);
      console.log('');
    });
    
    // Check authentication flow
    console.log('🔐 Authentication Flow Analysis:');
    
    // Find the user with assessment forms
    const userWithForms = users?.find(u => u.clerk_id === 'user_31EBiXKr1roEoy0yjvQQ2RD4q0N');
    
    if (userWithForms) {
      console.log('✅ Found user with assessment forms:', userWithForms.full_name);
      console.log('  Clerk ID:', userWithForms.clerk_id);
      console.log('  Database ID:', userWithForms.id);
      
      // Check if this user has assessment forms
      const { data: forms, error: formsError } = await supabase
        .from('assessment_forms')
        .select('*')
        .eq('user_id', userWithForms.id);
      
      if (formsError) {
        console.log('❌ Forms lookup error:', formsError);
      } else {
        console.log('  Assessment Forms:', forms?.length || 0);
        forms?.forEach(form => {
          console.log(`    - ${form.name} (Active: ${form.is_active})`);
        });
      }
      
      // Check assessment link format
      if (userWithForms.assessment_link) {
        console.log('  Assessment Link:', userWithForms.assessment_link);
        
        // Parse the link format: 5 digits + userid + 5 letters
        const link = userWithForms.assessment_link;
        if (link.length >= 10) {
          const digits = link.substring(0, 5);
          const userId = link.substring(5, link.length - 5);
          const letters = link.substring(link.length - 5);
          
          console.log('    Format Analysis:');
          console.log('      Digits:', digits, digits.match(/^\d{5}$/) ? '✅ Valid' : '❌ Invalid');
          console.log('      User ID:', userId, userId === userWithForms.id ? '✅ Matches' : '❌ Mismatch');
          console.log('      Letters:', letters, letters.match(/^[A-Z]{5}$/) ? '✅ Valid' : '❌ Invalid');
          
          if (userId === userWithForms.id) {
            console.log('    ✅ Assessment link format is correct and user ID matches');
          } else {
            console.log('    ❌ Assessment link user ID mismatch!');
          }
        } else {
          console.log('    ❌ Assessment link format is invalid (too short)');
        }
      } else {
        console.log('  ❌ User missing assessment link');
      }
    } else {
      console.log('❌ User with Clerk ID user_31EBiXKr1roEoy0yjvQQ2RD4q0N not found');
    }
    
    // Check for potential authentication issues
    console.log('\n🔍 Potential Authentication Issues:');
    
    // Issue 1: Clerk user ID mismatch
    const clerkIds = users?.map(u => u.clerk_id) || [];
    const uniqueClerkIds = [...new Set(clerkIds)];
    
    if (uniqueClerkIds.length !== clerkIds.length) {
      console.log('  ❌ Duplicate Clerk IDs found - this will cause authentication issues');
    } else {
      console.log('  ✅ No duplicate Clerk IDs');
    }
    
    // Issue 2: Missing assessment links
    const usersWithoutLinks = users?.filter(u => !u.assessment_link) || [];
    if (usersWithoutLinks.length > 0) {
      console.log('  ⚠️  Users missing assessment links:', usersWithoutLinks.length);
      usersWithoutLinks.forEach(user => {
        console.log(`    - ${user.full_name} (${user.clerk_id})`);
      });
    } else {
      console.log('  ✅ All users have assessment links');
    }
    
    // Issue 3: Check if the user with forms is properly configured
    if (userWithForms) {
      console.log('\n✅ User Configuration Status:');
      console.log('  Database User:', userWithForms.full_name);
      console.log('  Clerk ID:', userWithForms.clerk_id);
      console.log('  Assessment Forms:', forms?.length || 0);
      console.log('  Assessment Link:', userWithForms.assessment_link ? '✅ Set' : '❌ Missing');
      
      if (userWithForms.assessment_link && forms && forms.length > 0) {
        console.log('  🎯 Status: FULLY CONFIGURED - Should work in frontend');
      } else {
        console.log('  ⚠️  Status: PARTIALLY CONFIGURED - May have issues');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testClerkAuth();
