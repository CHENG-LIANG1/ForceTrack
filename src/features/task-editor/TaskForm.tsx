import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Member } from '@/domain/member';
import type { Sprint } from '@/domain/sprint';
import {
  ACTIVE_SPRINT_ID,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  validateTaskFields,
  type Task,
  type TaskFields,
  type TaskStatus,
  type TaskValidationIssue,
} from '@/domain/task';

interface TaskFormProps {
  task: Task | null;
  tasks: readonly Task[];
  sprints: readonly Sprint[];
  initialStatus?: TaskStatus;
  initialSprintId?: string | null;
  members: readonly Member[];
  onSubmit(fields: TaskFields, createAnother: boolean): Promise<void>;
  onCancel(): void;
  onDelete?(): void;
  onDirtyChange(dirty: boolean): void;
}

function initialFields(
  task: Task | null,
  initialStatus: TaskStatus,
  initialSprintId: string | null,
  defaultReporterId: string | null,
): TaskFields {
  if (task) {
    return {
      title: task.title,
      description: task.description,
      workType: task.workType,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId,
      reporterId: task.reporterId,
      parentId: task.parentId,
      labels: [...task.labels],
      sprintId: task.sprintId,
      storyPoints: task.storyPoints,
      startDate: task.startDate,
      dueDate: task.dueDate,
    };
  }

  return {
    title: '',
    description: '',
    workType: 'task',
    status: initialStatus,
    priority: 'medium',
    assigneeId: null,
    reporterId: defaultReporterId,
    parentId: null,
    labels: [],
    sprintId: initialSprintId,
    storyPoints: null,
    startDate: null,
    dueDate: null,
  };
}

function normalizedForComparison(fields: TaskFields): TaskFields {
  return {
    ...fields,
    title: fields.title.trim(),
    labels: [
      ...new Set(fields.labels.map((label) => label.trim()).filter(Boolean)),
    ],
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
  if (issue.code === 'invalid_date_range') return 'validation.dateRange';
  if (issue.code === 'unknown_assignee') return 'validation.unknownAssignee';
  if (issue.code === 'unknown_reporter') return 'validation.unknownReporter';
  if (issue.code === 'invalid_parent') return 'validation.invalidParent';
  if (issue.code === 'too_many_labels') return 'validation.invalidLabels';
  if (issue.code === 'invalid_story_points') {
    return 'validation.invalidStoryPoints';
  }
  return 'validation.invalidDate';
}

/** Jira-style editor with a small always-visible core and configurable planning details. */
export function TaskForm({
  task,
  tasks,
  sprints,
  initialStatus = 'todo',
  initialSprintId = ACTIVE_SPRINT_ID,
  members,
  onSubmit,
  onCancel,
  onDelete,
  onDirtyChange,
}: TaskFormProps) {
  const { t, i18n } = useTranslation();
  const baseline = useMemo(
    () =>
      initialFields(
        task,
        initialStatus,
        initialSprintId,
        members[0]?.id ?? null,
      ),
    [initialSprintId, initialStatus, members, task],
  );
  const [draft, setDraft] = useState<TaskFields>(baseline);
  const [issues, setIssues] = useState<TaskValidationIssue[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);
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
    const nextIssues = validateTaskFields(
      normalizedDraft,
      members,
      tasks,
      task?.id,
    );
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
      await onSubmit(normalizedDraft, !task && createAnother);
      if (!task && createAnother) {
        setDraft(baseline);
        setIssues([]);
        requestAnimationFrame(() => {
          const summary = formRef.current?.elements.namedItem('title');
          if (summary instanceof HTMLElement) summary.focus();
        });
      }
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

  const epics = tasks.filter(
    (candidate) => candidate.workType === 'epic' && candidate.id !== task?.id,
  );

  return (
    <form
      ref={formRef}
      className="task-form jira-task-form"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="task-context-grid">
        <div className="form-field">
          <label htmlFor="task-project">{t('task.fields.project')}</label>
          <Select value="FT" disabled>
            <SelectTrigger id="task-project" name="project">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FT">ForceTrack (FT)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="form-field">
          <label htmlFor="task-work-type">{t('task.fields.workType')}</label>
          <Select
            value={draft.workType}
            onValueChange={(value) =>
              update('workType', value as TaskFields['workType'])
            }
          >
            <SelectTrigger id="task-work-type" name="workType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_TYPES.map((workType) => (
                <SelectItem key={workType} value={workType}>
                  {t(`task.workType.${workType}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {task ? (
        <div className="task-readonly-meta">
          <span>{t('task.fields.id')}</span>
          <strong>{task.key}</strong>
        </div>
      ) : null}

      <div className="form-field form-field-wide summary-field">
        <label htmlFor="task-title">
          {t('task.fields.title')} <span aria-hidden="true">*</span>
        </label>
        <Input
          id="task-title"
          autoFocus
          name="title"
          value={draft.title}
          maxLength={101}
          aria-invalid={Boolean(issueFor('title'))}
          aria-describedby={issueFor('title') ? 'task-title-error' : undefined}
          onChange={(event) => update('title', event.target.value)}
        />
        {renderError('title')}
      </div>

      <div className="form-field form-field-wide">
        <label htmlFor="task-description">{t('task.fields.description')}</label>
        <Textarea
          id="task-description"
          name="description"
          value={draft.description}
          maxLength={2001}
          rows={5}
          placeholder={t('task.placeholders.description')}
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
      </div>

      <div className="form-section-heading">
        <strong>{t('task.sections.details')}</strong>
        <span>{t('task.sections.detailsHint')}</span>
      </div>

      <div className="task-form-grid">
        <div className="form-field">
          <label htmlFor="task-status">{t('task.fields.status')}</label>
          <Select
            value={draft.status}
            onValueChange={(value) =>
              update('status', value as TaskFields['status'])
            }
          >
            <SelectTrigger id="task-status" name="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`task.status.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="form-field">
          <label htmlFor="task-priority">{t('task.fields.priority')}</label>
          <Select
            value={draft.priority}
            onValueChange={(value) =>
              update('priority', value as TaskFields['priority'])
            }
          >
            <SelectTrigger id="task-priority" name="priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_PRIORITIES.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {t(`task.priority.${priority}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="form-field">
          <label htmlFor="task-assignee">{t('task.fields.assignee')}</label>
          <Select
            value={draft.assigneeId ?? 'unassigned'}
            onValueChange={(value) =>
              update('assigneeId', value === 'unassigned' ? null : value)
            }
          >
            <SelectTrigger
              id="task-assignee"
              name="assigneeId"
              aria-invalid={Boolean(issueFor('assigneeId'))}
              aria-describedby={
                issueFor('assigneeId') ? 'task-assigneeId-error' : undefined
              }
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">{t('task.unassigned')}</SelectItem>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {renderError('assigneeId')}
        </div>

        <div className="form-field">
          <label htmlFor="task-reporter">{t('task.fields.reporter')}</label>
          <Select
            value={draft.reporterId ?? 'unassigned'}
            onValueChange={(value) =>
              update('reporterId', value === 'unassigned' ? null : value)
            }
          >
            <SelectTrigger
              id="task-reporter"
              name="reporterId"
              aria-invalid={Boolean(issueFor('reporterId'))}
              aria-describedby={
                issueFor('reporterId') ? 'task-reporterId-error' : undefined
              }
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">{t('task.unassigned')}</SelectItem>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {renderError('reporterId')}
        </div>

        {draft.workType !== 'epic' ? (
          <div className="form-field">
            <label htmlFor="task-parent">{t('task.fields.parent')}</label>
            <Select
              value={draft.parentId ?? 'none'}
              onValueChange={(value) =>
                update('parentId', value === 'none' ? null : value)
              }
            >
              <SelectTrigger
                id="task-parent"
                name="parentId"
                aria-invalid={Boolean(issueFor('parentId'))}
                aria-describedby={
                  issueFor('parentId') ? 'task-parentId-error' : undefined
                }
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('task.noParent')}</SelectItem>
                {epics.map((epic) => (
                  <SelectItem key={epic.id} value={epic.id}>
                    {epic.key} · {epic.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {renderError('parentId')}
          </div>
        ) : null}

        <div className="form-field">
          <label htmlFor="task-sprint">{t('task.fields.sprint')}</label>
          <Select
            value={draft.sprintId ?? 'backlog'}
            onValueChange={(value) =>
              update('sprintId', value === 'backlog' ? null : value)
            }
          >
            <SelectTrigger id="task-sprint" name="sprintId">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="backlog">{t('task.backlog')}</SelectItem>
              {sprints
                .filter((sprint) => sprint.status !== 'completed')
                .map((sprint) => (
                  <SelectItem key={sprint.id} value={sprint.id}>
                    {sprint.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="form-field form-field-wide">
          <label htmlFor="task-labels">{t('task.fields.labels')}</label>
          <Input
            id="task-labels"
            name="labels"
            value={draft.labels.join(', ')}
            placeholder={t('task.placeholders.labels')}
            aria-invalid={Boolean(issueFor('labels'))}
            onChange={(event) =>
              update(
                'labels',
                event.target.value.split(',').map((label) => label.trim()),
              )
            }
          />
          {renderError('labels')}
        </div>

        <div className="form-field">
          <label htmlFor="task-story-points">
            {t('task.fields.storyPoints')}
          </label>
          <Input
            id="task-story-points"
            name="storyPoints"
            type="number"
            min="0"
            max="100"
            step="1"
            value={draft.storyPoints ?? ''}
            aria-invalid={Boolean(issueFor('storyPoints'))}
            onChange={(event) =>
              update(
                'storyPoints',
                event.target.value === '' ? null : Number(event.target.value),
              )
            }
          />
          {renderError('storyPoints')}
        </div>

        <span className="form-grid-spacer" aria-hidden="true" />

        <div className="form-field">
          <label htmlFor="task-start-date">{t('task.fields.startDate')}</label>
          <DatePicker
            id="task-start-date"
            name="startDate"
            value={draft.startDate}
            locale={i18n.resolvedLanguage ?? i18n.language}
            placeholder={t('task.datePlaceholder')}
            clearLabel={t('task.actions.clearDate')}
            invalid={Boolean(issueFor('startDate'))}
            describedBy={
              issueFor('startDate') ? 'task-startDate-error' : undefined
            }
            onChange={(value) => update('startDate', value)}
          />
          {renderError('startDate')}
        </div>

        <div className="form-field">
          <label htmlFor="task-due-date">{t('task.fields.dueDate')}</label>
          <DatePicker
            id="task-due-date"
            name="dueDate"
            value={draft.dueDate}
            locale={i18n.resolvedLanguage ?? i18n.language}
            placeholder={t('task.datePlaceholder')}
            clearLabel={t('task.actions.clearDate')}
            invalid={Boolean(issueFor('dueDate'))}
            describedBy={issueFor('dueDate') ? 'task-dueDate-error' : undefined}
            onChange={(value) => update('dueDate', value)}
          />
          {renderError('dueDate')}
        </div>
      </div>

      {!task ? (
        <div className="create-another-option">
          <Checkbox
            id="task-create-another"
            checked={createAnother}
            onCheckedChange={(checked) => setCreateAnother(checked === true)}
          />
          <label htmlFor="task-create-another">
            {t('task.actions.createAnother')}
          </label>
        </div>
      ) : null}

      <div className="task-form-actions">
        {onDelete ? (
          <Button
            className="danger-button"
            type="button"
            variant="outline"
            size="dialog"
            onClick={onDelete}
          >
            {t('task.actions.delete')}
          </Button>
        ) : (
          <span />
        )}
        <div>
          <Button
            type="button"
            variant="outline"
            size="dialog"
            onClick={onCancel}
          >
            {t('task.actions.cancel')}
          </Button>
          <Button type="submit" size="dialog" disabled={isSubmitting}>
            {isSubmitting
              ? t('task.actions.saving')
              : task
                ? t('task.actions.save')
                : t('task.actions.createWorkItem')}
          </Button>
        </div>
      </div>
    </form>
  );
}
