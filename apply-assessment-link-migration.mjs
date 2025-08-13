#!/usr/bin/env node

/**
 * Script to apply the assessment_link field migration
 * This adds the assessment_link field to the users table and populates it for existing users
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🚀 Starting assessment_link migration...');
    
    // Check if the column already exists
    console.log('🔍 Checking if assessment_link column exists...');
    
    const { data: columnCheck, error: checkError } = await supabase
      .from('users')
      .select('assessment_link')
      .limit(1);
    
    if (checkError && checkError.code === '42703') {
      console.log('❌ Column does not exist. Please run the SQL migration manually:');
      console.log('   ALTER TABLE users ADD COLUMN assessment_link TEXT UNIQUE;');
      console.log('   CREATE INDEX idx_users_assessment_link ON users(assessment_link);');
      return;
    } else if (checkError) {
      console.error('❌ Error checking column:', checkError);
      return;
    } else {
      console.log('✅ assessment_link column exists');
    }
    
    // Update existing users with assessment links
    console.log('🔄 Updating existing users with assessment links...');
    
    // Get users with null assessment_link or old format
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, assessment_link')
      .or('assessment_link.is.null,assessment_link.like./a/%');
    
    if (usersError) {
      console.error('❌ Failed to fetch users:', usersError);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('✅ All users already have assessment links in the new format');
      return;
    }
    
    console.log(`📊 Found ${users.length} users to update (null or old format)`);
    
    // Update each user with a unique assessment link
    for (const user of users) {
      const assessmentLink = generateAssessmentLink(user.id);
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ assessment_link: assessmentLink })
        .eq('id', user.id);
      
      if (updateError) {
        console.error(`❌ Failed to update user ${user.id}:`, updateError);
      } else {
        console.log(`✅ Updated user ${user.id} with link: ${assessmentLink}`);
      }
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('⚠️  Note: You may need to run this manually in your database:');
    console.log('   ALTER TABLE users ALTER COLUMN assessment_link SET NOT NULL;');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

function generateAssessmentLink(userId) {
  // Generate 5 random digits
  const randomDigits = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  
  // Generate 5 random letters
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const randomLetters = Array.from({ length: 5 }, () => 
    letters.charAt(Math.floor(Math.random() * letters.length))
  ).join('');
  
  // Combine: 5 digits + userid + 5 letters
  return `${randomDigits}${userId}${randomLetters}`;
}

// Run the migration
applyMigration();
