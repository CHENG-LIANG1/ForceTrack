/** Renders the bounded read-only Timeline and delegates edits to the shared TaskDialog. */
import { AlertTriangle, CalendarRange, Plus } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useTasks } from '@/app/task-context';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { TaskDialog } from '@/features/task-editor/TaskDialog';
import { useTaskEditor } from '@/features/task-editor/useTaskEditor';
import {
  formatCalendarDate,
  selectTimelineData,
  TIMELINE_DAY_WIDTH,
} from '@/features/timeline/timeline-selectors';

function parseCalendarDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function TimelinePage() {
  const { t, i18n } = useTranslation();
  const { snapshot, isReady, createTask, updateTask, deleteTask } = useTasks();
  const { editor, setEditor, triggerRef, openCreate, openTask } =
    useTaskEditor();
  const todayColumnRef = useRef<HTMLDivElement>(null);
  const selectedTask =
    snapshot?.tasks.find((task) => task.id === editor.taskId) ?? null;
  const today = formatCalendarDate(new Date());
  const timeline = useMemo(
    () => selectTimelineData(snapshot?.tasks ?? [], today),
    [snapshot, today],
  );
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const formatRangeDate = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(parseCalendarDate(value));

  return (
    <section className="workspace-page" aria-labelledby="timeline-title">
      <PageHeader
        section="Timeline"
        titleId="timeline-title"
        title={t('timeline.title')}
        description={t('timeline.description')}
        actions={
          <Button
            size="lg"
            disabled={!isReady}
            onClick={(event) => openCreate(event.currentTarget, 'todo', null)}
          >
            <Plus size={16} />
            {t('task.actions.create')}
          </Button>
        }
      />

      {!snapshot ? (
        <LoadingState label={t('task.list.loading')} />
      ) : snapshot.tasks.length ? (
        <div className="timeline-panel">
          <div className="timeline-toolbar">
            <div>
              <strong>{t('timeline.dateRange')}</strong>
              <span>
                {t('timeline.range', {
                  start: formatRangeDate(timeline.startDate),
                  end: formatRangeDate(timeline.endDate),
                })}
              </span>
            </div>
            <div className="timeline-toolbar-actions">
              {timeline.rangeClipped ? (
                <span className="timeline-range-warning">
                  <AlertTriangle size={13} aria-hidden="true" />
                  {t('timeline.rangeClipped')}
                </span>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  todayColumnRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center',
                  })
                }
              >
                <CalendarRange size={14} aria-hidden="true" />
                {t('timeline.today')}
              </Button>
            </div>
          </div>

          <div className="timeline-scroll">
            <div
              className="timeline-table"
              style={
                {
                  '--timeline-days': timeline.days.length,
                  '--timeline-day-width': `${TIMELINE_DAY_WIDTH}px`,
                } as React.CSSProperties
              }
            >
              <div className="timeline-header-row">
                <div className="timeline-work-heading">
                  {t('task.list.title')}
                </div>
                <div className="timeline-calendar-header">
                  {timeline.days.map((date, index) => {
                    const day = parseCalendarDate(date);
                    const previousDate = timeline.days[index - 1];
                    const startsMonth =
                      index === 0 ||
                      previousDate.slice(0, 7) !== date.slice(0, 7);
                    return (
                      <div
                        key={date}
                        ref={
                          date === timeline.today ? todayColumnRef : undefined
                        }
                        className={
                          date === timeline.today ? 'is-today' : undefined
                        }
                        aria-label={formatRangeDate(date)}
                      >
                        <small>
                          {startsMonth
                            ? new Intl.DateTimeFormat(locale, {
                                month: 'short',
                              }).format(day)
                            : new Intl.DateTimeFormat(locale, {
                                weekday: 'narrow',
                              }).format(day)}
                        </small>
                        <strong>{day.getDate()}</strong>
                      </div>
                    );
                  })}
                </div>
              </div>

              {timeline.scheduled.length ? (
                timeline.scheduled.map(
                  ({
                    task,
                    startIndex,
                    duration,
                    overdue,
                    outOfRange,
                    visibleStartDate,
                  }) => (
                    <div className="timeline-row" key={task.id}>
                      <Button
                        variant="unstyled"
                        className="timeline-work-item"
                        type="button"
                        onClick={(event) =>
                          openTask(task.id, event.currentTarget)
                        }
                      >
                        <span>{task.key}</span>
                        <strong>{task.title}</strong>
                        {overdue ? (
                          <small className="timeline-overdue">
                            <AlertTriangle size={12} aria-hidden="true" />
                            {t('timeline.overdue')}
                          </small>
                        ) : null}
                      </Button>
                      <div className="timeline-track">
                        {visibleStartDate ? (
                          <Button
                            variant="unstyled"
                            type="button"
                            className={`timeline-bar status-${task.status}`}
                            style={{
                              gridColumn: `${startIndex + 1} / span ${duration}`,
                            }}
                            aria-label={`${task.key}: ${task.title}`}
                            onClick={(event) =>
                              openTask(task.id, event.currentTarget)
                            }
                          >
                            <span>{task.title}</span>
                            {outOfRange ? (
                              <small>{t('timeline.outOfRange')}</small>
                            ) : null}
                          </Button>
                        ) : (
                          <span className="timeline-out-of-range">
                            {t('timeline.outOfRange')}
                          </span>
                        )}
                      </div>
                    </div>
                  ),
                )
              ) : (
                <p className="timeline-scheduled-empty">
                  {t('timeline.noScheduled')}
                </p>
              )}
            </div>
          </div>

          {timeline.unscheduled.length ? (
            <section
              className="timeline-unscheduled"
              aria-labelledby="timeline-unscheduled-title"
            >
              <header>
                <div>
                  <h2 id="timeline-unscheduled-title">
                    {t('timeline.unscheduledTitle')}
                  </h2>
                  <span>
                    {t('timeline.unscheduled', {
                      count: timeline.unscheduled.length,
                    })}
                  </span>
                </div>
              </header>
              <div className="timeline-unscheduled-list">
                {timeline.unscheduled.map((task) => (
                  <Button
                    key={task.id}
                    type="button"
                    variant="outline"
                    onClick={(event) => openTask(task.id, event.currentTarget)}
                  >
                    <span>{task.key}</span>
                    {task.title}
                  </Button>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        <EmptyState
          icon={CalendarRange}
          title={t('timeline.emptyTitle')}
          description={t('timeline.emptyDescription')}
        />
      )}

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
              : createTask(fields)
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
