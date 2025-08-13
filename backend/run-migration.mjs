#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Running Risk Assessment System Migration...\n');

  try {
    // Step 1: Create question_bank table
    console.log('📋 Step 1: Creating question_bank table...');
    const createQuestionBank = `
      CREATE TABLE IF NOT EXISTS question_bank (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        qkey TEXT UNIQUE NOT NULL,
        label TEXT NOT NULL,
        qtype TEXT NOT NULL,
        options JSONB,
        module TEXT,
        version INT NOT NULL DEFAULT 1,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    const { error: questionBankError } = await supabase.rpc('exec_sql', { sql: createQuestionBank });
    if (questionBankError) {
      console.log('⚠️  Note: exec_sql function not available, table may already exist');
    } else {
      console.log('✅ question_bank table created');
    }

    // Step 2: Create framework_question_map table
    console.log('📋 Step 2: Creating framework_question_map table...');
    const createFrameworkQuestionMap = `
      CREATE TABLE IF NOT EXISTS framework_question_map (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        framework_version_id UUID NOT NULL REFERENCES risk_framework_versions(id) ON DELETE CASCADE,
        qkey TEXT NOT NULL REFERENCES question_bank(qkey),
        required BOOLEAN NOT NULL DEFAULT true,
        order_index INT NOT NULL DEFAULT 0,
        alias TEXT,
        transform JSONB,
        options_override JSONB
      );
    `;

    const { error: frameworkMapError } = await supabase.rpc('exec_sql', { sql: createFrameworkQuestionMap });
    if (frameworkMapError) {
      console.log('⚠️  Note: exec_sql function not available, table may already exist');
    } else {
      console.log('✅ framework_question_map table created');
    }

    // Step 3: Create assessment_question_snapshots table
    console.log('📋 Step 3: Creating assessment_question_snapshots table...');
    const createSnapshotsTable = `
      CREATE TABLE IF NOT EXISTS assessment_question_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
        qkey TEXT NOT NULL,
        label TEXT NOT NULL,
        qtype TEXT NOT NULL,
        options JSONB,
        required BOOLEAN NOT NULL DEFAULT true,
        order_index INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    const { error: snapshotsError } = await supabase.rpc('exec_sql', { sql: createSnapshotsTable });
    if (snapshotsError) {
      console.log('⚠️  Note: exec_sql function not available, table may already exist');
    } else {
      console.log('✅ assessment_question_snapshots table created');
    }

    // Step 4: Create assessment_submissions table
    console.log('📋 Step 4: Creating assessment_submissions table...');
    const createSubmissionsTable = `
      CREATE TABLE IF NOT EXISTS assessment_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
        framework_version_id UUID NOT NULL REFERENCES risk_framework_versions(id) ON DELETE RESTRICT,
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        answers JSONB NOT NULL,
        result JSONB,
        lead_id UUID REFERENCES leads(id) ON DELETE SET NULL
      );
    `;

    const { error: submissionsError } = await supabase.rpc('exec_sql', { sql: createSubmissionsTable });
    if (submissionsError) {
      console.log('⚠️  Note: exec_sql function not available, table may already exist');
    } else {
      console.log('✅ assessment_submissions table created');
    }

    // Step 5: Add indexes for performance
    console.log('📋 Step 5: Adding indexes...');
    const addIndexes = `
      CREATE INDEX IF NOT EXISTS idx_question_bank_qkey ON question_bank(qkey);
      CREATE INDEX IF NOT EXISTS idx_question_bank_module ON question_bank(module);
      CREATE INDEX IF NOT EXISTS idx_framework_question_map_framework ON framework_question_map(framework_version_id);
      CREATE INDEX IF NOT EXISTS idx_framework_question_map_qkey ON framework_question_map(qkey);
      CREATE INDEX IF NOT EXISTS idx_assessment_question_snapshots_assessment ON assessment_question_snapshots(assessment_id);
      CREATE INDEX IF NOT EXISTS idx_assessment_submissions_assessment ON assessment_submissions(assessment_id);
      CREATE INDEX IF NOT EXISTS idx_assessment_submissions_owner ON assessment_submissions(owner_id);
    `;

    try {
      await supabase.rpc('exec_sql', { sql: addIndexes });
    } catch (error) {
      console.log('⚠️  Note: exec_sql function not available, indexes may already exist');
    }

    console.log('\n✅ Migration completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Run the seed data script to populate questions and framework mappings');
    console.log('2. Restart your backend server');
    console.log('3. Try accessing the assessments page again');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('\n📋 Manual steps required:');
    console.log('1. Run the SQL files manually in your database:');
    console.log('   - risk-assessment-system-migration-supabase.sql');
    console.log('   - seed-risk-assessment-data.sql');
  }
}

runMigration();
