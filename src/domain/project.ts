import type { Member } from '@/domain/member';
import type { Sprint } from '@/domain/sprint';
import type { Task, TaskSnapshotV2 } from '@/domain/task';

export const PROJECT_KEY_PATTERN = /^[A-Z][A-Z0-9]{1,9}$/;
export const DEFAULT_PROJECT_ID = 'project-forcetrack';
export const DEFAULT_PROJECT_KEY = 'FT';

export type ProjectMemberRole = 'owner' | 'member';
export type ProjectMemberStatus = 'joined' | 'pending';

export interface ProjectMember extends Member {
  role: ProjectMemberRole;
  status: ProjectMemberStatus;
}

export interface ProjectAggregate {
  id: string;
  key: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  nextTaskNumber: number;
  tasks: Task[];
  members: ProjectMember[];
  sprints: Sprint[];
}

export interface WorkspaceSnapshotV3 {
  schemaVersion: 3;
  projects: ProjectAggregate[];
}

export interface CreateProjectInput {
  name: string;
  description: string;
}

export type UpdateProjectInput = CreateProjectInput;

export type ProjectValidationIssue =
  'name_required' | 'name_too_long' | 'description_too_long';

export class ProjectValidationError extends Error {
  constructor(readonly issue: ProjectValidationIssue) {
    super(`Invalid project: ${issue}`);
    this.name = 'ProjectValidationError';
  }
}

export interface ProjectIdentity {
  id: string;
  key: string;
}

/** Derives collision-safe project and task identities from the creation timestamp. */
export function createTimestampProjectIdentity(
  timestamp: string,
  projects: readonly ProjectAggregate[],
): ProjectIdentity {
  const parsedTimestamp = Date.parse(timestamp);
  if (!Number.isFinite(parsedTimestamp)) {
    throw new Error('Invalid project timestamp');
  }
  let candidate = parsedTimestamp;
  while (true) {
    const identity = {
      id: `project-${candidate}`,
      key: `P${candidate.toString(36).toUpperCase().slice(-9)}`,
    };
    if (
      !projects.some(
        (project) => project.id === identity.id || project.key === identity.key,
      )
    ) {
      return identity;
    }
    candidate += 1;
  }
}

export function validateProjectInput(
  input: CreateProjectInput,
): ProjectValidationIssue | null {
  const name = input.name.trim();
  if (!name) return 'name_required';
  if (name.length > 80) return 'name_too_long';
  if (input.description.length > 500) return 'description_too_long';
  return null;
}

/** Exposes the current aggregate through the unchanged planning-page contract. */
export function projectToTaskSnapshot(
  project: ProjectAggregate,
): TaskSnapshotV2 {
  return {
    schemaVersion: 2,
    nextTaskNumber: project.nextTaskNumber,
    tasks: project.tasks,
    members: project.members.filter((member) => member.status === 'joined'),
    sprints: project.sprints,
  };
}
