import type { SupportedLocale, UserPreferences } from '@/domain/member';
import {
  RepositoryError,
  browserStorage,
  type PreferencesRepository,
  type StorageAdapter,
} from '@/infrastructure/repositories';
import {
  userPreferencesSchema,
  userPreferencesV1Schema,
} from '@/infrastructure/storage-schema';

export const PREFERENCES_STORAGE_KEY = 'forcetrack:preferences:v2';
export const LEGACY_PREFERENCES_STORAGE_KEY = 'forcetrack:preferences:v1';
export const PREFERENCES_RECOVERY_STORAGE_KEY =
  'forcetrack:recovery:preferences:last-invalid';

/** Maps the browser language to the two locales packaged with the MVP. */
export function detectBrowserLocale(language?: string): SupportedLocale {
  const browserLanguage =
    language ??
    (typeof navigator === 'undefined' ? undefined : navigator.language);

  return browserLanguage?.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US';
}

/** Builds first-run preferences without allowing later browser changes to override saved choices. */
export function createDefaultPreferences(language?: string): UserPreferences {
  return {
    locale: detectBrowserLocale(language),
    theme: 'system',
    lastProjectId: null,
    recentProjectIds: [],
  };
}

export class LocalPreferencesRepository implements PreferencesRepository {
  constructor(
    private readonly storage: StorageAdapter = browserStorage(),
    private readonly defaults: UserPreferences = createDefaultPreferences(),
  ) {}

  /** Loads a validated preference record, creating or recovering it when needed. */
  async load(): Promise<UserPreferences> {
    let rawPreferences: string | null;
    try {
      rawPreferences = this.storage.getItem(PREFERENCES_STORAGE_KEY);
    } catch (error) {
      throw new RepositoryError('read', error);
    }

    if (rawPreferences === null) return this.loadLegacyOrCreate();

    try {
      return userPreferencesSchema.parse(JSON.parse(rawPreferences));
    } catch {
      const preferences = this.validatedDefaults();
      try {
        this.storage.setItem(PREFERENCES_RECOVERY_STORAGE_KEY, rawPreferences);
      } catch (error) {
        throw new RepositoryError('recovery', error);
      }
      await this.save(preferences);
      return preferences;
    }
  }

  /** Migrates V1 exactly once and never lets a legacy preference override valid V2 data. */
  private async loadLegacyOrCreate(): Promise<UserPreferences> {
    let rawLegacy: string | null;
    try {
      rawLegacy = this.storage.getItem(LEGACY_PREFERENCES_STORAGE_KEY);
    } catch (error) {
      throw new RepositoryError('read', error);
    }
    const preferences = rawLegacy
      ? (() => {
          try {
            const legacy = userPreferencesV1Schema.parse(JSON.parse(rawLegacy));
            return {
              ...legacy,
              lastProjectId: null,
              recentProjectIds: [],
            } satisfies UserPreferences;
          } catch {
            return this.validatedDefaults();
          }
        })()
      : this.validatedDefaults();
    await this.save(preferences);
    return preferences;
  }

  async save(preferences: UserPreferences): Promise<void> {
    let validatedPreferences: UserPreferences;
    try {
      validatedPreferences = userPreferencesSchema.parse(preferences);
    } catch (error) {
      throw new RepositoryError('validation', error);
    }

    try {
      this.storage.setItem(
        PREFERENCES_STORAGE_KEY,
        JSON.stringify(validatedPreferences),
      );
    } catch (error) {
      throw new RepositoryError('write', error);
    }
  }

  private validatedDefaults(): UserPreferences {
    try {
      return userPreferencesSchema.parse(this.defaults);
    } catch (error) {
      throw new RepositoryError('validation', error);
    }
  }
}
