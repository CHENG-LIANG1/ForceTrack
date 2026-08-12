import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { useLocation } from 'react-router';

import { AppRoutes } from '@/app/routes';
import { OnboardingProvider } from '@/app/OnboardingProvider';
import { useProjects } from '@/app/project-context';
import { pageFromPath } from '@/app/route-paths';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { AppHeader } from '@/components/AppHeader';
import { FeedbackBanner } from '@/components/FeedbackBanner';

/** Renders the persistent shell while route elements own page-specific content. */
export function App() {
  const { t } = useTranslation();
  const location = useLocation();
  const { currentProject } = useProjects();
  const currentProjectName = currentProject?.name;

  useEffect(() => {
    if (!currentProjectName) {
      document.title = `${t('project.empty.title')} · ForceTrack`;
      return;
    }
    const page = pageFromPath(location.pathname);
    const pageLabel = page === 'members' ? t('member.title') : t(`nav.${page}`);
    document.title = `${pageLabel} · ${currentProjectName} · ForceTrack`;
  }, [currentProjectName, location.pathname, t]);

  return (
    <AppErrorBoundary
      title={t('errorBoundary.title')}
      description={t('errorBoundary.description')}
      reloadLabel={t('errorBoundary.reload')}
    >
      <OnboardingProvider>
        <div className="app-shell">
          <a className="skip-link" href="#main-content">
            {t('a11y.skipToContent')}
          </a>
          <AppHeader />
          <main className="page-shell" id="main-content" tabIndex={-1}>
            <FeedbackBanner />
            <AppRoutes />
          </main>
        </div>
      </OnboardingProvider>
    </AppErrorBoundary>
  );
}
