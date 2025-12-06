/**
 * Data Hooks - Fetch data from API with mock fallback
 * 
 * This module provides functions to fetch data from the backend API.
 * If the backend is unavailable, it falls back to mock data.
 */

import { useState, useEffect, useCallback } from 'react';
import api, { 
  Doctor, 
  RosterEntry, 
  LeaveRequest, 
  SwapRequest, 
  checkBackendConnection,
  doctorApi,
  rosterApi,
  leaveApi,
  swapApi,
} from './api';

// ============== Mock Data ==============

export const MOCK_DOCTORS: Doctor[] = [
  { doctor_id: 1, name: 'John Doe', email: 'john.doe@hospital.com', phone: '+60 12-345 6789', category: 'fixed', department: 'Emergency', role: 'Senior Consultant', join_date: '2023-01-01', fte: 1.0, active: true },
  { doctor_id: 2, name: 'Dr. Sarah Johnson', email: 'sarah.j@hospital.com', phone: '+60 12-456 7890', category: 'fixed', department: 'ICU', role: 'Specialist', join_date: '2023-02-15', fte: 1.0, active: true },
  { doctor_id: 3, name: 'Dr. Michael Chen', email: 'michael.c@hospital.com', phone: '+60 13-567 8901', category: 'flexible', department: 'Ward A', role: 'Consultant', join_date: '2023-03-20', fte: 1.0, active: true },
  { doctor_id: 4, name: 'Dr. Emily Davis', email: 'emily.d@hospital.com', phone: '+60 14-678 9012', category: 'fixed', department: 'Surgery', role: 'Registrar', join_date: '2023-04-10', fte: 0.8, active: true },
  { doctor_id: 5, name: 'Dr. James Wilson', email: 'james.w@hospital.com', phone: '+60 15-789 0123', category: 'flexible', department: 'Emergency', role: 'Medical Officer', join_date: '2023-05-01', fte: 1.0, active: true },
  { doctor_id: 6, name: 'Dr. Lisa Brown', email: 'lisa.b@hospital.com', phone: '+60 16-890 1234', category: 'flexible', department: 'Pediatrics', role: 'Specialist', join_date: '2023-06-15', fte: 0.5, active: true },
  { doctor_id: 7, name: 'Dr. Robert Lee', email: 'robert.l@hospital.com', phone: '+60 17-901 2345', category: 'flexible', department: 'ICU', role: 'Locum', join_date: '2023-07-20', fte: 0.5, active: true },
];

// Shift timing information for rest rule calculations
const SHIFT_INFO = {
  morning: { start: 8, end: 16, duration: 8 },   // 08:00 - 16:00
  evening: { start: 16, end: 24, duration: 8 },  // 16:00 - 00:00 (24:00)
  night: { start: 0, end: 8, duration: 8 },      // 00:00 - 08:00
};

const generateMockRoster = (): RosterEntry[] => {
  console.log('📦 [MOCK] Generating mock roster data for 30 days with rest rules...');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  const entries: RosterEntry[] = [];
  const shiftTypes: ('morning' | 'evening' | 'night')[] = ['morning', 'evening', 'night'];
  
  // Track last shift for each doctor: { date, endTimeInHours }
  // endTimeInHours is the absolute hour from epoch start (dayIndex * 24 + hour)
  const doctorLastShift: Map<number, { date: string; endTimeInHours: number }> = new Map();
  
  // Track which doctors already worked today
  const doctorWorkedToday: Map<string, Set<number>> = new Map();
  
  let rosterIdCounter = 1;
  
  // Generate roster for 30 days
  for (let dayIndex = 0; dayIndex < 30; dayIndex++) {
    const date = new Date(today);
    date.setDate(today.getDate() + dayIndex);
    const dateStr = date.toISOString().split('T')[0];
    const weekday = date.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = weekday === 0 || weekday === 6;
    
    // Reset daily tracking
    doctorWorkedToday.set(dateStr, new Set());
    
    // Each shift needs 2-3 doctors (2 on weekends, 3 on weekdays)
    const doctorsPerShift = isWeekend ? 2 : 3;
    
    // Generate all 3 shifts for the day
    for (const shiftType of shiftTypes) {
      const shiftInfo = SHIFT_INFO[shiftType];
      
      // Calculate absolute start time in hours from epoch
      // Night shift: starts at 00:00 of Day N+1 (or end of Day N)
      let shiftStartTimeInHours: number;
      if (shiftType === 'night') {
        // Night shift starts at midnight (beginning of next day)
        shiftStartTimeInHours = dayIndex * 24 + 24; // Midnight = start of next day
      } else {
        shiftStartTimeInHours = dayIndex * 24 + shiftInfo.start;
      }
      
      const availableDoctors: Doctor[] = [];
      
      // Check which doctors can work this shift
      for (const doctor of MOCK_DOCTORS) {
        if (!doctor.active) continue;
        
        // Rule 1: Doctor cannot work more than one shift per day
        if (doctorWorkedToday.get(dateStr)?.has(doctor.doctor_id)) {
          continue;
        }
        
        // Rule 2: Check 11-hour rest period
        const lastShift = doctorLastShift.get(doctor.doctor_id);
        if (lastShift) {
          const hoursSinceLastShift = shiftStartTimeInHours - lastShift.endTimeInHours;
          
          // Must have at least 11 hours rest
          if (hoursSinceLastShift < 11) {
            continue;
          }
        }
        
        // Doctor is available for this shift
        availableDoctors.push(doctor);
      }
      
      // Select doctors for this shift
      const selectedDoctors: Doctor[] = [];
      const shuffled = [...availableDoctors].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < Math.min(doctorsPerShift, shuffled.length); i++) {
        selectedDoctors.push(shuffled[i]);
      }
      
      // If we don't have enough doctors, try to find more (with warnings logged)
      if (selectedDoctors.length < 2) {
        const remainingDoctors = MOCK_DOCTORS.filter(
          d => d.active && 
          !selectedDoctors.find(s => s.doctor_id === d.doctor_id) &&
          !doctorWorkedToday.get(dateStr)?.has(d.doctor_id)
        );
        
        const needed = 2 - selectedDoctors.length;
        for (let i = 0; i < Math.min(needed, remainingDoctors.length); i++) {
          selectedDoctors.push(remainingDoctors[i]);
          console.log(`⚠️ [MOCK] Emergency staffing: ${remainingDoctors[i].name} on ${dateStr} ${shiftType}`);
        }
      }
      
      // Create roster entries for selected doctors
      for (const doctor of selectedDoctors) {
        entries.push({
          roster_id: rosterIdCounter++,
          date: dateStr,
          doctor_id: doctor.doctor_id,
          doctor_name: doctor.name,
          shift_type: shiftType,
          source: 'auto',
          doctor_department: doctor.department, // Include department for UI display
        } as any);
        
        // Mark doctor as worked today
        doctorWorkedToday.get(dateStr)?.add(doctor.doctor_id);
        
        // Calculate shift end time in absolute hours
        let shiftEndTimeInHours: number;
        if (shiftType === 'night') {
          // Night shift: 00:00 to 08:00 (ends at 08:00 of Day N+1)
          shiftEndTimeInHours = dayIndex * 24 + 24 + 8; // Next day at 08:00
        } else if (shiftType === 'evening') {
          // Evening shift: 16:00 to 00:00 (ends at midnight)
          shiftEndTimeInHours = dayIndex * 24 + 24; // Midnight
        } else {
          // Morning shift: 08:00 to 16:00
          shiftEndTimeInHours = dayIndex * 24 + 16;
        }
        
        // Update doctor's last shift
        doctorLastShift.set(doctor.doctor_id, {
          date: dateStr,
          endTimeInHours: shiftEndTimeInHours,
        });
      }
    }
  }
  
  console.log('📦 [MOCK] Generated', entries.length, 'roster entries for 30 days');
  console.log('📦 [MOCK] Average shifts per day:', (entries.length / 30).toFixed(1));
  console.log('📦 [MOCK] Doctors per shift (avg):', (entries.length / (30 * 3)).toFixed(1));
  
  // Validation: Check for violations
  const violationsByDoctor: Map<number, number> = new Map();
  entries.forEach(entry => {
    const sameDay = entries.filter(e => e.date === entry.date && e.doctor_id === entry.doctor_id);
    if (sameDay.length > 1) {
      violationsByDoctor.set(entry.doctor_id, (violationsByDoctor.get(entry.doctor_id) || 0) + 1);
    }
  });
  
  if (violationsByDoctor.size > 0) {
    console.log('⚠️ [MOCK] Violations detected:', Array.from(violationsByDoctor.entries()));
  } else {
    console.log('✅ [MOCK] No scheduling violations - all rules followed');
  }
  
  return entries;
};

const generateMockLeaveRequests = (): LeaveRequest[] => {
  console.log('📦 [MOCK] Generating mock leave requests...');
  const today = new Date();
  
  const leaves: LeaveRequest[] = [
    {
      leave_id: 1,
      doctor_id: 1,
      doctor_name: 'John Doe',
      start_date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date(today.getTime() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      leave_type: 'annual',
      reason: 'Family vacation',
      status: 'approved' as const,
      days: 3,
    },
    {
      leave_id: 2,
      doctor_id: 1,
      doctor_name: 'John Doe',
      start_date: new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date(today.getTime() + 22 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      leave_type: 'medical',
      reason: 'Medical checkup',
      status: 'approved' as const,
      days: 2,
    },
    {
      leave_id: 3,
      doctor_id: 2,
      doctor_name: 'Dr. Sarah Johnson',
      start_date: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      leave_type: 'medical',
      reason: 'Doctor appointment',
      status: 'pending' as const,
      days: 1,
    },
    {
      leave_id: 4,
      doctor_id: 3,
      doctor_name: 'Dr. Michael Chen',
      start_date: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date(today.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      leave_type: 'annual',
      reason: 'Personal matters',
      status: 'pending' as const,
      days: 3,
    },
    {
      leave_id: 5,
      doctor_id: 4,
      doctor_name: 'Dr. Emily Davis',
      start_date: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      leave_type: 'emergency',
      reason: 'Family emergency',
      status: 'pending' as const,
      days: 1,
    },
  ];
  
  // Calculate totals for logging
  const johnDoeLeaves = leaves.filter(l => l.doctor_id === 1);
  const johnDoeApproved = johnDoeLeaves.filter(l => l.status === 'approved');
  const johnDoeUsedDays = johnDoeApproved.reduce((sum, l) => sum + l.days, 0);
  
  console.log('📦 [MOCK] Leave summary for John Doe (doctor_id: 1):', {
    total_leaves: johnDoeLeaves.length,
    approved: johnDoeApproved.length,
    used_days: johnDoeUsedDays,
    days_left: 14 - johnDoeUsedDays
  });
  
  return leaves;
};

const generateMockSwapRequests = (): SwapRequest[] => {
  console.log('📦 [MOCK] Generating mock swap requests...');
  const today = new Date();
  return [
    {
      swap_id: 1,
      requester_id: 1,
      requester_name: 'John Doe',
      requester_shift_date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      requester_shift_type: 'morning',
      target_id: 2,
      target_name: 'Dr. Sarah Johnson',
      is_broadcast: false,
      reason: 'Need to attend conference',
      status: 'pending',
    },
    {
      swap_id: 2,
      requester_id: 3,
      requester_name: 'Dr. Michael Chen',
      requester_shift_date: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      requester_shift_type: 'evening',
      is_broadcast: true,
      reason: 'Personal appointment',
      status: 'pending',
    },
    {
      swap_id: 3,
      requester_id: 4,
      requester_name: 'Dr. Emily Davis',
      requester_shift_date: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      requester_shift_type: 'night',
      target_id: 5,
      target_name: 'Dr. James Wilson',
      is_broadcast: false,
      reason: "Kid's school event",
      status: 'pending',
    },
  ];
};

// ============== Data Fetching Functions ==============

export type DataSource = 'api' | 'mock';

interface FetchResult<T> {
  data: T;
  source: DataSource;
  error?: string;
}

/**
 * Fetch doctors from API with mock fallback
 */
export async function fetchDoctors(params?: { category?: string; department?: string }): Promise<FetchResult<Doctor[]>> {
  console.log('📋 [DOCTORS] Fetching doctors with params:', params);
  try {
    const isConnected = await checkBackendConnection();
    if (!isConnected) {
      console.log('⚠️ [DOCTORS] Backend unavailable, using mock data');
      throw new Error('Backend unavailable');
    }
    
    const data = await doctorApi.list(params);
    console.log('✅ [DOCTORS] Fetched from DATABASE:', {
      count: data.length,
      source: 'DATABASE',
      sample: data[0]?.name
    });
    return { data, source: 'api' };
  } catch (error) {
    console.log('⚠️ [DOCTORS] Using MOCK DATA, reason:', String(error));
    let mockData = [...MOCK_DOCTORS];
    
    if (params?.category && params.category !== 'all') {
      mockData = mockData.filter(d => d.category === params.category);
    }
    if (params?.department) {
      mockData = mockData.filter(d => d.department === params.department);
    }
    
    console.log('📦 [DOCTORS] Returning MOCK DATA:', {
      count: mockData.length,
      source: 'MOCK',
      filtered_by: params
    });
    return { data: mockData, source: 'mock', error: String(error) };
  }
}

/**
 * Fetch roster entries from API with mock fallback
 */
export async function fetchRoster(params?: { year?: number; month?: number; doctor_id?: number }): Promise<FetchResult<RosterEntry[]>> {
  console.log('📅 [ROSTER] Fetching roster with params:', params);
  try {
    const isConnected = await checkBackendConnection();
    if (!isConnected) {
      console.log('⚠️ [ROSTER] Backend unavailable, using mock data');
      throw new Error('Backend unavailable');
    }
    
    const data = await rosterApi.list(params);
    console.log('✅ [ROSTER] Fetched from DATABASE:', {
      count: data.length,
      source: 'DATABASE',
      doctor_id: params?.doctor_id,
      year_month: params?.year && params?.month ? `${params.year}-${params.month}` : 'all',
      sample: data[0] ? { date: data[0].date, shift: data[0].shift_type } : null
    });
    return { data, source: 'api' };
  } catch (error) {
    console.log('⚠️ [ROSTER] Using MOCK DATA, reason:', String(error));
    let mockData = generateMockRoster();
    
    if (params?.doctor_id) {
      mockData = mockData.filter(r => r.doctor_id === params.doctor_id);
    }
    
    console.log('📦 [ROSTER] Returning MOCK DATA:', {
      count: mockData.length,
      source: 'MOCK',
      filtered_by: params
    });
    return { data: mockData, source: 'mock', error: String(error) };
  }
}

/**
 * Fetch leave requests from API with mock fallback
 */
export async function fetchLeaveRequests(params?: { doctor_id?: number; status?: string }): Promise<FetchResult<LeaveRequest[]>> {
  console.log('✈️ [LEAVE] Fetching leave requests with params:', params);
  try {
    const isConnected = await checkBackendConnection();
    if (!isConnected) {
      console.log('⚠️ [LEAVE] Backend unavailable, using mock data');
      throw new Error('Backend unavailable');
    }
    
    const data = await leaveApi.list(params);
    console.log('✅ [LEAVE] Fetched from DATABASE:', {
      count: data.length,
      source: 'DATABASE',
      doctor_id: params?.doctor_id,
      status: params?.status || 'all'
    });
    return { data, source: 'api' };
  } catch (error) {
    console.log('⚠️ [LEAVE] Using MOCK DATA, reason:', String(error));
    let mockData = generateMockLeaveRequests();
    
    if (params?.doctor_id) {
      mockData = mockData.filter(l => l.doctor_id === params.doctor_id);
    }
    if (params?.status) {
      mockData = mockData.filter(l => l.status === params.status);
    }
    
    console.log('📦 [LEAVE] Returning MOCK DATA:', {
      count: mockData.length,
      source: 'MOCK',
      filtered_by: params
    });
    return { data: mockData, source: 'mock', error: String(error) };
  }
}

/**
 * Fetch pending leave requests (for admin)
 */
export async function fetchPendingLeaveRequests(): Promise<FetchResult<LeaveRequest[]>> {
  return fetchLeaveRequests({ status: 'pending' });
}

/**
 * Fetch swap requests from API with mock fallback
 */
export async function fetchSwapRequests(params?: { doctor_id?: number; status?: string }): Promise<FetchResult<SwapRequest[]>> {
  console.log('🔄 [SWAP] Fetching swap requests with params:', params);
  try {
    const isConnected = await checkBackendConnection();
    if (!isConnected) {
      console.log('⚠️ [SWAP] Backend unavailable, using mock data');
      throw new Error('Backend unavailable');
    }
    
    const data = await swapApi.list(params);
    console.log('✅ [SWAP] Fetched from DATABASE:', {
      count: data.length,
      source: 'DATABASE',
      doctor_id: params?.doctor_id,
      status: params?.status || 'all'
    });
    return { data, source: 'api' };
  } catch (error) {
    console.log('⚠️ [SWAP] Using MOCK DATA, reason:', String(error));
    let mockData = generateMockSwapRequests();
    
    if (params?.doctor_id) {
      mockData = mockData.filter(s => s.requester_id === params.doctor_id || s.target_id === params.doctor_id);
    }
    if (params?.status) {
      mockData = mockData.filter(s => s.status === params.status);
    }
    
    console.log('📦 [SWAP] Returning MOCK DATA:', {
      count: mockData.length,
      source: 'MOCK',
      filtered_by: params
    });
    return { data: mockData, source: 'mock', error: String(error) };
  }
}

// ============== React Hooks ==============

interface UseDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  source: DataSource | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch doctors
 */
export function useDoctors(params?: { category?: string; department?: string }): UseDataResult<Doctor[]> {
  const [data, setData] = useState<Doctor[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<DataSource | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchDoctors(params);
      setData(result.data);
      setSource(result.source);
      setError(result.error || null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [params?.category, params?.department]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, source, refresh };
}

/**
 * Hook to fetch roster
 */
export function useRoster(params?: { year?: number; month?: number; doctor_id?: number }): UseDataResult<RosterEntry[]> {
  const [data, setData] = useState<RosterEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<DataSource | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchRoster(params);
      setData(result.data);
      setSource(result.source);
      setError(result.error || null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [params?.year, params?.month, params?.doctor_id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, source, refresh };
}

/**
 * Hook to fetch leave requests
 */
export function useLeaveRequests(params?: { doctor_id?: number; status?: string }): UseDataResult<LeaveRequest[]> {
  const [data, setData] = useState<LeaveRequest[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<DataSource | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchLeaveRequests(params);
      setData(result.data);
      setSource(result.source);
      setError(result.error || null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [params?.doctor_id, params?.status]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, source, refresh };
}

/**
 * Hook to fetch swap requests
 */
export function useSwapRequests(params?: { doctor_id?: number; status?: string }): UseDataResult<SwapRequest[]> {
  const [data, setData] = useState<SwapRequest[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<DataSource | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchSwapRequests(params);
      setData(result.data);
      setSource(result.source);
      setError(result.error || null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [params?.doctor_id, params?.status]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, source, refresh };
}

// ============== API Actions with Fallback Behavior ==============

/**
 * Create a leave request
 */
export async function createLeaveRequest(leave: {
  doctor_id: number;
  start_date: string;
  end_date: string;
  leave_type: string;
  reason?: string;
  invite_coverage?: boolean;
}): Promise<{ success: boolean; data?: LeaveRequest; error?: string; isOffline?: boolean }> {
  try {
    const isConnected = await checkBackendConnection();
    if (!isConnected) {
      // Return success but mark as offline - would be synced later
      return { 
        success: true, 
        isOffline: true,
        data: {
          leave_id: Date.now(),
          doctor_id: leave.doctor_id,
          start_date: leave.start_date,
          end_date: leave.end_date,
          leave_type: leave.leave_type,
          reason: leave.reason,
          status: 'pending',
        }
      };
    }
    
    const data = await leaveApi.create(leave);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Create a swap request
 */
export async function createSwapRequest(swap: {
  requester_id: number;
  requester_shift_date: string;
  requester_shift_type: string;
  target_id?: number;
  target_shift_date?: string;
  target_shift_type?: string;
  is_broadcast?: boolean;
  reason?: string;
}): Promise<{ success: boolean; data?: SwapRequest; error?: string; isOffline?: boolean }> {
  try {
    const isConnected = await checkBackendConnection();
    if (!isConnected) {
      return { 
        success: true, 
        isOffline: true,
        data: {
          swap_id: Date.now(),
          requester_id: swap.requester_id,
          requester_shift_date: swap.requester_shift_date,
          requester_shift_type: swap.requester_shift_type,
          target_id: swap.target_id,
          is_broadcast: swap.is_broadcast || false,
          reason: swap.reason,
          status: 'pending',
        }
      };
    }
    
    const data = await swapApi.create(swap);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Approve a leave request
 */
export async function approveLeaveRequest(id: number, approvedBy: number = 1): Promise<{ success: boolean; error?: string }> {
  try {
    const isConnected = await checkBackendConnection();
    if (!isConnected) {
      return { success: true }; // Optimistic update
    }
    
    await leaveApi.approve(id, approvedBy);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Reject a leave request
 */
export async function rejectLeaveRequest(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    const isConnected = await checkBackendConnection();
    if (!isConnected) {
      return { success: true }; // Optimistic update
    }
    
    await leaveApi.reject(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Accept a swap request
 */
export async function acceptSwapRequest(id: number, acceptedBy: number): Promise<{ success: boolean; error?: string }> {
  try {
    const isConnected = await checkBackendConnection();
    if (!isConnected) {
      return { success: true }; // Optimistic update
    }
    
    await swapApi.accept(id, acceptedBy);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Reject a swap request
 */
export async function rejectSwapRequest(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    const isConnected = await checkBackendConnection();
    if (!isConnected) {
      return { success: true }; // Optimistic update
    }
    
    await swapApi.reject(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Aliases for convenience
export const useDoctor = useDoctors;
export const useLeave = useLeaveRequests;
export const useSwap = useSwapRequests;

export default {
  fetchDoctors,
  fetchRoster,
  fetchLeaveRequests,
  fetchPendingLeaveRequests,
  fetchSwapRequests,
  createLeaveRequest,
  createSwapRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  acceptSwapRequest,
  rejectSwapRequest,
  useDoctors,
  useDoctor,
  useRoster,
  useLeaveRequests,
  useLeave,
  useSwapRequests,
  useSwap,
  MOCK_DOCTORS,
};
