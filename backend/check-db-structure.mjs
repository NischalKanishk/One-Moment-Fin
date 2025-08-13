import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabaseStructure() {
  try {
    console.log('🔍 Checking database structure...\n');

    // Check if assessments table exists
    const { data: assessmentsTable, error: assessmentsError } = await supabase
      .from('assessments')
      .select('*')
      .limit(1);

    if (assessmentsError) {
      console.log('❌ Assessments table error:', assessmentsError.message);
      
      // Check if it's a missing table error
      if (assessmentsError.message.includes('relation "assessments" does not exist')) {
        console.log('📋 Assessments table does not exist - needs migration');
      }
    } else {
      console.log('✅ Assessments table exists');
      
      // Check table structure
      const { data: columns, error: columnsError } = await supabase
        .rpc('get_table_columns', { table_name: 'assessments' });
      
      if (columnsError) {
        console.log('📋 Checking table structure manually...');
        const { data: sample, error: sampleError } = await supabase
          .from('assessments')
          .select('*')
          .limit(1);
        
        if (sample && sample.length > 0) {
          console.log('📋 Table columns:', Object.keys(sample[0]));
        }
      } else {
        console.log('📋 Table columns:', columns);
      }
    }

    // Check if risk_framework_versions table exists
    const { data: frameworksTable, error: frameworksError } = await supabase
      .from('risk_framework_versions')
      .select('*')
      .limit(1);

    if (frameworksError) {
      console.log('❌ Risk framework versions table error:', frameworksError.message);
      if (frameworksError.message.includes('relation "risk_framework_versions" does not exist')) {
        console.log('📋 Risk framework versions table does not exist - needs migration');
      }
    } else {
      console.log('✅ Risk framework versions table exists');
    }

    // Check if users table exists and has required columns
    const { data: usersTable, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (usersError) {
      console.log('❌ Users table error:', usersError.message);
    } else {
      console.log('✅ Users table exists');
      if (usersTable && usersTable.length > 0) {
        console.log('📋 Users table columns:', Object.keys(usersTable[0]));
      }
    }

    console.log('\n📋 Summary:');
    console.log('===========');
    console.log('The database needs to be migrated to support the new risk assessment system.');
    console.log('Run the following SQL files in order:');
    console.log('1. risk-assessment-system-migration-supabase.sql');
    console.log('2. seed-risk-assessment-data.sql');
    console.log('3. create-missing-assessments-table.sql (if needed)');

  } catch (error) {
    console.error('❌ Error checking database structure:', error);
  }
}

checkDatabaseStructure();
