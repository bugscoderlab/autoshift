import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  role: string;
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
  refreshToken: string | null;
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
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      // Demo mode: Set user without API call
      setDemoUser: (user: User) => {
        set({
          user,
          accessToken: 'demo-token',
          refreshToken: 'demo-refresh-token',
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
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
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
