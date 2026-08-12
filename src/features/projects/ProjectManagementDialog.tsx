/** Provides one shadcn dialog for reading, creating, editing, and deleting projects. */
import { FolderOpen, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useProjects } from '@/app/project-context';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { ProjectAggregate } from '@/domain/project';
import { ProjectForm } from '@/features/projects/ProjectForm';

interface ProjectManagementDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  onProjectSelected(projectId: string | null): void;
  initialMode?: ProjectManagementMode;
}

type ProjectManagementMode = 'list' | 'create' | 'edit';
const PROJECT_DELETE_CONFIRMATION_INPUT_ID = 'project-delete-confirmation';

export function ProjectManagementDialog({
  open,
  onOpenChange,
  onProjectSelected,
  initialMode = 'list',
}: ProjectManagementDialogProps) {
  const { t } = useTranslation();
  const { projects, currentProject, deleteProject } = useProjects();
  const [mode, setMode] = useState<ProjectManagementMode>(initialMode);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('');
  const deleteConfirmationRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const editingProject =
    projects.find((project) => project.id === editingProjectId) ?? null;
  const pendingDelete =
    projects.find((project) => project.id === pendingDeleteId) ?? null;
  const deleteConfirmed =
    pendingDelete !== null && deleteConfirmationName === pendingDelete.name;

  const reset = () => {
    setMode(initialMode);
    setEditingProjectId(null);
    setPendingDeleteId(null);
    setDeleteConfirmationName('');
    setError(null);
  };

  const changeOpen = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const showEdit = (project: ProjectAggregate) => {
    setEditingProjectId(project.id);
    setMode('edit');
    setError(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent className="project-management-dialog">
          <div className="task-dialog-heading management-dialog-heading">
            <div>
              <DialogTitle>
                {t(
                  mode === 'list'
                    ? 'project.manage.title'
                    : mode === 'create'
                      ? 'project.create.title'
                      : 'project.manage.editTitle',
                )}
              </DialogTitle>
              <DialogDescription>
                {t(
                  mode === 'list'
                    ? 'project.manage.description'
                    : mode === 'create'
                      ? 'project.create.description'
                      : 'project.manage.editDescription',
                )}
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button
                type="button"
                variant="unstyled"
                className="icon-button"
                aria-label={t('project.manage.close')}
              >
                <X size={18} aria-hidden="true" />
              </Button>
            </DialogClose>
          </div>

          {mode === 'list' ? (
            <div className="project-management-content">
              <div className="project-management-toolbar">
                <span>
                  {t('project.manage.count', { count: projects.length })}
                </span>
                <Button
                  size="dialog"
                  onClick={() => {
                    setMode('create');
                    setError(null);
                  }}
                >
                  <Plus size={15} aria-hidden="true" />
                  {t('project.manage.create')}
                </Button>
              </div>
              <ul className="project-management-list">
                {projects.map((project) => {
                  const isCurrent = project.id === currentProject?.id;
                  return (
                    <li key={project.id}>
                      <span
                        className="project-management-mark"
                        aria-hidden="true"
                      >
                        {project.key.slice(0, 2)}
                      </span>
                      <div className="project-management-copy">
                        <div>
                          <strong>{project.name}</strong>
                          <code>{project.key}</code>
                          {isCurrent ? (
                            <span className="project-current-badge">
                              {t('project.manage.current')}
                            </span>
                          ) : null}
                        </div>
                        <p>
                          {project.description ||
                            t('project.manage.noDescription')}
                        </p>
                        <small>
                          {t('project.manage.stats', {
                            tasks: project.tasks.length,
                            sprints: project.sprints.length,
                            members: project.members.length,
                          })}
                        </small>
                      </div>
                      <div className="project-management-actions">
                        {!isCurrent ? (
                          <Button
                            variant="outline"
                            size="dialog"
                            onClick={() => {
                              changeOpen(false);
                              onProjectSelected(project.id);
                            }}
                          >
                            <FolderOpen size={15} aria-hidden="true" />
                            {t('project.manage.open')}
                          </Button>
                        ) : null}
                        <Button
                          variant="unstyled"
                          className="project-management-icon-button"
                          aria-label={t('project.manage.editNamed', {
                            name: project.name,
                          })}
                          onClick={() => showEdit(project)}
                        >
                          <Pencil size={15} aria-hidden="true" />
                        </Button>
                        <Button
                          variant="unstyled"
                          className="project-management-icon-button project-management-delete"
                          title={t('project.manage.delete')}
                          aria-label={t('project.manage.deleteNamed', {
                            name: project.name,
                          })}
                          onClick={() => {
                            setError(null);
                            setDeleteConfirmationName('');
                            setPendingDeleteId(project.id);
                          }}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {error ? (
                <p className="form-error" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          ) : (
            <ProjectForm
              key={editingProject?.id ?? 'new-project'}
              project={mode === 'edit' ? editingProject : null}
              onCancel={() => {
                setMode('list');
                setEditingProjectId(null);
              }}
              onSaved={(project) => {
                setMode('list');
                setEditingProjectId(null);
                if (mode === 'create') onProjectSelected(project.id);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setPendingDeleteId(null);
            setDeleteConfirmationName('');
          }
        }}
      >
        <AlertDialogContent
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            deleteConfirmationRef.current?.focus();
          }}
        >
          <AlertDialogTitle>{t('project.manage.deleteTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('project.manage.deleteDescription', {
              name: pendingDelete?.name,
              tasks: pendingDelete?.tasks.length ?? 0,
              sprints: pendingDelete?.sprints.length ?? 0,
              members: pendingDelete?.members.length ?? 0,
            })}
          </AlertDialogDescription>
          <label
            className="project-delete-confirmation"
            htmlFor={PROJECT_DELETE_CONFIRMATION_INPUT_ID}
          >
            <span>
              {t('project.manage.deleteConfirmationLabel', {
                name: pendingDelete?.name,
              })}
            </span>
            <Input
              ref={deleteConfirmationRef}
              id={PROJECT_DELETE_CONFIRMATION_INPUT_ID}
              autoComplete="off"
              value={deleteConfirmationName}
              onChange={(event) =>
                setDeleteConfirmationName(event.target.value)
              }
            />
          </label>
          <div className="confirmation-actions">
            <AlertDialogCancel asChild>
              <Button variant="outline" size="dialog">
                {t('task.actions.cancel')}
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                size="dialog"
                className="danger-primary-button"
                disabled={!deleteConfirmed}
                onClick={(event) => {
                  if (!pendingDelete || !deleteConfirmed) return;
                  event.preventDefault();
                  const deletingCurrent =
                    pendingDelete.id === currentProject?.id;
                  void deleteProject(pendingDelete.id)
                    .then((fallbackProjectId) => {
                      setPendingDeleteId(null);
                      setDeleteConfirmationName('');
                      if (!fallbackProjectId) {
                        changeOpen(false);
                        onProjectSelected(null);
                      } else if (deletingCurrent) {
                        onProjectSelected(fallbackProjectId);
                      }
                    })
                    .catch((cause) => {
                      setPendingDeleteId(null);
                      setError(
                        t(
                          `project.manage.${cause instanceof Error ? cause.message : 'deleteFailed'}`,
                        ),
                      );
                    });
                }}
              >
                {t('project.manage.confirmDelete')}
              </Button>
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
