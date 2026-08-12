import {
  LocalPreferencesRepository,
  LEGACY_PREFERENCES_STORAGE_KEY,
  PREFERENCES_RECOVERY_STORAGE_KEY,
  PREFERENCES_STORAGE_KEY,
  createDefaultPreferences,
  detectBrowserLocale,
} from '@/infrastructure/local-preferences-repository';
import type { StorageAdapter } from '@/infrastructure/repositories';
import type { UserPreferences } from '@/domain/member';

class MemoryStorage implements StorageAdapter {
  readonly values = new Map<string, string>();
  readError: unknown;
  writeError: unknown;
  writeErrorKey: string | null = null;

  getItem(key: string): string | null {
    if (this.readError) throw this.readError;
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (
      this.writeError &&
      (!this.writeErrorKey || this.writeErrorKey === key)
    ) {
      throw this.writeError;
    }
    this.values.set(key, value);
  }
}

describe('LocalPreferencesRepository', () => {
  it('maps Chinese browser locales and falls back to English', () => {
    expect(detectBrowserLocale('zh-Hans-CN')).toBe('zh-CN');
    expect(detectBrowserLocale('en-GB')).toBe('en-US');
    expect(createDefaultPreferences('fr-FR')).toEqual({
      locale: 'en-US',
      theme: 'system',
      lastProjectId: null,
      recentProjectIds: [],
    });
  });

  it('persists injected defaults on first load', async () => {
    const storage = new MemoryStorage();
    const defaults: UserPreferences = {
      locale: 'en-US',
      theme: 'dark',
      lastProjectId: null,
      recentProjectIds: [],
    };

    await expect(
      new LocalPreferencesRepository(storage, defaults).load(),
    ).resolves.toEqual(defaults);
    expect(JSON.parse(storage.values.get(PREFERENCES_STORAGE_KEY)!)).toEqual(
      defaults,
    );
  });

  it('loads and saves valid preferences', async () => {
    const storage = new MemoryStorage();
    const repository = new LocalPreferencesRepository(storage);
    await repository.save({
      locale: 'zh-CN',
      theme: 'light',
      lastProjectId: 'project-1',
      recentProjectIds: ['project-1'],
    });

    await expect(repository.load()).resolves.toEqual({
      locale: 'zh-CN',
      theme: 'light',
      lastProjectId: 'project-1',
      recentProjectIds: ['project-1'],
    });
  });

  it('migrates V1 preferences and preserves explicit theme and locale', async () => {
    const storage = new MemoryStorage();
    storage.values.set(
      LEGACY_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ locale: 'zh-CN', theme: 'dark' }),
    );

    await expect(
      new LocalPreferencesRepository(storage).load(),
    ).resolves.toEqual({
      locale: 'zh-CN',
      theme: 'dark',
      lastProjectId: null,
      recentProjectIds: [],
    });
    expect(JSON.parse(storage.values.get(PREFERENCES_STORAGE_KEY)!)).toEqual({
      locale: 'zh-CN',
      theme: 'dark',
      lastProjectId: null,
      recentProjectIds: [],
    });
    expect(storage.values.has(PREFERENCES_RECOVERY_STORAGE_KEY)).toBe(false);
  });

  it('backs up invalid data and restores defaults', async () => {
    const storage = new MemoryStorage();
    const invalidRaw = JSON.stringify({ locale: 'fr', theme: 'neon' });
    storage.values.set(PREFERENCES_STORAGE_KEY, invalidRaw);
    const defaults: UserPreferences = {
      locale: 'zh-CN',
      theme: 'dark',
      lastProjectId: null,
      recentProjectIds: [],
    };

    await expect(
      new LocalPreferencesRepository(storage, defaults).load(),
    ).resolves.toEqual(defaults);
    expect(storage.values.get(PREFERENCES_RECOVERY_STORAGE_KEY)).toBe(
      invalidRaw,
    );
  });

  it('reports write failures', async () => {
    const storage = new MemoryStorage();
    storage.writeError = new Error('unavailable');

    await expect(
      new LocalPreferencesRepository(storage).save({
        locale: 'en-US',
        theme: 'dark',
        lastProjectId: null,
        recentProjectIds: [],
      }),
    ).rejects.toMatchObject({ operation: 'write' });
  });

  it('recovers invalid legacy preferences and reports read, recovery, and validation failures', async () => {
    const legacyStorage = new MemoryStorage();
    legacyStorage.values.set(LEGACY_PREFERENCES_STORAGE_KEY, '{bad');
    await expect(
      new LocalPreferencesRepository(legacyStorage).load(),
    ).resolves.toEqual(createDefaultPreferences('en-US'));

    const readStorage = new MemoryStorage();
    readStorage.readError = new Error('blocked');
    await expect(
      new LocalPreferencesRepository(readStorage).load(),
    ).rejects.toMatchObject({ operation: 'read' });

    const recoveryStorage = new MemoryStorage();
    recoveryStorage.values.set(PREFERENCES_STORAGE_KEY, '{bad');
    recoveryStorage.writeError = new Error('blocked');
    recoveryStorage.writeErrorKey = PREFERENCES_RECOVERY_STORAGE_KEY;
    await expect(
      new LocalPreferencesRepository(recoveryStorage).load(),
    ).rejects.toMatchObject({ operation: 'recovery' });

    await expect(
      new LocalPreferencesRepository(new MemoryStorage()).save({
        locale: 'en-US',
        theme: 'invalid',
        lastProjectId: null,
        recentProjectIds: [],
      } as never),
    ).rejects.toMatchObject({ operation: 'validation' });

    await expect(
      new LocalPreferencesRepository(new MemoryStorage(), {} as never).load(),
    ).rejects.toMatchObject({ operation: 'validation' });
  });
});
