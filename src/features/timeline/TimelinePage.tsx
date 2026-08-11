import { CalendarRange, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useTasks } from '@/app/task-context';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { TaskDialog } from '@/features/task-editor/TaskDialog';
import { useTaskEditor } from '@/features/task-editor/useTaskEditor';

const DAY_MS = 86_400_000;

function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * DAY_MS);
}

function dayDiff(left: Date, right: Date): number {
  return Math.round((right.getTime() - left.getTime()) / DAY_MS);
}

export function TimelinePage() {
  const { t, i18n } = useTranslation();
  const { snapshot, isReady, createTask, updateTask, deleteTask } = useTasks();
  const { editor, setEditor, triggerRef, openCreate, openTask } =
    useTaskEditor();
  const selectedTask =
    snapshot?.tasks.find((task) => task.id === editor.taskId) ?? null;

  const timeline = useMemo(() => {
    const tasks = (snapshot?.tasks ?? []).filter(
      (task) => task.startDate || task.dueDate,
    );
    const today = parseDate(formatDate(new Date()));
    const dates = tasks.flatMap((task) =>
      [task.startDate, task.dueDate].filter(
        (value): value is string => !!value,
      ),
    );
    const earliest = dates.length ? parseDate([...dates].sort()[0]) : today;
    const latest = dates.length
      ? parseDate([...dates].sort().at(-1) as string)
      : addDays(today, 27);
    const start = earliest < today ? earliest : today;
    const end = latest > addDays(start, 27) ? latest : addDays(start, 27);
    const dayCount = dayDiff(start, end) + 1;
    return {
      tasks,
      today,
      start,
      dayCount,
      days: Array.from({ length: dayCount }, (_, index) =>
        addDays(start, index),
      ),
    };
  }, [snapshot]);

  const unscheduled =
    snapshot?.tasks.filter((task) => !task.startDate && !task.dueDate).length ??
    0;
  const locale = i18n.resolvedLanguage ?? i18n.language;

  return (
    <section className="workspace-page" aria-labelledby="timeline-title">
      <div className="board-heading-row">
        <div className="page-heading compact-page-heading">
          <p className="page-kicker">ForceTrack / Timeline</p>
          <h1 id="timeline-title">{t('timeline.title')}</h1>
          <p>{t('timeline.description')}</p>
        </div>
        <Button
          size="lg"
          disabled={!isReady}
          onClick={(event) => openCreate(event.currentTarget, 'todo', null)}
        >
          <Plus size={16} />
          {t('task.actions.create')}
        </Button>
      </div>

      {snapshot && timeline.tasks.length ? (
        <div className="timeline-panel">
          <div className="timeline-toolbar">
            <strong>{t('timeline.dateRange')}</strong>
            <span>{t('timeline.unscheduled', { count: unscheduled })}</span>
          </div>
          <div className="timeline-scroll">
            <div
              className="timeline-table"
              style={
                { '--timeline-days': timeline.dayCount } as React.CSSProperties
              }
            >
              <div className="timeline-header-row">
                <div className="timeline-work-heading">
                  {t('task.list.title')}
                </div>
                <div className="timeline-calendar-header">
                  {timeline.days.map((day) => (
                    <div
                      key={formatDate(day)}
                      className={
                        formatDate(day) === formatDate(timeline.today)
                          ? 'is-today'
                          : undefined
                      }
                    >
                      <small>
                        {new Intl.DateTimeFormat(locale, {
                          weekday: 'short',
                        }).format(day)}
                      </small>
                      <strong>{day.getUTCDate()}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {timeline.tasks.map((task) => {
                const start = parseDate(
                  task.startDate ?? (task.dueDate as string),
                );
                const end = parseDate(
                  task.dueDate ?? (task.startDate as string),
                );
                const left =
                  (dayDiff(timeline.start, start) / timeline.dayCount) * 100;
                const width =
                  ((dayDiff(start, end) + 1) / timeline.dayCount) * 100;
                return (
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
                    </Button>
                    <div className="timeline-track">
                      <Button
                        variant="unstyled"
                        type="button"
                        className={`timeline-bar status-${task.status}`}
                        style={{
                          left: `${left}%`,
                          width: `${Math.max(width, 1.4)}%`,
                        }}
                        aria-label={`${task.key}: ${task.title}`}
                        onClick={(event) =>
                          openTask(task.id, event.currentTarget)
                        }
                      >
                        <span>{task.title}</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : snapshot ? (
        <EmptyState
          icon={CalendarRange}
          title={t('timeline.emptyTitle')}
          description={t('timeline.emptyDescription')}
        />
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
