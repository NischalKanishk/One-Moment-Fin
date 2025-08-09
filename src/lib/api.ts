import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to create authenticated API instance
export const createAuthenticatedApi = (token: string) => {
  const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  return api;
};

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // passthrough
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  loginWithToken: async (token: string) => {
    const response = await api.post('/api/auth/login', { token });
    return response.data;
  },

  signupWithToken: async (token: string, data?: { full_name?: string; phone?: string }) => {
    const response = await api.post('/api/auth/signup', { token, ...(data || {}) });
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await api.post('/api/auth/login', { email, password });
    return response.data;
  },

  signup: async (data: { email: string; password: string; full_name: string; phone?: string }) => {
    const response = await api.post('/api/auth/signup', data);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/api/auth/logout');
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },

  getProfileWithToken: async (token: string) => {
    console.log('🔍 API: getProfileWithToken called with token length:', token.length);
    
    // Validate token format
    if (!token || token.split('.').length !== 3) {
      throw new Error('Invalid JWT token format');
    }
    
    const authApi = createAuthenticatedApi(token);
    
    try {
      const response = await authApi.get('/api/auth/me');
      console.log('✅ API: Profile fetch successful');
      return response.data;
    } catch (error) {
      console.error('❌ API: Profile fetch failed:', error);
      
      // Provide more specific error information
      if (error.response) {
        const { status, data: errorData } = error.response;
        
        if (status === 401) {
          throw new Error('Authentication failed. Please try signing out and signing back in.');
        } else if (status === 500) {
          throw new Error('Server error. Please try again later.');
        } else {
          throw new Error(`Request failed with status ${status}`);
        }
      } else if (error.request) {
        throw new Error('Network error. Please check your connection and try again.');
      } else {
        throw new Error('Request failed. Please try again.');
      }
    }
  },

  updateProfile: async (data: { full_name?: string; phone?: string; settings?: any }) => {
    // This function needs to be called with a token, so we'll use the base api
    // The frontend should pass the token in the Authorization header
    const response = await api.put('/api/auth/profile', data);
    return response.data;
  },

  updateProfileWithToken: async (token: string, data: { full_name?: string; phone?: string; settings?: any }) => {
    console.log('🔍 API: updateProfileWithToken called with:', { tokenLength: token.length, data });
    
    // Validate token format
    if (!token || token.split('.').length !== 3) {
      throw new Error('Invalid JWT token format');
    }
    
    // Decode and validate JWT payload (browser-compatible)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.sub) {
        console.warn('⚠️ API: JWT token missing "sub" field - this may cause authentication issues');
      }
    } catch (decodeError) {
      console.warn('⚠️ API: Could not decode JWT payload:', decodeError);
    }
    
    const authApi = createAuthenticatedApi(token);
    
    try {
      const response = await authApi.put('/api/auth/profile', data);
      console.log('✅ API: Profile update successful');
      return response.data;
    } catch (error) {
      console.error('❌ API: Profile update failed:', error);
      
      // Provide more specific error information
      if (error.response) {
        const { status, data: errorData } = error.response;
        
        if (status === 401) {
          throw new Error('Authentication failed. Please try signing out and signing back in.');
        } else if (status === 400) {
          const errorMessage = errorData?.error || 'Invalid data provided';
          throw new Error(errorMessage);
        } else if (status === 500) {
          throw new Error('Server error. Please try again later.');
        } else {
          throw new Error(`Request failed with status ${status}`);
        }
      } else if (error.request) {
        throw new Error('Network error. Please check your connection and try again.');
      } else {
        throw new Error('Request failed. Please try again.');
      }
    }
  },
};

// Leads API
export const leadsAPI = {
  create: async (token: string, data: { full_name: string; email?: string; phone?: string; age?: number; source_link: string; user_id: string }) => {
    const authApi = createAuthenticatedApi(token);
    const response = await authApi.post('/api/leads/create', data);
    return response.data;
  },

  createLead: async (token: string, data: { full_name: string; email?: string; phone?: string; age?: number; source_link: string; notes?: string; status?: string; kyc_status?: string }) => {
    const authApi = createAuthenticatedApi(token);
    const response = await authApi.post('/api/leads', data);
    return response.data;
  },

  getAll: async (token: string) => {
    const authApi = createAuthenticatedApi(token);
    const response = await authApi.get('/api/leads');
    return response.data;
  },

  getById: async (token: string, id: string) => {
    const authApi = createAuthenticatedApi(token);
    const response = await authApi.get(`/api/leads/${id}`);
    return response.data;
  },

  updateStatus: async (token: string, id: string, status: string, notes?: string) => {
    const authApi = createAuthenticatedApi(token);
    const response = await authApi.patch(`/api/leads/${id}/status`, { status, notes });
    return response.data;
  },

  update: async (token: string, id: string, data: { full_name?: string; email?: string; phone?: string; age?: number; notes?: string }) => {
    const authApi = createAuthenticatedApi(token);
    const response = await authApi.put(`/api/leads/${id}`, data);
    return response.data;
  },

  delete: async (token: string, id: string) => {
    const authApi = createAuthenticatedApi(token);
    const response = await authApi.delete(`/api/leads/${id}`);
    return response.data;
  },

  getStats: async (token: string) => {
    const authApi = createAuthenticatedApi(token);
    const response = await authApi.get('/api/leads/stats');
    return response.data;
  },
};

// Assessments API
export const assessmentsAPI = {
  submit: async (data: { lead_id: string; assessment_id: string; responses: any[] }) => {
    const response = await api.post('/api/assessments/submit', data);
    return response.data;
  },

  getByLeadId: async (leadId: string) => {
    const response = await api.get(`/api/assessments/${leadId}`);
    return response.data;
  },

  getForms: async () => {
    const response = await api.get('/api/assessments/forms');
    return response.data;
  },

  createForm: async (data: { name: string; description?: string; questions: any[]; is_active?: boolean }) => {
    const response = await api.post('/api/assessments/forms', data);
    return response.data;
  },
};

// AI API
export const aiAPI = {
  assessRisk: async (answers: any[], leadAge?: number) => {
    const response = await api.post('/api/ai/risk-score', { answers, lead_age: leadAge });
    return response.data;
  },

  suggestProducts: async (riskCategory: string, leadAge?: number) => {
    const response = await api.post('/api/ai/suggest-products', { risk_category: riskCategory, lead_age: leadAge });
    return response.data;
  },
};

// Products API
export const productsAPI = {
  getAll: async () => {
    const response = await api.get('/api/products');
    return response.data;
  },

  create: async (data: { title: string; risk_category: string; description?: string; amc_name?: string; product_type?: string; visibility?: string }) => {
    const response = await api.post('/api/products', data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/api/products/${id}`);
    return response.data;
  },

  getRecommended: async (leadId: string) => {
    const response = await api.get(`/api/products/recommended/${leadId}`);
    return response.data;
  },
};

// Meetings API
export const meetingsAPI = {
  getAll: async () => {
    const response = await api.get('/api/meetings');
    return response.data;
  },

  create: async (data: { lead_id: string; title: string; start_time: string; end_time?: string; description?: string; meeting_link?: string }) => {
    const response = await api.post('/api/meetings/manual', data);
    return response.data;
  },

  updateStatus: async (id: string, status: string) => {
    const response = await api.patch(`/api/meetings/${id}/status`, { status });
    return response.data;
  },
};

// KYC API
export const kycAPI = {
  getByLeadId: async (leadId: string) => {
    const response = await api.get(`/api/kyc/${leadId}`);
    return response.data;
  },

  upload: async (data: { lead_id: string; kyc_method: string; form_data?: any; kyc_file_url?: string }) => {
    const response = await api.post('/api/kyc/upload', data);
    return response.data;
  },

  updateStatus: async (leadId: string, status: string, verifiedBy?: string) => {
    const response = await api.patch(`/api/kyc/${leadId}/status`, { status, verified_by: verifiedBy });
    return response.data;
  },
};

// Subscriptions API
export const subscriptionsAPI = {
  getPlans: async () => {
    const response = await api.get('/api/subscription/plans');
    return response.data;
  },

  getCurrent: async () => {
    const response = await api.get('/api/subscription/current');
    return response.data;
  },

  start: async (planId: string) => {
    const response = await api.post('/api/subscription/start', { plan_id: planId });
    return response.data;
  },
};

export default api;
