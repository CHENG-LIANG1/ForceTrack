import { useTranslation } from 'react-i18next';

import { AppRoutes } from '@/app/routes';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { AppHeader } from '@/components/AppHeader';
import { FeedbackBanner } from '@/components/FeedbackBanner';

/** Renders the persistent shell while route elements own page-specific content. */
export function App() {
  const { t } = useTranslation();

  return (
    <AppErrorBoundary
      title={t('errorBoundary.title')}
      description={t('errorBoundary.description')}
      reloadLabel={t('errorBoundary.reload')}
    >
      <div className="app-shell">
        <AppHeader />
        <main className="page-shell">
          <FeedbackBanner />
          <AppRoutes />
        </main>
      </div>
    </AppErrorBoundary>
  );
}
