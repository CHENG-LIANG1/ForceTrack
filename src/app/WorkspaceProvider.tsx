import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router';

import { ProjectContext } from '@/app/project-context';
import { TaskContext } from '@/app/task-context';
import { usePreferences } from '@/app/preferences-context';
import {
  completeSprintAction,
  createSprintAction,
  deleteSprintAction,
  moveTaskAction,
  rankBacklogTaskAction,
  startSprintAction,
  updateSprintAction,
  updateTaskAction,
  createTaskAction,
  type TaskAction,
} from '@/domain/actions';
import { createMember } from '@/domain/member';
import {
  type CreateProjectInput,
  type ProjectAggregate,
  type UpdateProjectInput,
  type WorkspaceSnapshotV3,
  projectToTaskSnapshot,
  validateProjectInput,
  ProjectValidationError,
} from '@/domain/project';
import type { MemberFields } from '@/domain/member';
import type { SprintFields, SprintStartFields } from '@/domain/sprint';
import { taskReducer } from '@/domain/task-reducer';
import {
  browserDomainDependencies,
  type CreateTaskInput,
  type DomainDependencies,
  type TaskStatus,
  type UpdateTaskInput,
} from '@/domain/task';
import { createEmptyProject, wrapLegacySnapshot } from '@/domain/workspace';
import { LocalWorkspaceRepository } from '@/infrastructure/local-workspace-repository';
import type {
  TaskRepository,
  WorkspaceLoadResult,
  WorkspaceRepository,
} from '@/infrastructure/repositories';
import { createBrowserSeedSnapshot } from '@/infrastructure/seed-data';

interface WorkspaceProviderProps extends PropsWithChildren {
  repository?: WorkspaceRepository;
  legacyTaskRepository?: TaskRepository;
  dependencies?: DomainDependencies;
}

const EMPTY_WORKSPACE: WorkspaceSnapshotV3 = { schemaVersion: 3, projects: [] };

/** Preserves existing component-test repositories while production moves to one V3 owner. */
class LegacyWorkspaceAdapter implements WorkspaceRepository {
  constructor(
    private readonly legacy: TaskRepository,
    private readonly now: () => string,
  ) {}

  async load(): Promise<WorkspaceLoadResult> {
    const result = await this.legacy.load();
    return {
      kind: result.kind,
      snapshot: wrapLegacySnapshot(result.snapshot, this.now()),
    };
  }

  async save(snapshot: WorkspaceSnapshotV3): Promise<void> {
    const firstProject = snapshot.projects[0];
    if (firstProject)
      await this.legacy.save(projectToTaskSnapshot(firstProject));
  }
}

function projectIdFromPath(pathname: string): string | null {
  return /^\/projects\/([^/]+)(?:\/|$)/.exec(pathname)?.[1] ?? null;
}

/** Owns all project aggregates so fast navigation can never redirect a queued write. */
export function WorkspaceProvider({
  children,
  repository: providedRepository,
  legacyTaskRepository,
  dependencies = browserDomainDependencies,
}: WorkspaceProviderProps) {
  const location = useLocation();
  const { preferences } = usePreferences();
  const repository = useMemo(
    () =>
      providedRepository ??
      (legacyTaskRepository
        ? new LegacyWorkspaceAdapter(legacyTaskRepository, dependencies.now)
        : new LocalWorkspaceRepository()),
    [dependencies.now, legacyTaskRepository, providedRepository],
  );
  const [workspace, setWorkspace] = useState(EMPTY_WORKSPACE);
  const workspaceRef = useRef(workspace);
  const saveQueueRef = useRef(Promise.resolve());
  const loadStartedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [loadWasRecovered, setLoadWasRecovered] = useState(false);
  const [persistenceFailed, setPersistenceFailed] = useState(false);

  useEffect(() => {
    if (loadStartedRef.current) return;
    loadStartedRef.current = true;
    void repository
      .load()
      .then((result) => {
        workspaceRef.current = result.snapshot;
        setWorkspace(result.snapshot);
        setLoadWasRecovered(result.kind === 'recovered');
      })
      .catch(() => {
        const fallback = wrapLegacySnapshot(
          createBrowserSeedSnapshot(),
          dependencies.now(),
        );
        workspaceRef.current = fallback;
        setWorkspace(fallback);
        setPersistenceFailed(true);
      })
      .finally(() => setIsReady(true));
  }, [dependencies, repository]);

  const persist = useCallback(
    async (nextWorkspace: WorkspaceSnapshotV3) => {
      workspaceRef.current = nextWorkspace;
      setWorkspace(nextWorkspace);
      const save = saveQueueRef.current
        .catch(() => undefined)
        .then(() => repository.save(nextWorkspace));
      saveQueueRef.current = save;
      try {
        await save;
        setPersistenceFailed(false);
      } catch {
        setPersistenceFailed(true);
      }
    },
    [repository],
  );

  const requestedProjectId = projectIdFromPath(location.pathname);
  const currentProject =
    workspace.projects.find((project) => project.id === requestedProjectId) ??
    workspace.projects.find(
      (project) => project.id === preferences.lastProjectId,
    ) ??
    workspace.projects[0] ??
    null;

  const commitProjectAction = useCallback(
    async (projectId: string, action: TaskAction) => {
      const currentWorkspace = workspaceRef.current;
      const project = currentWorkspace.projects.find(
        (item) => item.id === projectId,
      );
      if (!project) return;
      const nextPlanning = taskReducer(projectToTaskSnapshot(project), action);
      const {
        nextTaskNumber,
        tasks,
        members: planningMembers,
        sprints,
      } = nextPlanning;
      const nextProject: ProjectAggregate = {
        ...project,
        nextTaskNumber,
        tasks,
        sprints,
        members: planningMembers.map((member) => {
          const existing = project.members.find(
            (candidate) => candidate.id === member.id,
          );
          return (
            existing ?? {
              ...member,
              role: 'member' as const,
              status: 'joined' as const,
            }
          );
        }),
        updatedAt: dependencies.now(),
      };
      await persist({
        ...currentWorkspace,
        projects: currentWorkspace.projects.map((item) =>
          item.id === projectId ? nextProject : item,
        ),
      });
    },
    [dependencies, persist],
  );

  const requireCurrentProject = useCallback(() => {
    const project = workspaceRef.current.projects.find(
      (item) => item.id === (requestedProjectId ?? currentProject?.id),
    );
    if (!project) throw new Error('No current project');
    return project;
  }, [currentProject?.id, requestedProjectId]);

  const createProject = useCallback(
    async (input: CreateProjectInput) => {
      const issue = validateProjectInput(input);
      if (issue) throw new ProjectValidationError(issue);
      const project = createEmptyProject(
        input,
        dependencies,
        workspaceRef.current.projects,
      );
      await persist({
        schemaVersion: 3,
        projects: [...workspaceRef.current.projects, project],
      });
      return project;
    },
    [dependencies, persist],
  );

  /** Updates project metadata without rewriting the immutable key used by task IDs. */
  const updateProject = useCallback(
    async (projectId: string, input: UpdateProjectInput) => {
      const currentWorkspace = workspaceRef.current;
      const project = currentWorkspace.projects.find(
        (item) => item.id === projectId,
      );
      if (!project) throw new Error('project_not_found');
      const issue = validateProjectInput(input);
      if (issue) throw new ProjectValidationError(issue);
      const nextProject: ProjectAggregate = {
        ...project,
        name: input.name.trim(),
        description: input.description.trim(),
        updatedAt: dependencies.now(),
      };
      await persist({
        ...currentWorkspace,
        projects: currentWorkspace.projects.map((item) =>
          item.id === projectId ? nextProject : item,
        ),
      });
      return nextProject;
    },
    [dependencies, persist],
  );

  /** Removes one aggregate atomically and returns a safe project, or null for an empty workspace. */
  const deleteProject = useCallback(
    async (projectId: string) => {
      const currentWorkspace = workspaceRef.current;
      if (!currentWorkspace.projects.some((item) => item.id === projectId)) {
        throw new Error('project_not_found');
      }
      const remainingProjects = currentWorkspace.projects.filter(
        (item) => item.id !== projectId,
      );
      await persist({ ...currentWorkspace, projects: remainingProjects });
      return remainingProjects[0]?.id ?? null;
    },
    [persist],
  );

  const addMember = useCallback(
    async (fields: MemberFields) => {
      const project = requireCurrentProject();
      const member = createMember(fields, project.members, dependencies);
      await persist({
        ...workspaceRef.current,
        projects: workspaceRef.current.projects.map((item) =>
          item.id === project.id
            ? {
                ...item,
                members: [
                  ...item.members,
                  {
                    ...member,
                    role: 'member' as const,
                    status: 'joined' as const,
                  },
                ],
                updatedAt: dependencies.now(),
              }
            : item,
        ),
      });
    },
    [dependencies, persist, requireCurrentProject],
  );

  const removeMember = useCallback(
    async (memberId: string) => {
      const project = requireCurrentProject();
      const member = project.members.find((item) => item.id === memberId);
      if (!member) return;
      if (
        member.role === 'owner' &&
        project.members.filter((item) => item.role === 'owner').length === 1
      ) {
        throw new Error('last_owner');
      }
      if (
        project.tasks.some(
          (task) =>
            task.assigneeId === memberId || task.reporterId === memberId,
        )
      ) {
        throw new Error('member_has_tasks');
      }
      await persist({
        ...workspaceRef.current,
        projects: workspaceRef.current.projects.map((item) =>
          item.id === project.id
            ? {
                ...item,
                members: item.members.filter(
                  (candidate) => candidate.id !== memberId,
                ),
              }
            : item,
        ),
      });
    },
    [persist, requireCurrentProject],
  );

  const projectContextValue = useMemo(
    () => ({
      projects: workspace.projects,
      currentProject,
      isReady,
      createProject,
      updateProject,
      deleteProject,
      addMember,
      removeMember,
    }),
    [
      addMember,
      createProject,
      currentProject,
      deleteProject,
      isReady,
      removeMember,
      updateProject,
      workspace.projects,
    ],
  );

  const taskContextValue = useMemo(() => {
    const project = currentProject;
    const snapshot = project ? projectToTaskSnapshot(project) : null;
    const commit = async (action: TaskAction) => {
      if (project) await commitProjectAction(project.id, action);
    };
    return {
      snapshot,
      isReady,
      loadWasRecovered,
      persistenceFailed,
      createTask: async (input: CreateTaskInput) => {
        if (project)
          await commit(
            createTaskAction(
              projectToTaskSnapshot(project),
              input,
              dependencies,
              project.key,
            ),
          );
      },
      updateTask: async (taskId: string, input: UpdateTaskInput) => {
        if (!project) return;
        const action = updateTaskAction(
          projectToTaskSnapshot(project),
          taskId,
          input,
          dependencies,
        );
        if (action) await commit(action);
      },
      deleteTask: async (taskId: string) =>
        commit({ type: 'task/deleted', payload: { taskId } }),
      moveTask: async (taskId: string, status: TaskStatus, index: number) =>
        commit(moveTaskAction(taskId, status, index, dependencies)),
      rankBacklogTask: async (
        taskId: string,
        sprintId: string | null,
        index: number,
      ) => commit(rankBacklogTaskAction(taskId, sprintId, index, dependencies)),
      createSprint: async (fields: SprintFields) => {
        if (project)
          await commit(
            createSprintAction(
              projectToTaskSnapshot(project),
              fields,
              dependencies,
            ),
          );
      },
      updateSprint: async (sprintId: string, fields: SprintFields) => {
        if (!project) return;
        const action = updateSprintAction(
          projectToTaskSnapshot(project),
          sprintId,
          fields,
        );
        if (action) await commit(action);
      },
      startSprint: async (sprintId: string, fields: SprintStartFields) => {
        if (!project) return;
        const action = startSprintAction(
          projectToTaskSnapshot(project),
          sprintId,
          fields,
          dependencies,
        );
        if (action) await commit(action);
      },
      completeSprint: async (sprintId: string, target?: string | null) => {
        if (!project) return;
        const action = completeSprintAction(
          projectToTaskSnapshot(project),
          sprintId,
          target ?? null,
          dependencies,
        );
        if (action) await commit(action);
      },
      deleteSprint: async (sprintId: string, target?: string | null) => {
        if (!project) return;
        const action = deleteSprintAction(
          projectToTaskSnapshot(project),
          sprintId,
          target,
        );
        if (action) await commit(action);
      },
      createMember: addMember,
    };
  }, [
    addMember,
    commitProjectAction,
    currentProject,
    dependencies,
    isReady,
    loadWasRecovered,
    persistenceFailed,
  ]);

  return (
    <ProjectContext value={projectContextValue}>
      <TaskContext value={taskContextValue}>{children}</TaskContext>
    </ProjectContext>
  );
}
