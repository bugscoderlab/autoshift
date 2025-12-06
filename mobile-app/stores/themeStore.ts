import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  colors: {
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    primary: string;
    accent: string;
    border: string;
    tabBar: string;
  };
}

const darkColors = {
  background: '#0f0c29',
  card: 'rgba(255, 255, 255, 0.1)',
  text: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  primary: '#a78bfa',
  accent: '#10b981',
  border: 'rgba(255, 255, 255, 0.1)',
  tabBar: '#1e1b4b',
};

const lightColors = {
  background: '#f8fafc',
  card: '#ffffff',
  text: '#1e293b',
  textSecondary: '#808080',
  primary: '#6366f1',
  accent: '#10b981',
  border: '#e2e8f0',
  tabBar: '#ffffff',
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'dark',
      colors: darkColors,
      
      toggleTheme: () => {
        const currentMode = get().mode;
        const newMode = currentMode === 'dark' ? 'light' : 'dark';
        set({
          mode: newMode,
          colors: newMode === 'dark' ? darkColors : lightColors,
        });
      },
      
      setTheme: (mode: ThemeMode) => {
        set({
          mode,
          colors: mode === 'dark' ? darkColors : lightColors,
        });
      },
    }),
    {
      name: 'autoshift-theme',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ mode: state.mode }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.colors = state.mode === 'dark' ? darkColors : lightColors;
        }
      },
    }
  )
);



