/** Theme helpers translate the persisted `system` preference into a concrete DOM theme. */
import type { ResolvedTheme } from '@/app/preferences-context';

/** Resolves the system theme safely in browsers that do not expose matchMedia. */
export function getSystemTheme(): ResolvedTheme {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}
