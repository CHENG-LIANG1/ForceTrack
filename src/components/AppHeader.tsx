import { CircleDotDashed } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import { usePreferences } from '@/app/preferences-context';
import { routes } from '@/app/route-paths';
import { SUPPORTED_LOCALES, THEME_PREFERENCES } from '@/domain/member';

/** Provides persistent navigation plus compact language and theme controls. */
export function AppHeader() {
  const { t } = useTranslation();
  const { preferences, isReady, setLocale, setTheme } = usePreferences();

  return (
    <header className="site-header">
      <NavLink
        className="brand"
        to={routes.board}
        aria-label={t('a11y.forceTrackHome')}
      >
        <span className="brand-mark" aria-hidden="true">
          <CircleDotDashed size={17} strokeWidth={2.2} />
        </span>
        <span>ForceTrack</span>
      </NavLink>

      <nav className="header-nav" aria-label={t('nav.primary')}>
        <NavLink
          to={routes.board}
          className={({ isActive }) =>
            `nav-item${isActive ? ' nav-item-active' : ''}`
          }
        >
          {t('nav.board')}
        </NavLink>
        <NavLink
          to={routes.timeline}
          className={({ isActive }) =>
            `nav-item${isActive ? ' nav-item-active' : ''}`
          }
        >
          {t('nav.timeline')}
        </NavLink>
      </nav>

      <div
        className="preference-controls"
        aria-label={t('a11y.preferenceControls')}
      >
        <label>
          <span className="visually-hidden">{t('preferences.language')}</span>
          <select
            aria-label={t('preferences.language')}
            value={preferences.locale}
            disabled={!isReady}
            onChange={(event) =>
              setLocale(
                event.target.value as (typeof SUPPORTED_LOCALES)[number],
              )
            }
          >
            {SUPPORTED_LOCALES.map((locale) => (
              <option key={locale} value={locale}>
                {t(`preferences.locale.${locale}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="visually-hidden">{t('preferences.theme')}</span>
          <select
            aria-label={t('preferences.theme')}
            value={preferences.theme}
            disabled={!isReady}
            onChange={(event) =>
              setTheme(event.target.value as (typeof THEME_PREFERENCES)[number])
            }
          >
            {THEME_PREFERENCES.map((theme) => (
              <option key={theme} value={theme}>
                {t(`preferences.themeOption.${theme}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}
