import { Check, ChevronDown, FolderCog, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';

import { usePreferences } from '@/app/preferences-context';
import { useProjects } from '@/app/project-context';
import { pageFromPath, projectPath } from '@/app/route-paths';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MenuItem } from '@/components/ui/menu-item';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { MemberManagementDialog } from '@/features/members/MemberManagementDialog';
import { ProjectManagementDialog } from '@/features/projects/ProjectManagementDialog';

/** Makes project context visible at all times and keeps project actions in one predictable place. */
export function ProjectSwitcher() {
  const { t } = useTranslation();
  const { projects, currentProject, addMember, removeMember } = useProjects();
  const { preferences } = usePreferences();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [managementOpen, setManagementOpen] = useState(false);
  const [memberManagementOpen, setMemberManagementOpen] = useState(false);
  const [query, setQuery] = useState('');
  const sortedProjects = useMemo(() => {
    const recentOrder = new Map(
      preferences.recentProjectIds.map((id, index) => [id, index]),
    );
    return [...projects].sort(
      (left, right) =>
        (recentOrder.get(left.id) ?? 99) - (recentOrder.get(right.id) ?? 99) ||
        left.name.localeCompare(right.name),
    );
  }, [preferences.recentProjectIds, projects]);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleProjects = sortedProjects.filter(
    (project) =>
      !normalizedQuery ||
      project.name.toLocaleLowerCase().includes(normalizedQuery) ||
      project.key.toLocaleLowerCase().includes(normalizedQuery),
  );

  const switchTo = (projectId: string) => {
    setOpen(false);
    setQuery('');
    navigate(projectPath(projectId, pageFromPath(location.pathname)));
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="unstyled"
            className="project-switcher-trigger"
            data-onboarding="project-switcher"
            aria-label={t('project.switcher.label', {
              project: currentProject?.name ?? t('project.none'),
            })}
          >
            <span className="brand-mark" aria-hidden="true">
              {currentProject?.key.slice(0, 2) ?? 'FT'}
            </span>
            <span className="project-switcher-copy">
              <strong title={currentProject?.name}>
                {currentProject?.name ?? t('project.none')}
              </strong>
              <small>
                ForceTrack{currentProject ? ` · ${currentProject.key}` : ''}
              </small>
            </span>
            <ChevronDown size={14} aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="project-switcher-menu"
          align="start"
          sideOffset={8}
        >
          <div className="project-menu-heading">
            {t('project.switcher.projects')}
          </div>
          {projects.length > 7 ? (
            <label className="project-search">
              <Search size={14} aria-hidden="true" />
              <span className="visually-hidden">
                {t('project.switcher.search')}
              </span>
              <Input
                value={query}
                placeholder={t('project.switcher.search')}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          ) : null}
          <div
            className="project-menu-list"
            role="listbox"
            aria-label={t('project.switcher.projects')}
            onKeyDown={(event) => {
              if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key))
                return;
              const options = Array.from(
                event.currentTarget.querySelectorAll<HTMLElement>(
                  '[role="option"]',
                ),
              );
              if (!options.length) return;
              event.preventDefault();
              const currentIndex = options.indexOf(
                document.activeElement as HTMLElement,
              );
              const targetIndex =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? options.length - 1
                    : event.key === 'ArrowDown'
                      ? (currentIndex + 1 + options.length) % options.length
                      : (currentIndex - 1 + options.length) % options.length;
              options[targetIndex]?.focus();
            }}
          >
            {visibleProjects.map((project) => (
              <MenuItem
                key={project.id}
                className="project-menu-item"
                leading={
                  project.id === currentProject?.id ? <Check size={14} /> : null
                }
                role="option"
                aria-selected={project.id === currentProject?.id}
                onClick={() => switchTo(project.id)}
              >
                <span>
                  <strong title={project.name}>{project.name}</strong>
                  <small>{project.key}</small>
                </span>
              </MenuItem>
            ))}
            {!visibleProjects.length ? (
              <p className="project-menu-empty">
                {t('project.switcher.noResults')}
              </p>
            ) : null}
          </div>
          <div className="project-menu-actions">
            <MenuItem
              leading={<FolderCog size={15} />}
              onClick={() => {
                setOpen(false);
                setManagementOpen(true);
              }}
            >
              {t('project.manage.action')}
            </MenuItem>
            <MenuItem
              leading={<Users size={15} />}
              disabled={!currentProject}
              onClick={() => {
                if (!currentProject) return;
                setOpen(false);
                setMemberManagementOpen(true);
              }}
            >
              {t('member.manage')}
            </MenuItem>
          </div>
        </PopoverContent>
      </Popover>
      <ProjectManagementDialog
        open={managementOpen}
        onOpenChange={setManagementOpen}
        onProjectSelected={(projectId) => {
          navigate(
            projectId
              ? projectPath(projectId, pageFromPath(location.pathname))
              : '/',
          );
        }}
      />
      <MemberManagementDialog
        open={memberManagementOpen}
        members={currentProject?.members ?? []}
        tasks={currentProject?.tasks ?? []}
        onOpenChange={setMemberManagementOpen}
        onAdd={addMember}
        onRemove={removeMember}
      />
    </>
  );
}
