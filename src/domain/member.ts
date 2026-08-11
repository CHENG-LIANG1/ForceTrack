export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const;
export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export interface Member {
  id: string;
  name: string;
  avatar?: string;
}

export interface UserPreferences {
  locale: SupportedLocale;
  theme: ThemePreference;
}
