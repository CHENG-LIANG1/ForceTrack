/** Reuses one validated form for both project creation and metadata editing. */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useProjects } from '@/app/project-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  type ProjectAggregate,
  ProjectValidationError,
} from '@/domain/project';

interface ProjectFormProps {
  project?: ProjectAggregate | null;
  onCancel(): void;
  onSaved(project: ProjectAggregate): void;
}

export function ProjectForm({
  project = null,
  onCancel,
  onSaved,
}: ProjectFormProps) {
  const { t } = useTranslation();
  const { createProject, updateProject } = useProjects();
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const savedProject = project
        ? await updateProject(project.id, { name, description })
        : await createProject({ name, description });
      onSaved(savedProject);
    } catch (cause) {
      const issue =
        cause instanceof ProjectValidationError ? cause.issue : 'unknown';
      setError(t(`project.validation.${issue}`));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="project-form" onSubmit={handleSubmit}>
      <label>
        <span>{t('project.fields.name')}</span>
        <Input
          autoFocus
          value={name}
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label>
        <span>{t('project.fields.description')}</span>
        <Textarea
          value={description}
          maxLength={500}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="dialog-actions">
        <Button
          type="button"
          variant="outline"
          size="dialog"
          onClick={onCancel}
        >
          {t('task.actions.cancel')}
        </Button>
        <Button type="submit" size="dialog" disabled={saving}>
          {saving
            ? t(project ? 'project.manage.saving' : 'project.create.creating')
            : t(project ? 'project.manage.save' : 'project.create.action')}
        </Button>
      </div>
    </form>
  );
}
