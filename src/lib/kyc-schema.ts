// KYC Schema Fields based on the database design
// These fields are locked to the schema and cannot be customized

export interface KYCField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'date' | 'select' | 'file' | 'checkbox';
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  description?: string;
}

export const KYC_SCHEMA_FIELDS: KYCField[] = [
  // Personal Information
  {
    id: 'full_name',
    name: 'full_name',
    label: 'Full Name',
    type: 'text',
    required: true,
    placeholder: 'Enter full name as per official documents',
    description: 'Legal name as it appears on government-issued ID'
  },
  {
    id: 'date_of_birth',
    name: 'date_of_birth',
    label: 'Date of Birth',
    type: 'date',
    required: true,
    description: 'Date of birth for age verification'
  },
  {
    id: 'gender',
    name: 'gender',
    label: 'Gender',
    type: 'select',
    required: true,
    options: ['Male', 'Female', 'Other', 'Prefer not to say'],
    description: 'Gender identification for regulatory compliance'
  },
  {
    id: 'nationality',
    name: 'nationality',
    label: 'Nationality',
    type: 'text',
    required: true,
    placeholder: 'Enter nationality',
    description: 'Country of citizenship'
  },
  {
    id: 'marital_status',
    name: 'marital_status',
    label: 'Marital Status',
    type: 'select',
    required: true,
    options: ['Single', 'Married', 'Divorced', 'Widowed', 'Separated'],
    description: 'Current marital status'
  },

  // Contact Information
  {
    id: 'email',
    name: 'email',
    label: 'Email Address',
    type: 'email',
    required: true,
    placeholder: 'Enter email address',
    description: 'Primary email for communication'
  },
  {
    id: 'phone',
    name: 'phone',
    label: 'Phone Number',
    type: 'phone',
    required: true,
    placeholder: 'Enter phone number',
    description: 'Primary contact number'
  },
  {
    id: 'address_line_1',
    name: 'address_line_1',
    label: 'Address Line 1',
    type: 'text',
    required: true,
    placeholder: 'Street address, P.O. box, company name',
    description: 'Primary address line'
  },
  {
    id: 'address_line_2',
    name: 'address_line_2',
    label: 'Address Line 2',
    type: 'text',
    required: false,
    placeholder: 'Apartment, suite, unit, building, floor, etc.',
    description: 'Secondary address line (optional)'
  },
  {
    id: 'city',
    name: 'city',
    label: 'City',
    type: 'text',
    required: true,
    placeholder: 'Enter city name',
    description: 'City of residence'
  },
  {
    id: 'state',
    name: 'state',
    label: 'State/Province',
    type: 'text',
    required: true,
    placeholder: 'Enter state or province',
    description: 'State or province of residence'
  },
  {
    id: 'postal_code',
    name: 'postal_code',
    label: 'Postal Code',
    type: 'text',
    required: true,
    placeholder: 'Enter postal code',
    description: 'ZIP or postal code'
  },
  {
    id: 'country',
    name: 'country',
    label: 'Country',
    type: 'text',
    required: true,
    placeholder: 'Enter country name',
    description: 'Country of residence'
  },

  // Identity Documents
  {
    id: 'id_type',
    name: 'id_type',
    label: 'ID Document Type',
    type: 'select',
    required: true,
    options: ['Aadhaar Card', 'PAN Card', 'Passport', 'Driving License', 'Voter ID', 'Other'],
    description: 'Type of government-issued identification'
  },
  {
    id: 'id_number',
    name: 'id_number',
    label: 'ID Document Number',
    type: 'text',
    required: true,
    placeholder: 'Enter ID document number',
    description: 'Number from the selected ID document'
  },
  {
    id: 'id_issue_date',
    name: 'id_issue_date',
    label: 'ID Issue Date',
    type: 'date',
    required: true,
    description: 'Date when ID document was issued'
  },
  {
    id: 'id_expiry_date',
    name: 'id_expiry_date',
    label: 'ID Expiry Date',
    type: 'date',
    required: false,
    description: 'Date when ID document expires (if applicable)'
  },

  // Financial Information
  {
    id: 'occupation',
    name: 'occupation',
    label: 'Occupation',
    type: 'text',
    required: true,
    placeholder: 'Enter current occupation',
    description: 'Current job title or profession'
  },
  {
    id: 'employer',
    name: 'employer',
    label: 'Employer/Company',
    type: 'text',
    required: false,
    placeholder: 'Enter employer or company name',
    description: 'Current employer or company name'
  },
  {
    id: 'annual_income',
    name: 'annual_income',
    label: 'Annual Income (₹)',
    type: 'number',
    required: true,
    placeholder: 'Enter annual income',
    validation: {
      min: 0
    },
    description: 'Total annual income from all sources'
  },
  {
    id: 'source_of_funds',
    name: 'source_of_funds',
    label: 'Source of Funds',
    type: 'select',
    required: true,
    options: ['Salary', 'Business', 'Investment Returns', 'Inheritance', 'Other'],
    description: 'Primary source of investment funds'
  },

  // Investment Profile
  {
    id: 'investment_experience',
    name: 'investment_experience',
    label: 'Investment Experience',
    type: 'select',
    required: true,
    options: ['Beginner (0-2 years)', 'Intermediate (3-5 years)', 'Advanced (5+ years)'],
    description: 'Level of experience with financial investments'
  },
  {
    id: 'risk_tolerance',
    name: 'risk_tolerance',
    label: 'Risk Tolerance',
    type: 'select',
    required: true,
    options: ['Conservative', 'Moderate', 'Aggressive'],
    description: 'Investment risk preference'
  },
  {
    id: 'investment_objective',
    name: 'investment_objective',
    label: 'Investment Objective',
    type: 'select',
    required: true,
    options: ['Capital Preservation', 'Income Generation', 'Capital Appreciation', 'Tax Planning', 'Retirement Planning'],
    description: 'Primary goal of investments'
  },

  // Compliance
  {
    id: 'pep_status',
    name: 'pep_status',
    label: 'PEP Status',
    type: 'select',
    required: true,
    options: ['No', 'Yes - Domestic', 'Yes - Foreign', 'Yes - International Organization'],
    description: 'Politically Exposed Person status'
  },
  {
    id: 'us_tax_resident',
    name: 'us_tax_resident',
    label: 'US Tax Resident',
    type: 'checkbox',
    required: true,
    description: 'Whether the person is a US tax resident'
  },
  {
    id: 'fatca_compliance',
    name: 'fatca_compliance',
    label: 'FATCA Compliance',
    type: 'checkbox',
    required: true,
    description: 'Foreign Account Tax Compliance Act compliance'
  },

  // Additional Documents
  {
    id: 'address_proof',
    name: 'address_proof',
    label: 'Address Proof Document',
    type: 'file',
    required: true,
    description: 'Document proving current address (utility bill, bank statement, etc.)'
  },
  {
    id: 'income_proof',
    name: 'income_proof',
    label: 'Income Proof Document',
    type: 'file',
    required: true,
    description: 'Document proving income (salary slip, bank statement, etc.)'
  },
  {
    id: 'photo',
    name: 'photo',
    label: 'Passport Size Photo',
    type: 'file',
    required: true,
    description: 'Recent passport size photograph'
  }
];

// Helper function to get field by ID
export const getKYCFieldById = (id: string): KYCField | undefined => {
  return KYC_SCHEMA_FIELDS.find(field => field.id === id);
};

// Helper function to get required fields
export const getRequiredKYCFields = (): KYCField[] => {
  return KYC_SCHEMA_FIELDS.filter(field => field.required);
};

// Helper function to get optional fields
export const getOptionalKYCFields = (): KYCField[] => {
  return KYC_SCHEMA_FIELDS.filter(field => !field.required);
};
