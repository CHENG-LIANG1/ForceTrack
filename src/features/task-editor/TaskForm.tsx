import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import type { Member } from '@/domain/member';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  validateTaskFields,
  type Task,
  type TaskFields,
  type TaskValidationIssue,
} from '@/domain/task';

interface TaskFormProps {
  task: Task | null;
  members: readonly Member[];
  onSubmit(fields: TaskFields): Promise<void>;
  onCancel(): void;
  onDelete?(): void;
  onDirtyChange(dirty: boolean): void;
}

function initialFields(task: Task | null): TaskFields {
  if (task) {
    return {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId,
      startDate: task.startDate,
      dueDate: task.dueDate,
    };
  }

  return {
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assigneeId: null,
    startDate: null,
    dueDate: null,
  };
}

function normalizedForComparison(fields: TaskFields): TaskFields {
  return {
    ...fields,
    title: fields.title.trim(),
    startDate: fields.startDate || null,
    dueDate: fields.dueDate || null,
  };
}

function validationMessageKey(issue: TaskValidationIssue): string {
  if (issue.field === 'title' && issue.code === 'required') {
    return 'validation.titleRequired';
  }
  if (issue.field === 'title' && issue.code === 'too_long') {
    return 'validation.titleTooLong';
  }
  if (issue.field === 'description' && issue.code === 'too_long') {
    return 'validation.descriptionTooLong';
  }
  if (issue.code === 'invalid_date_range') {
    return 'validation.dateRange';
  }
  if (issue.code === 'unknown_assignee') {
    return 'validation.unknownAssignee';
  }
  return 'validation.invalidDate';
}

/** Controlled editor that keeps validation and dirty-state semantics close to the draft. */
export function TaskForm({
  task,
  members,
  onSubmit,
  onCancel,
  onDelete,
  onDirtyChange,
}: TaskFormProps) {
  const { t } = useTranslation();
  const baseline = useMemo(() => initialFields(task), [task]);
  const [draft, setDraft] = useState<TaskFields>(baseline);
  const [issues, setIssues] = useState<TaskValidationIssue[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const dirty =
    JSON.stringify(normalizedForComparison(draft)) !==
    JSON.stringify(normalizedForComparison(baseline));

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const issueFor = (field: TaskValidationIssue['field']) =>
    issues.find((issue) => issue.field === field);

  const update = <Field extends keyof TaskFields>(
    field: Field,
    value: TaskFields[Field],
  ) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setIssues((current) => current.filter((issue) => issue.field !== field));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedDraft = normalizedForComparison(draft);
    const nextIssues = validateTaskFields(normalizedDraft, members);
    setIssues(nextIssues);

    if (nextIssues.length > 0) {
      const firstField = formRef.current?.elements.namedItem(
        nextIssues[0].field,
      );
      if (firstField instanceof HTMLElement) firstField.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(normalizedDraft);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderError = (field: TaskValidationIssue['field']) => {
    const issue = issueFor(field);
    if (!issue) return null;
    return (
      <p className="field-error" id={`task-${field}-error`} role="alert">
        {t(validationMessageKey(issue))}
      </p>
    );
  };

  return (
    <form
      ref={formRef}
      className="task-form"
      onSubmit={handleSubmit}
      noValidate
    >
      {task ? (
        <div className="task-readonly-meta">
          <span>{t('task.fields.id')}</span>
          <strong>{task.key}</strong>
        </div>
      ) : null}

      <label className="form-field form-field-wide">
        <span>
          {t('task.fields.title')} <span aria-hidden="true">*</span>
        </span>
        <input
          autoFocus
          name="title"
          value={draft.title}
          maxLength={101}
          aria-invalid={Boolean(issueFor('title'))}
          aria-describedby={issueFor('title') ? 'task-title-error' : undefined}
          onChange={(event) => update('title', event.target.value)}
        />
        {renderError('title')}
      </label>

      <label className="form-field form-field-wide">
        <span>{t('task.fields.description')}</span>
        <textarea
          name="description"
          value={draft.description}
          maxLength={2001}
          rows={5}
          aria-invalid={Boolean(issueFor('description'))}
          aria-describedby={
            issueFor('description') ? 'task-description-error' : undefined
          }
          onChange={(event) => update('description', event.target.value)}
        />
        <span className="field-hint">
          {t('task.characterCount', { count: draft.description.length })}
        </span>
        {renderError('description')}
      </label>

      <div className="task-form-grid">
        <label className="form-field">
          <span>{t('task.fields.status')}</span>
          <select
            name="status"
            value={draft.status}
            onChange={(event) =>
              update('status', event.target.value as TaskFields['status'])
            }
          >
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(`task.status.${status}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>{t('task.fields.priority')}</span>
          <select
            name="priority"
            value={draft.priority}
            onChange={(event) =>
              update('priority', event.target.value as TaskFields['priority'])
            }
          >
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {t(`task.priority.${priority}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field form-field-wide">
          <span>{t('task.fields.assignee')}</span>
          <select
            name="assigneeId"
            value={draft.assigneeId ?? ''}
            aria-invalid={Boolean(issueFor('assigneeId'))}
            aria-describedby={
              issueFor('assigneeId') ? 'task-assigneeId-error' : undefined
            }
            onChange={(event) =>
              update('assigneeId', event.target.value || null)
            }
          >
            <option value="">{t('task.unassigned')}</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          {renderError('assigneeId')}
        </label>

        <label className="form-field">
          <span>{t('task.fields.startDate')}</span>
          <input
            name="startDate"
            type="date"
            value={draft.startDate ?? ''}
            aria-invalid={Boolean(issueFor('startDate'))}
            aria-describedby={
              issueFor('startDate') ? 'task-startDate-error' : undefined
            }
            onChange={(event) =>
              update('startDate', event.target.value || null)
            }
          />
          {renderError('startDate')}
        </label>

        <label className="form-field">
          <span>{t('task.fields.dueDate')}</span>
          <input
            name="dueDate"
            type="date"
            value={draft.dueDate ?? ''}
            aria-invalid={Boolean(issueFor('dueDate'))}
            aria-describedby={
              issueFor('dueDate') ? 'task-dueDate-error' : undefined
            }
            onChange={(event) => update('dueDate', event.target.value || null)}
          />
          {renderError('dueDate')}
        </label>
      </div>

      <div className="task-form-actions">
        {onDelete ? (
          <Button
            className="danger-button"
            type="button"
            variant="outline"
            onClick={onDelete}
          >
            {t('task.actions.delete')}
          </Button>
        ) : (
          <span />
        )}
        <div>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('task.actions.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('task.actions.saving') : t('task.actions.save')}
          </Button>
        </div>
      </div>
    </form>
  );
}
