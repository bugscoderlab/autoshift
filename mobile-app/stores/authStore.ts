import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
  role: string;
  doctor_id?: number; // For admin users who are also doctors
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    orgId: string;
  };
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Demo mode function
  setDemoUser: (user: User) => void;
  
  // Real auth functions (commented out for demo)
  // login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  
  // Helper functions
  isAdmin: () => boolean;
  canEditRoster: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      // Demo mode: Set user without API call
      setDemoUser: (user: User) => {
        set({
          user,
          accessToken: 'demo-token',
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
        });
      },

      // Check if user is admin
      isAdmin: () => {
        const { user } = get();
        return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
      },

      // Check if user can edit roster (only admins)
      canEditRoster: () => {
        const { user } = get();
        return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
      },
    }),
    {
      name: 'autoshift-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
