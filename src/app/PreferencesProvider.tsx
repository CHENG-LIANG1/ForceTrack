/** Owns global locale/theme state and keeps browser preferences synchronized with the repository. */
import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { i18n } from 'i18next';

import {
  PreferencesContext,
  type PreferencesContextValue,
  type ResolvedTheme,
} from '@/app/preferences-context';
import { getSystemTheme } from '@/app/theme';
import type { UserPreferences } from '@/domain/member';
import {
  LocalPreferencesRepository,
  createDefaultPreferences,
} from '@/infrastructure/local-preferences-repository';
import type { PreferencesRepository } from '@/infrastructure/repositories';

interface PreferencesProviderProps extends PropsWithChildren {
  i18nInstance: i18n;
  repository?: PreferencesRepository;
}

/** Applies effective preferences to the root element before consumers render theme-dependent UI. */
function applyDocumentPreferences(
  preferences: UserPreferences,
  resolvedTheme: ResolvedTheme,
): void {
  document.documentElement.lang = preferences.locale;
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;
}

export function PreferencesProvider({
  children,
  i18nInstance,
  repository: providedRepository,
}: PreferencesProviderProps) {
  const repository = useMemo(
    () => providedRepository ?? new LocalPreferencesRepository(),
    [providedRepository],
  );
  const initialPreferences = useMemo(() => createDefaultPreferences(), []);
  const [preferences, setPreferences] =
    useState<UserPreferences>(initialPreferences);
  const preferencesRef = useRef(preferences);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    const mountedTheme = document.documentElement.dataset.theme;
    return mountedTheme === 'dark' || mountedTheme === 'light'
      ? mountedTheme
      : getSystemTheme();
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    /** Hydrates explicit user choices once and prevents a late load from mutating an unmounted tree. */
    async function hydratePreferences(): Promise<void> {
      try {
        const loadedPreferences = await repository.load();
        if (!isCurrent) return;

        preferencesRef.current = loadedPreferences;
        setPreferences(loadedPreferences);
      } catch {
        // Browser storage may be unavailable; in-memory defaults keep the shell usable.
      } finally {
        if (isCurrent) setIsReady(true);
      }
    }

    void hydratePreferences();
    return () => {
      isCurrent = false;
    };
  }, [repository]);

  useEffect(() => {
    void i18nInstance.changeLanguage(preferences.locale);

    const mediaQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null;

    /** Recomputes only the effective theme; the persisted preference remains `system`. */
    const synchronizeTheme = () => {
      const nextResolvedTheme =
        preferences.theme === 'system'
          ? mediaQuery?.matches
            ? 'dark'
            : 'light'
          : preferences.theme;

      setResolvedTheme(nextResolvedTheme);
      applyDocumentPreferences(preferences, nextResolvedTheme);
    };

    synchronizeTheme();
    if (preferences.theme === 'system') {
      mediaQuery?.addEventListener('change', synchronizeTheme);
    }

    return () => mediaQuery?.removeEventListener('change', synchronizeTheme);
  }, [i18nInstance, preferences]);

  /** Updates UI state immediately, then writes the complete preference record through its repository. */
  const updatePreferences = useCallback(
    (patch: Partial<UserPreferences>) => {
      const nextPreferences = { ...preferencesRef.current, ...patch };
      preferencesRef.current = nextPreferences;
      setPreferences(nextPreferences);
      void repository.save(nextPreferences).catch(() => undefined);
    },
    [repository],
  );

  const value = useMemo<PreferencesContextValue>(
    () => ({
      preferences,
      resolvedTheme,
      isReady,
      setLocale: (locale) => updatePreferences({ locale }),
      setTheme: (theme) => updatePreferences({ theme }),
    }),
    [isReady, preferences, resolvedTheme, updatePreferences],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}
