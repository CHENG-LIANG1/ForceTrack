import {
  Check,
  ChevronDown,
  CircleHelp,
  Laptop,
  Moon,
  Sun,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import { usePreferences } from '@/app/preferences-context';
import { useOnboarding } from '@/app/onboarding-context';
import { useProjects } from '@/app/project-context';
import { projectRoutes } from '@/app/route-paths';
import { Button } from '@/components/ui/button';
import { MenuItem } from '@/components/ui/menu-item';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { THEME_PREFERENCES, SUPPORTED_LOCALES } from '@/domain/member';
import { ProjectSwitcher } from '@/features/projects/ProjectSwitcher';

const themeIcons = { system: Laptop, light: Sun, dark: Moon } as const;

/** Maintains geometric navigation centering while separating project and user concerns. */
export function AppHeader() {
  const { t } = useTranslation();
  const { currentProject } = useProjects();
  const { startOnboarding } = useOnboarding();
  const { preferences, isReady, setLocale, setTheme } = usePreferences();
  const [helpOpen, setHelpOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const projectId = currentProject?.id;

  return (
    <header className="site-header">
      <div className="header-project">
        <ProjectSwitcher />
      </div>
      <nav
        className="header-nav"
        aria-label={t('nav.primary')}
        data-onboarding="primary-navigation"
      >
        {projectId
          ? (['summary', 'backlog', 'board', 'timeline'] as const).map(
              (page) => (
                <NavLink
                  key={page}
                  to={projectRoutes[page](projectId)}
                  data-onboarding={`nav-${page}`}
                  className={({ isActive }) =>
                    `nav-item${isActive ? ' nav-item-active' : ''}`
                  }
                >
                  {t(`nav.${page}`)}
                </NavLink>
              ),
            )
          : null}
      </nav>
      <div className="header-user-actions" data-onboarding="help-entry">
        <Popover open={helpOpen} onOpenChange={setHelpOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="unstyled"
              className="header-icon-button help-trigger"
              aria-label={t('help.title')}
            >
              <CircleHelp size={18} aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="compact-popover help-popover"
            align="end"
            sideOffset={8}
          >
            <h2>{t('help.title')}</h2>
            <p>{t('help.description')}</p>
            <dl>
              <div>
                <dt>{t('help.newTask')}</dt>
                <dd>
                  <kbd>N</kbd>
                </dd>
              </div>
              <div>
                <dt>{t('help.search')}</dt>
                <dd>
                  <kbd>/</kbd>
                </dd>
              </div>
            </dl>
            <Button
              variant="outline"
              size="dialog"
              className="help-onboarding-button"
              onClick={() => {
                setHelpOpen(false);
                startOnboarding();
              }}
            >
              {t('onboarding.replay')}
            </Button>
            <small>ForceTrack v0.1 · Local workspace</small>
          </PopoverContent>
        </Popover>

        <Popover open={userOpen} onOpenChange={setUserOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="unstyled"
              className="user-menu-trigger"
              aria-label={t('preferences.userMenu')}
            >
              <span className="user-avatar" aria-hidden="true">
                LU
              </span>
              <ChevronDown
                className="user-menu-chevron"
                size={14}
                aria-hidden="true"
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="user-menu-popover"
            align="end"
            sideOffset={8}
          >
            <div className="local-identity">
              <strong>{t('preferences.localUser')}</strong>
              <small>{t('preferences.localMode')}</small>
            </div>
            <section className="user-menu-section">
              <h2>{t('preferences.theme')}</h2>
              <div className="menu-option-list">
                {THEME_PREFERENCES.map((theme) => {
                  const Icon = themeIcons[theme];
                  return (
                    <MenuItem
                      key={theme}
                      leading={<Icon size={15} />}
                      trailing={
                        preferences.theme === theme ? <Check size={14} /> : null
                      }
                      aria-pressed={preferences.theme === theme}
                      disabled={!isReady}
                      onClick={() => setTheme(theme)}
                    >
                      {t(`preferences.themeOption.${theme}`)}
                    </MenuItem>
                  );
                })}
              </div>
            </section>
            <section className="user-menu-section">
              <h2>{t('preferences.language')}</h2>
              <div className="menu-option-list">
                {SUPPORTED_LOCALES.map((locale) => (
                  <MenuItem
                    key={locale}
                    trailing={
                      preferences.locale === locale ? <Check size={14} /> : null
                    }
                    aria-pressed={preferences.locale === locale}
                    disabled={!isReady}
                    onClick={() => setLocale(locale)}
                  >
                    {t(`preferences.locale.${locale}`)}
                  </MenuItem>
                ))}
              </div>
            </section>
            <MenuItem
              className="mobile-help-entry"
              leading={<CircleHelp size={15} />}
              onClick={() => {
                setUserOpen(false);
                startOnboarding();
              }}
            >
              {t('onboarding.replay')}
            </MenuItem>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
