/** Temporary task list supplies the Task 3 CRUD entry point before Task 4 adds columns. */
import { CalendarDays, Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTasks } from '@/app/task-context';
import { Button } from '@/components/ui/button';
import { TaskDialog } from '@/features/task-editor/TaskDialog';

interface EditorState {
  open: boolean;
  taskId: string | null;
}

function formatCalendarDate(value: string, locale: string): string {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(locale).format(new Date(year, month - 1, day));
}

export function BoardPage() {
  const { t, i18n } = useTranslation();
  const {
    snapshot,
    isReady,
    loadWasRecovered,
    persistenceFailed,
    createTask,
    updateTask,
    deleteTask,
  } = useTasks();
  const [editor, setEditor] = useState<EditorState>({
    open: false,
    taskId: null,
  });
  const editorTriggerRef = useRef<HTMLElement | null>(null);
  const selectedTask =
    snapshot?.tasks.find((task) => task.id === editor.taskId) ?? null;

  const openCreate = (trigger: HTMLElement) => {
    editorTriggerRef.current = trigger;
    setEditor({ open: true, taskId: null });
  };

  return (
    <section className="workspace-page" aria-labelledby="board-title">
      <div className="board-heading-row">
        <div className="page-heading">
          <p className="page-kicker">ForceTrack / Board</p>
          <h1 id="board-title">{t('board.title')}</h1>
          <p>{t('board.description')}</p>
        </div>
        <Button
          size="lg"
          onClick={(event) => openCreate(event.currentTarget)}
          disabled={!isReady}
        >
          <Plus size={16} />
          {t('task.actions.create')}
        </Button>
      </div>

      {loadWasRecovered ? (
        <div className="feedback-banner" role="status">
          {t('task.feedback.recovered')}
        </div>
      ) : null}
      {persistenceFailed ? (
        <div className="feedback-banner feedback-banner-danger" role="alert">
          {t('task.feedback.saveFailed')}
        </div>
      ) : null}

      <div className="task-list-panel" aria-busy={!isReady}>
        <div className="task-list-heading">
          <div>
            <h2>{t('task.list.title')}</h2>
            <p>{t('task.list.description')}</p>
          </div>
          <span className="task-count">
            {t('task.list.count', { count: snapshot?.tasks.length ?? 0 })}
          </span>
        </div>

        {!isReady ? (
          <p className="task-list-message">{t('task.list.loading')}</p>
        ) : snapshot && snapshot.tasks.length > 0 ? (
          <ul className="task-list">
            {snapshot.tasks.map((task) => {
              const member = snapshot.members.find(
                (candidate) => candidate.id === task.assigneeId,
              );
              return (
                <li key={task.id}>
                  <button
                    className="task-list-item"
                    type="button"
                    aria-label={t('task.actions.editLabel', {
                      key: task.key,
                      title: task.title,
                    })}
                    onClick={(event) => {
                      editorTriggerRef.current = event.currentTarget;
                      setEditor({ open: true, taskId: task.id });
                    }}
                  >
                    <span className="task-list-main">
                      <span className="task-key">{task.key}</span>
                      <strong>{task.title}</strong>
                    </span>
                    <span className="task-list-meta">
                      <span>{t(`task.status.${task.status}`)}</span>
                      <span>{t(`task.priority.${task.priority}`)}</span>
                      <span>{member?.name ?? t('task.unassigned')}</span>
                      {task.dueDate ? (
                        <span>
                          <CalendarDays size={13} aria-hidden="true" />
                          {formatCalendarDate(
                            task.dueDate,
                            i18n.resolvedLanguage ?? i18n.language,
                          )}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="task-list-empty">
            <p>{t('task.list.empty')}</p>
            <Button
              variant="outline"
              onClick={(event) => openCreate(event.currentTarget)}
            >
              <Plus size={15} />
              {t('task.actions.create')}
            </Button>
          </div>
        )}
      </div>

      {snapshot ? (
        <TaskDialog
          open={editor.open}
          task={selectedTask}
          members={snapshot.members}
          returnFocusRef={editorTriggerRef}
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
