import { Plus } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useTasks } from '@/app/task-context';
import { Button } from '@/components/ui/button';
import { TASK_PRIORITIES, TASK_STATUSES } from '@/domain/task';
import { selectSummaryData } from '@/features/summary/summary-selectors';
import { TaskDialog } from '@/features/task-editor/TaskDialog';
import { useTaskEditor } from '@/features/task-editor/useTaskEditor';

export function SummaryPage() {
  const { t } = useTranslation();
  const { snapshot, isReady, createTask, updateTask, deleteTask } = useTasks();
  const { editor, setEditor, triggerRef, openCreate, openTask } =
    useTaskEditor();
  const selectedTask =
    snapshot?.tasks.find((task) => task.id === editor.taskId) ?? null;

  const data = useMemo(
    () => selectSummaryData(snapshot ?? { tasks: [], members: [] }),
    [snapshot],
  );

  const cards = [
    ['created', data.overview.created],
    ['updated', data.overview.updated],
    ['completed', data.overview.completed],
    ['dueSoon', data.overview.dueSoon],
  ] as const;
  const maxMemberLoad = Math.max(
    1,
    ...data.workload.map((entry) => entry.count),
  );

  return (
    <section className="workspace-page" aria-labelledby="summary-title">
      <div className="board-heading-row">
        <div className="page-heading compact-page-heading">
          <p className="page-kicker">ForceTrack / Summary</p>
          <h1 id="summary-title">{t('summary.title')}</h1>
          <p>{t('summary.description')}</p>
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
          <div className="status-segments" aria-hidden="true">
            {TASK_STATUSES.map((status) => {
              const count = data.status[status].count;
              return (
                <span
                  key={status}
                  className={`status-segment status-${status}`}
                  style={{ flexGrow: count || 0.2 }}
                />
              );
            })}
          </div>
          <div className="summary-breakdown-list">
            {TASK_STATUSES.map((status) => {
              const count = data.status[status].count;
              return (
                <div key={status}>
                  <span>
                    <i className={`legend-dot status-${status}`} />
                    {t(`task.status.${status}`)}
                  </span>
                  <strong>{count}</strong>
                </div>
              );
            })}
          </div>
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
                  <strong>{count}</strong>
                </div>
              );
            })}
          </div>
        </section>

        <section className="summary-panel">
          <h2>{t('summary.teamWorkload')}</h2>
          <div className="workload-list">
            {data.workload
              .filter((entry) => entry.member !== null)
              .map(({ member, count }) => {
                if (!member) return null;
                return (
                  <div key={member.id}>
                    <span>{member.name}</span>
                    <span className="breakdown-track">
                      <i
                        style={{ width: `${(count / maxMemberLoad) * 100}%` }}
                      />
                    </span>
                    <strong>{count}</strong>
                  </div>
                );
              })}
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
                    onClick={(event) => openTask(task.id, event.currentTarget)}
                  >
                    <span>{task.key}</span>
                    <strong>{task.title}</strong>
                    <small>{t(`task.status.${task.status}`)}</small>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel-empty">{t('summary.noActivity')}</p>
          )}
        </section>
      </div>

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
