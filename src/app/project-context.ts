import { createContext, useContext } from 'react';

import type {
  CreateProjectInput,
  ProjectAggregate,
  UpdateProjectInput,
} from '@/domain/project';
import type { MemberFields } from '@/domain/member';

export interface ProjectContextValue {
  projects: readonly ProjectAggregate[];
  currentProject: ProjectAggregate | null;
  isReady: boolean;
  createProject(input: CreateProjectInput): Promise<ProjectAggregate>;
  updateProject(
    projectId: string,
    input: UpdateProjectInput,
  ): Promise<ProjectAggregate>;
  deleteProject(projectId: string): Promise<string | null>;
  addMember(fields: MemberFields): Promise<void>;
  removeMember(memberId: string): Promise<void>;
}

export const ProjectContext = createContext<ProjectContextValue | null>(null);

/** Keeps project navigation concerns separate from the existing planning-page API. */
export function useProjects(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (!context)
    throw new Error('useProjects must be rendered inside WorkspaceProvider');
  return context;
}
