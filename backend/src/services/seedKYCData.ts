import { supabase } from '../config/supabase';

// Sample KYC template data
const dummyTemplates = [
  {
    name: 'Individual Investor - Basic',
    description: 'Standard KYC template for individual retail investors with basic requirements',
    fields: [
      'full_name', 'date_of_birth', 'gender', 'nationality', 'email', 'phone',
      'address_line_1', 'city', 'state', 'postal_code', 'country',
      'id_type', 'id_number', 'occupation', 'annual_income', 'source_of_funds',
      'investment_experience', 'risk_tolerance', 'investment_objective',
      'pep_status', 'us_tax_resident', 'fatca_compliance',
      'address_proof', 'income_proof', 'photo'
    ],
    is_active: true
  },
  {
    name: 'Corporate Investor - Enhanced',
    description: 'Comprehensive KYC template for corporate entities with enhanced due diligence',
    fields: [
      'full_name', 'date_of_birth', 'gender', 'nationality', 'email', 'phone',
      'address_line_1', 'address_line_2', 'city', 'state', 'postal_code', 'country',
      'id_type', 'id_number', 'id_issue_date', 'id_expiry_date',
      'occupation', 'employer', 'annual_income', 'source_of_funds',
      'investment_experience', 'risk_tolerance', 'investment_objective',
      'pep_status', 'us_tax_resident', 'fatca_compliance',
      'address_proof', 'income_proof', 'photo'
    ],
    is_active: true
  },
  {
    name: 'High Net Worth Individual',
    description: 'Premium KYC template for high net worth individuals with additional compliance checks',
    fields: [
      'full_name', 'date_of_birth', 'gender', 'nationality', 'marital_status',
      'email', 'phone', 'address_line_1', 'address_line_2', 'city', 'state', 'postal_code', 'country',
      'id_type', 'id_number', 'id_issue_date', 'id_expiry_date',
      'occupation', 'employer', 'annual_income', 'source_of_funds',
      'investment_experience', 'risk_tolerance', 'investment_objective',
      'pep_status', 'us_tax_resident', 'fatca_compliance',
      'address_proof', 'income_proof', 'photo'
    ],
    is_active: true
  },
  {
    name: 'NRI Investor - Overseas',
    description: 'Specialized template for Non-Resident Indian investors with international compliance',
    fields: [
      'full_name', 'date_of_birth', 'gender', 'nationality', 'marital_status',
      'email', 'phone', 'address_line_1', 'city', 'state', 'postal_code', 'country',
      'id_type', 'id_number', 'id_issue_date', 'id_expiry_date',
      'occupation', 'employer', 'annual_income', 'source_of_funds',
      'investment_experience', 'risk_tolerance', 'investment_objective',
      'pep_status', 'us_tax_resident', 'fatca_compliance',
      'address_proof', 'income_proof', 'photo'
    ],
    is_active: true
  },
  {
    name: 'Startup Founder - Simplified',
    description: 'Streamlined KYC template for startup founders with essential fields only',
    fields: [
      'full_name', 'date_of_birth', 'email', 'phone',
      'address_line_1', 'city', 'state', 'postal_code', 'country',
      'id_type', 'id_number', 'occupation', 'annual_income',
      'investment_experience', 'risk_tolerance', 'investment_objective',
      'pep_status', 'us_tax_resident', 'fatca_compliance',
      'address_proof', 'photo'
    ],
    is_active: true
  },
  {
    name: 'Senior Citizen - Conservative',
    description: 'Tailored KYC template for senior citizens with conservative investment profiles',
    fields: [
      'full_name', 'date_of_birth', 'gender', 'nationality', 'marital_status',
      'email', 'phone', 'address_line_1', 'city', 'state', 'postal_code', 'country',
      'id_type', 'id_number', 'occupation', 'annual_income', 'source_of_funds',
      'investment_experience', 'risk_tolerance', 'investment_objective',
      'pep_status', 'us_tax_resident', 'fatca_compliance',
      'address_proof', 'income_proof', 'photo'
    ],
    is_active: true
  }
];

export async function seedKYCTemplates(userId: string) {
  try {
    const results = [];
    
    for (const template of dummyTemplates) {
      const { data, error } = await supabase
        .from('kyc_templates')
        .insert({
          user_id: userId,
          ...template
        })
        .select()
        .single();
      
      if (error) {
        results.push({ success: false, name: template.name, error });
      } else {
        results.push({ success: true, name: template.name, data });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    return {
      success: true,
      results,
      summary: {
        total: dummyTemplates.length,
        successful: successCount,
        failed: failureCount
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function clearKYCTemplates(userId: string) {
  try {
    const { data, error } = await supabase
      .from('kyc_templates')
      .delete()
      .eq('user_id', userId)
      .select();
    
    if (error) {
      return { success: false, error };
    }
    
    return { success: true, count: data?.length || 0 };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
