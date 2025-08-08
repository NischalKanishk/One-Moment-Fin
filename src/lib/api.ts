import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
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

  updateProfile: async (data: { full_name?: string; phone?: string; settings?: any }) => {
    const response = await api.put('/api/auth/profile', data);
    return response.data;
  },
};

// Leads API
export const leadsAPI = {
  create: async (data: { full_name: string; email?: string; phone?: string; age?: number; source_link: string; user_id: string }) => {
    const response = await api.post('/api/leads/create', data);
    return response.data;
  },

  getAll: async () => {
    const response = await api.get('/api/leads');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/api/leads/${id}`);
    return response.data;
  },

  updateStatus: async (id: string, status: string, notes?: string) => {
    const response = await api.patch(`/api/leads/${id}/status`, { status, notes });
    return response.data;
  },

  update: async (id: string, data: { full_name?: string; email?: string; phone?: string; age?: number; notes?: string }) => {
    const response = await api.put(`/api/leads/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/api/leads/${id}`);
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/api/leads/stats');
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
