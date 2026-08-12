/** Shared preference context contract keeps hooks separate from the Fast Refresh component module. */
import { createContext, useContext } from 'react';

import type {
  SupportedLocale,
  ThemePreference,
  UserPreferences,
} from '@/domain/member';

export type ResolvedTheme = Exclude<ThemePreference, 'system'>;

export interface PreferencesContextValue {
  preferences: UserPreferences;
  resolvedTheme: ResolvedTheme;
  isReady: boolean;
  setLocale: (locale: SupportedLocale) => void;
  setTheme: (theme: ThemePreference) => void;
  rememberProject: (
    projectId: string,
    validProjectIds: readonly string[],
  ) => void;
}

export const PreferencesContext = createContext<PreferencesContextValue | null>(
  null,
);

/** Exposes preference actions only inside the application provider tree. */
export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return context;
}
