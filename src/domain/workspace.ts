import {
  DEFAULT_PROJECT_ID,
  DEFAULT_PROJECT_KEY,
  type CreateProjectInput,
  type ProjectAggregate,
  type ProjectMember,
  type WorkspaceSnapshotV3,
  createTimestampProjectIdentity,
} from '@/domain/project';
import type { DomainDependencies, TaskSnapshotV2 } from '@/domain/task';

/** Wraps immutable V2 planning data without weakening the legacy storage contract. */
export function wrapLegacySnapshot(
  snapshot: TaskSnapshotV2,
  now: string,
): WorkspaceSnapshotV3 {
  const members: ProjectMember[] = snapshot.members.map((member, index) => ({
    ...member,
    role: index === 0 ? 'owner' : 'member',
    status: 'joined',
  }));
  return {
    schemaVersion: 3,
    projects: [
      {
        id: DEFAULT_PROJECT_ID,
        key: DEFAULT_PROJECT_KEY,
        name: 'ForceTrack',
        description: '',
        createdAt: now,
        updatedAt: now,
        nextTaskNumber: snapshot.nextTaskNumber,
        tasks: snapshot.tasks.map((task) => ({ ...task })),
        members,
        sprints: snapshot.sprints.map((sprint) => ({ ...sprint })),
      },
    ],
  };
}

export function createEmptyProject(
  input: CreateProjectInput,
  dependencies: DomainDependencies,
  projects: readonly ProjectAggregate[] = [],
): ProjectAggregate {
  const timestamp = dependencies.now();
  const identity = createTimestampProjectIdentity(timestamp, projects);
  return {
    ...identity,
    name: input.name.trim(),
    description: input.description.trim(),
    createdAt: timestamp,
    updatedAt: timestamp,
    nextTaskNumber: 1,
    tasks: [],
    members: [
      {
        id: `local-owner-${dependencies.createId()}`,
        name: 'Local user',
        email: 'local@forcetrack.app',
        role: 'owner',
        status: 'joined',
        createdAt: timestamp,
      },
    ],
    sprints: [],
  };
}
