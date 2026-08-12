import { X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTasks } from '@/app/task-context';
import { Button } from '@/components/ui/button';

/** Surfaces repository recovery and write failures consistently across every route. */
export function FeedbackBanner() {
  const { t } = useTranslation();
  const { loadWasRecovered, persistenceFailed } = useTasks();
  const [recoveryDismissed, setRecoveryDismissed] = useState(false);
  const showRecovery = loadWasRecovered && !recoveryDismissed;

  if (!showRecovery && !persistenceFailed) return null;

  return (
    <div className="feedback-stack" aria-label={t('task.feedback.region')}>
      {showRecovery ? (
        <div className="feedback-banner" role="status">
          <span>{t('task.feedback.recovered')}</span>
          <Button
            className="feedback-dismiss"
            variant="unstyled"
            type="button"
            aria-label={t('task.feedback.dismiss')}
            onClick={() => setRecoveryDismissed(true)}
          >
            <X size={16} aria-hidden="true" />
          </Button>
        </div>
      ) : null}
      {persistenceFailed ? (
        <div className="feedback-banner feedback-banner-danger" role="alert">
          <span>{t('task.feedback.saveFailed')}</span>
        </div>
      ) : null}
    </div>
  );
}
