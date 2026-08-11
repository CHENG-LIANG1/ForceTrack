import {
  LocalPreferencesRepository,
  PREFERENCES_STORAGE_KEY,
  createDefaultPreferences,
  detectBrowserLocale,
} from '@/infrastructure/local-preferences-repository';
import { RECOVERY_STORAGE_KEY } from '@/infrastructure/local-task-repository';
import type { StorageAdapter } from '@/infrastructure/repositories';

class MemoryStorage implements StorageAdapter {
  readonly values = new Map<string, string>();
  writeError: unknown;

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.writeError) throw this.writeError;
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
    });
  });

  it('persists injected defaults on first load', async () => {
    const storage = new MemoryStorage();
    const defaults = { locale: 'en-US', theme: 'dark' } as const;

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
    await repository.save({ locale: 'zh-CN', theme: 'light' });

    await expect(repository.load()).resolves.toEqual({
      locale: 'zh-CN',
      theme: 'light',
    });
  });

  it('backs up invalid data and restores defaults', async () => {
    const storage = new MemoryStorage();
    const invalidRaw = JSON.stringify({ locale: 'fr', theme: 'neon' });
    storage.values.set(PREFERENCES_STORAGE_KEY, invalidRaw);
    const defaults = { locale: 'zh-CN', theme: 'system' } as const;

    await expect(
      new LocalPreferencesRepository(storage, defaults).load(),
    ).resolves.toEqual({ locale: 'zh-CN', theme: 'system' });
    expect(storage.values.get(RECOVERY_STORAGE_KEY)).toBe(invalidRaw);
  });

  it('reports write failures', async () => {
    const storage = new MemoryStorage();
    storage.writeError = new Error('unavailable');

    await expect(
      new LocalPreferencesRepository(storage).save({
        locale: 'en-US',
        theme: 'system',
      }),
    ).rejects.toMatchObject({ operation: 'write' });
  });
});
