#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkFormVersions() {
  try {
    console.log('🔍 Checking assessment form versions...');
    
    const { data: versions, error: versionsError } = await supabase
      .from('assessment_form_versions')
      .select('*')
      .limit(3);
    
    if (versionsError) {
      console.log('❌ Versions error:', versionsError);
      return;
    }
    
    console.log('✅ Form versions found:', versions?.length || 0);
    if (versions && versions.length > 0) {
      versions.forEach(version => {
        console.log('  Version:', version);
        console.log('    ID:', version.id);
        console.log('    Form ID:', version.form_id);
        console.log('    Version Number:', version.version);
        console.log('    Schema:', version.schema ? 'Has schema' : 'No schema');
        console.log('    Scoring:', version.scoring ? 'Has scoring' : 'No scoring');
        console.log('');
      });
    }
    
    // Check if there's a way to link to frameworks
    console.log('🔍 Checking for framework connections...');
    
    // Look for any table that might connect forms to frameworks
    const tables = ['assessment_forms', 'assessments', 'risk_framework_versions'];
    
    for (const tableName of tables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ ${tableName}: ${error.message}`);
        } else {
          console.log(`✅ ${tableName}: exists with ${data?.length || 0} records`);
          if (data && data.length > 0) {
            console.log('  Sample columns:', Object.keys(data[0]));
          }
        }
      } catch (e) {
        console.log(`❌ ${tableName}: ${e.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkFormVersions();
