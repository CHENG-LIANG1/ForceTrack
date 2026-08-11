import type { SupportedLocale, UserPreferences } from '@/domain/member';
import {
  RepositoryError,
  browserStorage,
  type PreferencesRepository,
  type StorageAdapter,
} from '@/infrastructure/repositories';
import { RECOVERY_STORAGE_KEY } from '@/infrastructure/local-task-repository';
import { userPreferencesSchema } from '@/infrastructure/storage-schema';

export const PREFERENCES_STORAGE_KEY = 'forcetrack:preferences:v1';

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

    if (rawPreferences === null) {
      const preferences = this.validatedDefaults();
      await this.save(preferences);
      return preferences;
    }

    try {
      return userPreferencesSchema.parse(JSON.parse(rawPreferences));
    } catch {
      const preferences = this.validatedDefaults();
      try {
        this.storage.setItem(RECOVERY_STORAGE_KEY, rawPreferences);
      } catch (error) {
        throw new RepositoryError('recovery', error);
      }
      await this.save(preferences);
      return preferences;
    }
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
