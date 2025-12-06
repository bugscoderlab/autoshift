/**
 * API Service for connecting to FastAPI backend
 * 
 * Features:
 * - Auto-detects backend IP address (no manual configuration needed!)
 * - Caches successful IP for faster reconnection
 * - Supports manual override for advanced users
 * - Works across different devices and networks
 */
import { getCurrentApiUrl } from './apiConfig';

// API Base URL - will be set asynchronously
let API_BASE_URL = 'http://localhost:8000'; // Fallback default

// Initialize API URL on module load
(async () => {
  try {
    API_BASE_URL = await getCurrentApiUrl();
    console.log(`🌐 [API] Initialized with base URL: ${API_BASE_URL}`);
  } catch (error) {
    console.error('❌ [API] Failed to initialize API URL:', error);
  }
})();

// Connection state
let isBackendAvailable = true;
let lastConnectionCheck = 0;
const CONNECTION_CHECK_INTERVAL = 30000; // 30 seconds

// Check if backend is available
export async function checkBackendConnection(): Promise<boolean> {
  const now = Date.now();
  if (now - lastConnectionCheck < CONNECTION_CHECK_INTERVAL) {
    return isBackendAvailable;
  }
  
  try {
    // Refresh API URL in case it changed
    API_BASE_URL = await getCurrentApiUrl();
    
    const response = await fetch(`${API_BASE_URL}/health`, { 
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    isBackendAvailable = response.ok;
    lastConnectionCheck = now;
    
    if (response.ok) {
      console.log(`✅ [API] Backend available at ${API_BASE_URL}`);
    }
  } catch (error) {
    console.log(`⚠️ [API] Backend unavailable at ${API_BASE_URL}:`, String(error));
    isBackendAvailable = false;
    lastConnectionCheck = now;
  }
  
  return isBackendAvailable;
}

// Types
export interface Doctor {
  doctor_id: number;
  name: string;
  email: string;
  phone?: string;
  category: 'fixed' | 'flexible' | 'houseman';
  department: string;
  role: string;
  join_date: string;
  leave_date?: string;
  fte: number;
  active: boolean;
  weekly_fixed_pattern_id?: number;
}

export interface RosterEntry {
  roster_id: number;
  date: string;
  doctor_id: number;
  doctor_name?: string;
  shift_type: string;
  source: string;
  start_time?: string;
  end_time?: string;
}

export interface LeaveRequest {
  leave_id: number;
  doctor_id: number;
  doctor_name?: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  days?: number;
  created_at?: string;
}

export interface SwapRequest {
  swap_id: number;
  requester_id: number;
  requester_name?: string;
  requester_shift_date: string;
  requester_shift_type: string;
  target_id?: number;
  target_name?: string;
  is_broadcast: boolean;
  reason?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  created_at?: string;
}

export interface LeaveBalance {
  annual: { total: number; used: number; remaining: number };
  medical: { total: number; used: number; remaining: number };
  emergency: { total: number; used: number; remaining: number };
  other: { total: number; used: number; remaining: number };
}

// API Helper
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

// Doctor APIs
export const doctorApi = {
  list: (params?: { category?: string; active?: boolean; department?: string }) => {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.active !== undefined) query.append('active', String(params.active));
    if (params?.department) query.append('department', params.department);
    const queryStr = query.toString();
    return fetchApi<Doctor[]>(`/doctors${queryStr ? `?${queryStr}` : ''}`);
  },

  get: (id: number) => fetchApi<Doctor>(`/doctors/${id}`),

  create: (doctor: Partial<Doctor>) =>
    fetchApi<Doctor>('/doctors', {
      method: 'POST',
      body: JSON.stringify(doctor),
    }),

  update: (id: number, doctor: Partial<Doctor>) =>
    fetchApi<Doctor>(`/doctors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(doctor),
    }),

  delete: (id: number) =>
    fetchApi<{ message: string }>(`/doctors/${id}`, { method: 'DELETE' }),

  stats: () => fetchApi<{
    total: number;
    active: number;
    inactive: number;
    fixed: number;
    flexible: number;
    houseman: number;
    by_department: Record<string, number>;
  }>('/doctors/stats/summary'),
};

// Roster APIs
export const rosterApi = {
  list: (params?: { year?: number; month?: number; doctor_id?: number }) => {
    const query = new URLSearchParams();
    if (params?.year) query.append('year', String(params.year));
    if (params?.month) query.append('month', String(params.month));
    if (params?.doctor_id) query.append('doctor_id', String(params.doctor_id));
    const queryStr = query.toString();
    return fetchApi<RosterEntry[]>(`/roster${queryStr ? `?${queryStr}` : ''}`);
  },

  calendar: (year: number, month: number) =>
    fetchApi<{
      year: number;
      month: number;
      calendar: Record<string, RosterEntry[]>;
      total_shifts: number;
    }>(`/roster/calendar?year=${year}&month=${month}`),

  generate: (params: { year: number; month: number; use_ai?: boolean }) =>
    fetchApi<{
      year: number;
      month: number;
      roster: RosterEntry[];
      compliance_report: {
        is_compliant: boolean;
        violations: any[];
        balance_summary: any;
      };
      suggested_fixes: any[];
    }>('/roster/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  repair: (params: { year: number; month: number; use_ai?: boolean }) =>
    fetchApi('/roster/repair', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  save: (entries: Partial<RosterEntry>[]) =>
    fetchApi<{ message: string; count: number }>('/roster/save', {
      method: 'POST',
      body: JSON.stringify(entries),
    }),

  checkCompliance: (year: number, month: number) =>
    fetchApi(`/roster/check-compliance?year=${year}&month=${month}`, {
      method: 'POST',
    }),
};

// Leave APIs
export const leaveApi = {
  list: (params?: { doctor_id?: number; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.doctor_id) query.append('doctor_id', String(params.doctor_id));
    if (params?.status) query.append('status', params.status);
    const queryStr = query.toString();
    return fetchApi<LeaveRequest[]>(`/leave/list${queryStr ? `?${queryStr}` : ''}`);
  },

  pending: () => fetchApi<LeaveRequest[]>('/leave/list?status=pending'),

  balance: (doctorId: number) =>
    fetchApi<{ balances: LeaveBalance }>(`/leave/balance/${doctorId}`),

  create: (leave: {
    doctor_id: number;
    start_date: string;
    end_date: string;
    leave_type: string;
    reason?: string;
    invite_coverage?: boolean;
  }) =>
    fetchApi<LeaveRequest>('/leave/create', {
      method: 'POST',
      body: JSON.stringify(leave),
    }),

  approve: (id: number, approved_by: number = 1) =>
    fetchApi<LeaveRequest>(`/leave/${id}/approve?approved_by=${approved_by}`, {
      method: 'PATCH',
    }),

  reject: (id: number) =>
    fetchApi<LeaveRequest>(`/leave/${id}/reject`, {
      method: 'PATCH',
    }),

  cancel: (id: number) =>
    fetchApi<{ message: string }>(`/leave/${id}`, { method: 'DELETE' }),
};

// Swap APIs
export const swapApi = {
  list: (params?: { doctor_id?: number; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.doctor_id) query.append('doctor_id', String(params.doctor_id));
    if (params?.status) query.append('status', params.status);
    const queryStr = query.toString();
    return fetchApi<SwapRequest[]>(`/swap/${queryStr ? `?${queryStr}` : ''}`);
  },

  pending: (doctorId: number) =>
    fetchApi<SwapRequest[]>(`/swap/?doctor_id=${doctorId}&status=pending`),

  availableDoctors: (shiftDate: string) =>
    fetchApi<Doctor[]>(`/swap/available-doctors/${shiftDate}`),

  create: (swap: {
    requester_id: number;
    requester_shift_date: string;
    requester_shift_type: string;
    target_id?: number;
    target_shift_date?: string;
    target_shift_type?: string;
    is_broadcast?: boolean;
    reason?: string;
  }) =>
    fetchApi<SwapRequest>('/swap/request', {
      method: 'POST',
      body: JSON.stringify(swap),
    }),

  accept: (id: number, acceptedBy: number) =>
    fetchApi<SwapRequest>(`/swap/${id}/accept?accepted_by=${acceptedBy}`, {
      method: 'PATCH',
    }),

  reject: (id: number) =>
    fetchApi<SwapRequest>(`/swap/${id}/reject`, { method: 'PATCH' }),

  cancel: (id: number) =>
    fetchApi<{ message: string }>(`/swap/${id}`, { method: 'DELETE' }),
};

// AI APIs
export const aiApi = {
  explain: (violations: any[], doctorId?: number) =>
    fetchApi<{ violations: any[] }>('/ai/explain', {
      method: 'POST',
      body: JSON.stringify({ violations, doctor_id: doctorId }),
    }),

  chat: (message: string, doctorId?: number, context?: any) =>
    fetchApi<{ message: string; response: string }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, doctor_id: doctorId, context }),
    }),

  optimize: (year: number, month: number) =>
    fetchApi('/ai/optimize', {
      method: 'POST',
      body: JSON.stringify({ year, month }),
    }),

  quickAnswer: (question: string) =>
    fetchApi<{ question: string; answer: string }>(`/ai/quick-answer?question=${encodeURIComponent(question)}`),

  validateShift: (doctorId: number, shiftDate: string, shiftType: string) =>
    fetchApi(
      `/ai/validate-shift?doctor_id=${doctorId}&shift_date=${shiftDate}&shift_type=${shiftType}`,
      { method: 'POST' }
    ),

  generateRoster: (year: number, month: number, rules: any) =>
    fetchApi<{ year: number; month: number; roster: RosterEntry[]; compliance_report: any; balance_summary: any }>('/ai/generate-roster', {
      method: 'POST',
      body: JSON.stringify({ year, month, rules }),
    }),
};

// Health check
export const healthCheck = () =>
  fetchApi<{ status: string; database: string; ai_enabled: boolean }>('/health');

// Default export
export default {
  doctors: doctorApi,
  roster: rosterApi,
  leave: leaveApi,
  swap: swapApi,
  ai: aiApi,
  healthCheck,
};
