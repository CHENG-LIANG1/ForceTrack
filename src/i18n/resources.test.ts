/** Translation-resource parity prevents a locale from leaking raw keys into the interface. */
import enUS from '@/i18n/locales/en-US.json';
import zhCN from '@/i18n/locales/zh-CN.json';

/** Flattens nested translation objects into stable leaf-key paths for exact comparison. */
function leafKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];

  return Object.entries(value).flatMap(([key, nestedValue]) =>
    leafKeys(nestedValue, prefix ? `${prefix}.${key}` : key),
  );
}

describe('translation resources', () => {
  it('keeps English and Chinese leaf keys identical', () => {
    expect(leafKeys(enUS).sort()).toEqual(leafKeys(zhCN).sort());
  });
});
