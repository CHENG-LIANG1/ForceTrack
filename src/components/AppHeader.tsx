import { Check, CircleDotDashed, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import { usePreferences } from '@/app/preferences-context';
import { routes } from '@/app/route-paths';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SUPPORTED_LOCALES, THEME_PREFERENCES } from '@/domain/member';

/** Provides persistent navigation plus compact language and theme controls. */
export function AppHeader() {
  const { t } = useTranslation();
  const { preferences, isReady, setLocale, setTheme } = usePreferences();
  const [settingsOpen, setSettingsOpen] = useState(false);

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
          to={routes.summary}
          className={({ isActive }) =>
            `nav-item${isActive ? ' nav-item-active' : ''}`
          }
        >
          {t('nav.summary')}
        </NavLink>
        <NavLink
          to={routes.backlog}
          className={({ isActive }) =>
            `nav-item${isActive ? ' nav-item-active' : ''}`
          }
        >
          {t('nav.backlog')}
        </NavLink>
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

      <div className="preference-controls">
        <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
          <PopoverTrigger asChild>
            <Button
              className="settings-trigger"
              variant="unstyled"
              type="button"
              aria-label={t('preferences.settings')}
              aria-expanded={settingsOpen}
              aria-controls="preferences-panel"
            >
              <Settings2 size={15} aria-hidden="true" />
              <span>{t('preferences.settings')}</span>
            </Button>
          </PopoverTrigger>

          <PopoverContent
            className="preferences-panel preferences-popover"
            id="preferences-panel"
            aria-label={t('preferences.settings')}
            align="end"
            sideOffset={10}
          >
            <div className="preferences-panel-heading">
              <h2>{t('preferences.settings')}</h2>
              <p>{t('preferences.description')}</p>
            </div>

            <section className="preference-section">
              <div className="preference-section-heading">
                <h3>{t('preferences.language')}</h3>
                <p>{t('preferences.languageDescription')}</p>
              </div>
              <div
                className="language-options"
                role="group"
                aria-label={t('preferences.language')}
              >
                {SUPPORTED_LOCALES.map((locale) => {
                  const selected = preferences.locale === locale;
                  return (
                    <Button
                      variant="unstyled"
                      key={locale}
                      type="button"
                      aria-pressed={selected}
                      disabled={!isReady}
                      onClick={() => setLocale(locale)}
                    >
                      {t(`preferences.locale.${locale}`)}
                      {selected ? <Check size={14} aria-hidden="true" /> : null}
                    </Button>
                  );
                })}
              </div>
            </section>

            <section className="preference-section">
              <div className="preference-section-heading">
                <h3>{t('preferences.theme')}</h3>
                <p>{t('preferences.themeDescription')}</p>
              </div>
              <div
                className="theme-options"
                role="group"
                aria-label={t('preferences.theme')}
              >
                {THEME_PREFERENCES.map((theme) => {
                  const selected = preferences.theme === theme;
                  return (
                    <Button
                      className="theme-option-card"
                      variant="unstyled"
                      key={theme}
                      type="button"
                      aria-label={t(`preferences.themeOption.${theme}`)}
                      aria-pressed={selected}
                      disabled={!isReady}
                      onClick={() => setTheme(theme)}
                    >
                      <span
                        className={`theme-preview theme-preview-${theme}`}
                        aria-hidden="true"
                      >
                        <span className="theme-preview-sidebar" />
                        <span className="theme-preview-header" />
                        <span className="theme-preview-surface theme-preview-surface-large" />
                        <span className="theme-preview-surface theme-preview-surface-small" />
                        <span className="theme-preview-accent" />
                      </span>
                      <span className="theme-option-label">
                        <span>{t(`preferences.themeOption.${theme}`)}</span>
                        {selected ? (
                          <Check size={14} aria-hidden="true" />
                        ) : null}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </section>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
