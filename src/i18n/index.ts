/** Central i18next setup keeps locale resources local and makes initialization deterministic in tests. */
import { createInstance, type i18n } from 'i18next';

import type { SupportedLocale } from '@/domain/member';
import { detectBrowserLocale } from '@/infrastructure/local-preferences-repository';
import enUS from '@/i18n/locales/en-US.json';
import zhCN from '@/i18n/locales/zh-CN.json';

export const resources = {
  'en-US': { translation: enUS },
  'zh-CN': { translation: zhCN },
} as const;

/** Creates an isolated translation instance so application and component tests do not share mutable language state. */
export function createI18n(
  initialLocale: SupportedLocale = detectBrowserLocale(),
): i18n {
  const instance = createInstance();

  void instance.init({
    resources,
    lng: initialLocale,
    fallbackLng: 'en-US',
    supportedLngs: ['zh-CN', 'en-US'],
    interpolation: { escapeValue: false },
    initAsync: false,
    returnNull: false,
  });

  return instance;
}
