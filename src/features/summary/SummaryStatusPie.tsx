/** Renders the filtered status distribution without introducing a chart dependency. */
import { useTranslation } from 'react-i18next';

import { TASK_STATUSES, type TaskStatus } from '@/domain/task';
import { SUMMARY_STATUS_COLOR_TOKENS } from '@/features/summary/summary-constants';
import type { CountAndPercent } from '@/features/summary/summary-selectors';

interface SummaryStatusPieProps {
  status: Record<TaskStatus, CountAndPercent>;
}

function statusGradient(status: Record<TaskStatus, CountAndPercent>): string {
  let start = 0;
  const segments = TASK_STATUSES.map((statusKey) => {
    const end = start + status[statusKey].percent;
    const segment = `${SUMMARY_STATUS_COLOR_TOKENS[statusKey]} ${start}% ${end}%`;
    start = end;
    return segment;
  });
  return `conic-gradient(${segments.join(', ')})`;
}

export function SummaryStatusPie({ status }: SummaryStatusPieProps) {
  const { t } = useTranslation();
  const total = TASK_STATUSES.reduce(
    (sum, statusKey) => sum + status[statusKey].count,
    0,
  );
  const accessibleSummary = TASK_STATUSES.map((statusKey) =>
    t('summary.statusCount', {
      status: t(`task.status.${statusKey}`),
      count: status[statusKey].count,
    }),
  ).join(', ');

  return (
    <div
      className="summary-status-pie"
      role="img"
      aria-label={accessibleSummary}
      style={{
        background: total ? statusGradient(status) : 'var(--muted)',
      }}
    >
      <span className="summary-status-pie-center" aria-hidden="true">
        <strong>{total}</strong>
        <small>{t('summary.total')}</small>
      </span>
    </div>
  );
}
