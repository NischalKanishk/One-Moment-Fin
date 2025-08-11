import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// Initialize Ajv with draft-2019-09 schema and all formats
const ajv = new Ajv({
  allErrors: true,
  strict: false,
  verbose: true
});

// Add common formats (email, uri, etc.)
addFormats(ajv);

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FormSchema {
  title?: string;
  type: 'object';
  properties: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
}

/**
 * Validate form data against a JSON schema
 */
export function validateFormData(schema: FormSchema, data: any): ValidationResult {
  try {
    const validate = ajv.compile(schema);
    const isValid = validate(data);
    
    if (isValid) {
      return { isValid: true, errors: [] };
    }
    
    const errors = validate.errors?.map(error => {
      const field = error.instancePath || error.schemaPath;
      const message = error.message || 'Invalid value';
      return `${field}: ${message}`;
    }) || [];
    
    return { isValid: false, errors };
  } catch (error) {
    return { 
      isValid: false, 
      errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`] 
    };
  }
}

/**
 * Get a compiled validator function for a schema
 */
export function getValidator(schema: FormSchema) {
  return ajv.compile(schema);
}

/**
 * Check if a schema is valid
 */
export function isSchemaValid(schema: any): boolean {
  try {
    ajv.compile(schema);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract field names from a schema
 */
export function getSchemaFields(schema: FormSchema): string[] {
  return Object.keys(schema.properties || {});
}

/**
 * Get required fields from a schema
 */
export function getRequiredFields(schema: FormSchema): string[] {
  return schema.required || [];
}
