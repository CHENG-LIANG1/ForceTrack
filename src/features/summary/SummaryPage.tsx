/** Renders every Summary module from one filtered, read-only selector result. */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTasks } from '@/app/task-context';
import { LoadingState } from '@/components/LoadingState';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES } from '@/domain/task';
import { SummaryFilterPanel } from '@/features/summary/SummaryFilterPanel';
import {
  EMPTY_SUMMARY_FILTERS,
  SUMMARY_METRIC_KEYS,
} from '@/features/summary/summary-constants';
import { SummaryStatusPie } from '@/features/summary/SummaryStatusPie';
import {
  selectSummaryData,
  type SummaryFilters,
} from '@/features/summary/summary-selectors';
import { TaskDialog } from '@/features/task-editor/TaskDialog';
import { useTaskEditor } from '@/features/task-editor/useTaskEditor';

export function SummaryPage() {
  const { t } = useTranslation();
  const { snapshot, updateTask, deleteTask } = useTasks();
  const [filters, setFilters] = useState<SummaryFilters>(EMPTY_SUMMARY_FILTERS);
  const { editor, setEditor, triggerRef, openTask } = useTaskEditor();
  const selectedTask =
    snapshot?.tasks.find((task) => task.id === editor.taskId) ?? null;

  const data = useMemo(
    () => selectSummaryData(snapshot ?? { tasks: [], members: [] }, filters),
    [filters, snapshot],
  );

  const cards = SUMMARY_METRIC_KEYS.map(
    (key) => [key, data.overview[key]] as const,
  );
  const maxMemberLoad = Math.max(
    1,
    ...data.workload.map((entry) => entry.count),
  );
  const hasActiveFilters = Object.values(filters).some((value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value),
  );

  return (
    <section
      className="workspace-page summary-page"
      aria-labelledby="summary-title"
    >
      <PageHeader
        onboardingTarget="page-summary"
        section={t('nav.summary')}
        titleId="summary-title"
        title={t('summary.title')}
        description={t('summary.description')}
      />

      {!snapshot ? (
        <LoadingState label={t('task.list.loading')} />
      ) : (
        <SummaryFilterPanel
          filters={filters}
          members={snapshot.members}
          tasks={snapshot.tasks}
          onChange={setFilters}
          onClear={() => setFilters(EMPTY_SUMMARY_FILTERS)}
        />
      )}

      {snapshot && hasActiveFilters && data.tasks.length === 0 ? (
        <p className="filter-empty-state" role="status">
          {t('summary.filters.noResults')}
        </p>
      ) : null}

      {snapshot ? (
        <>
          <div className="summary-metrics">
            {cards.map(([label, value]) => (
              <article key={label}>
                <span>{t(`summary.${label}`)}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </div>

          <div className="summary-grid">
            <section className="summary-panel summary-status-panel">
              <h2>{t('summary.statusOverview')}</h2>
              <div className="summary-status-content">
                <SummaryStatusPie status={data.status} />
                <div className="summary-breakdown-list">
                  {TASK_STATUSES.map((status) => {
                    const count = data.status[status].count;
                    return (
                      <div key={status}>
                        <span>
                          <i className={`legend-dot status-${status}`} />
                          {t(`task.status.${status}`)}
                        </span>
                        <strong>
                          {count} · {Math.round(data.status[status].percent)}%
                        </strong>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="summary-panel">
              <h2>{t('summary.recentActivity')}</h2>
              {data.recentActivity.length ? (
                <ul className="activity-list">
                  {data.recentActivity.map((task) => (
                    <li key={task.id}>
                      <Button
                        variant="unstyled"
                        type="button"
                        onClick={(event) =>
                          openTask(task.id, event.currentTarget)
                        }
                      >
                        <span>{task.key}</span>
                        <strong>{task.title}</strong>
                        <small>{t(`task.status.${task.status}`)}</small>
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="panel-empty summary-panel-empty">
                  {t('summary.noActivity')}
                </p>
              )}
            </section>

            <section className="summary-panel">
              <h2>{t('summary.priorityBreakdown')}</h2>
              <div className="summary-breakdown-list priority-breakdown-list">
                {TASK_PRIORITIES.map((priority) => {
                  const { count, percent: width } = data.priorities[priority];
                  return (
                    <div key={priority} className="breakdown-row">
                      <span>{t(`task.priority.${priority}`)}</span>
                      <span className="breakdown-track">
                        <i style={{ width: `${width}%` }} />
                      </span>
                      <strong>
                        {count} · {Math.round(width)}%
                      </strong>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="summary-panel">
              <h2>{t('summary.workTypes')}</h2>
              <div className="summary-breakdown-list priority-breakdown-list">
                {TASK_TYPES.map((workType) => {
                  const { count, percent: width } = data.workTypes[workType];
                  return (
                    <div key={workType} className="breakdown-row">
                      <span>{t(`task.workType.${workType}`)}</span>
                      <span className="breakdown-track">
                        <i style={{ width: `${width}%` }} />
                      </span>
                      <strong>
                        {count} · {Math.round(width)}%
                      </strong>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="summary-panel">
              <h2>{t('summary.teamWorkload')}</h2>
              <div className="workload-list">
                {data.workload.map(({ assigneeId, member, count }) => (
                  <div key={assigneeId ?? 'unassigned'}>
                    <span>{member?.name ?? t('summary.unassigned')}</span>
                    <span className="breakdown-track">
                      <i
                        style={{ width: `${(count / maxMemberLoad) * 100}%` }}
                      />
                    </span>
                    <strong>{count}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="summary-panel">
              <h2>{t('summary.workProgress')}</h2>
              {data.epicProgress.length ? (
                <div className="epic-progress-list">
                  {data.epicProgress.map(({ epic, total, byStatus }) => (
                    <article key={epic.id} className="epic-progress-item">
                      <header>
                        <Button
                          variant="unstyled"
                          type="button"
                          onClick={(event) =>
                            openTask(epic.id, event.currentTarget)
                          }
                        >
                          <span>{epic.key}</span>
                          <strong>{epic.title}</strong>
                        </Button>
                        <small>
                          {t('summary.childCount', { count: total })}
                        </small>
                      </header>
                      {total ? (
                        <>
                          <div
                            className="status-segments epic-progress-segments"
                            aria-label={TASK_STATUSES.map((status) =>
                              t('summary.statusCount', {
                                status: t(`task.status.${status}`),
                                count: byStatus[status],
                              }),
                            ).join(', ')}
                          >
                            {TASK_STATUSES.map((status) => (
                              <span
                                key={status}
                                className={`status-segment status-${status}`}
                                style={{ flexGrow: byStatus[status] || 0 }}
                              />
                            ))}
                          </div>
                          <p className="epic-progress-caption">
                            {TASK_STATUSES.map((status) =>
                              t('summary.statusCount', {
                                status: t(`task.status.${status}`),
                                count: byStatus[status],
                              }),
                            ).join(' · ')}
                          </p>
                        </>
                      ) : (
                        <p className="epic-progress-caption">
                          {t('summary.noEpicChildren')}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="panel-empty summary-panel-empty">
                  {t('summary.noEpicProgress')}
                </p>
              )}
            </section>
          </div>
        </>
      ) : null}

      {snapshot ? (
        <TaskDialog
          open={editor.open}
          task={selectedTask}
          tasks={snapshot.tasks}
          sprints={snapshot.sprints}
          initialStatus={editor.createStatus}
          initialSprintId={editor.createSprintId}
          members={snapshot.members}
          returnFocusRef={triggerRef}
          onOpenChange={(open) =>
            setEditor((current) => ({ ...current, open }))
          }
          onSave={(fields) =>
            editor.taskId
              ? updateTask(editor.taskId, fields)
              : Promise.resolve()
          }
          onDelete={
            editor.taskId
              ? () => deleteTask(editor.taskId as string)
              : undefined
          }
        />
      ) : null}
    </section>
  );
}
