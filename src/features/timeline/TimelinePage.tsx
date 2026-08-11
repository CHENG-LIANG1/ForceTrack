/** Route-level Timeline placeholder fixes the URL and shell contract ahead of Task 6. */
import { CalendarRange } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/EmptyState';

export function TimelinePage() {
  const { t } = useTranslation();

  return (
    <section className="workspace-page" aria-labelledby="timeline-title">
      <div className="page-heading">
        <p className="page-kicker">ForceTrack / Timeline</p>
        <h1 id="timeline-title">{t('timeline.title')}</h1>
        <p>{t('timeline.description')}</p>
      </div>
      <EmptyState
        icon={CalendarRange}
        title={t('timeline.emptyTitle')}
        description={t('timeline.emptyDescription')}
      />
    </section>
  );
}
