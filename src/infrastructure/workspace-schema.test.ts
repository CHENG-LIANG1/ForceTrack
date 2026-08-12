import { wrapLegacySnapshot } from '@/domain/workspace';
import { workspaceSnapshotV3Schema } from '@/infrastructure/workspace-schema';
import { makeSnapshot } from '@/test/fixtures';

const NOW = '2026-08-12T00:00:00.000Z';

function validWorkspace() {
  return wrapLegacySnapshot(makeSnapshot(), NOW);
}

/** Exercises every project-level invariant that prevents cross-project data leakage. */
describe('workspaceSnapshotV3Schema', () => {
  it('accepts a fully linked workspace', () => {
    expect(workspaceSnapshotV3Schema.parse(validWorkspace())).toEqual(
      validWorkspace(),
    );
  });

  it.each([
    [
      'duplicate task identity',
      () => {
        const workspace = validWorkspace();
        workspace.projects[0].tasks[1].id = workspace.projects[0].tasks[0].id;
        return workspace;
      },
    ],
    [
      'task key from another project',
      () => {
        const workspace = validWorkspace();
        workspace.projects[0].tasks[0].key = 'GAME-1';
        return workspace;
      },
    ],
    [
      'stale next task number',
      () => {
        const workspace = validWorkspace();
        workspace.projects[0].nextTaskNumber = 2;
        return workspace;
      },
    ],
    [
      'pending assignee',
      () => {
        const workspace = validWorkspace();
        workspace.projects[0].members[0].status = 'pending';
        return workspace;
      },
    ],
    [
      'missing sprint reference',
      () => {
        const workspace = validWorkspace();
        workspace.projects[0].tasks[0].sprintId = 'missing';
        return workspace;
      },
    ],
    [
      'missing parent reference',
      () => {
        const workspace = validWorkspace();
        workspace.projects[0].tasks[0].parentId = 'missing';
        return workspace;
      },
    ],
    [
      'multiple active sprints',
      () => {
        const workspace = validWorkspace();
        workspace.projects[0].sprints.push({
          ...workspace.projects[0].sprints[0],
          id: 'sprint-2',
          name: 'Sprint 2',
          position: 1,
        });
        return workspace;
      },
    ],
    [
      'sprint position gap',
      () => {
        const workspace = validWorkspace();
        workspace.projects[0].sprints[0].position = 1;
        return workspace;
      },
    ],
    [
      'status position gap',
      () => {
        const workspace = validWorkspace();
        workspace.projects[0].tasks[0].position = 2;
        return workspace;
      },
    ],
    [
      'planning rank gap',
      () => {
        const workspace = validWorkspace();
        workspace.projects[0].tasks[0].rank = 2;
        return workspace;
      },
    ],
    [
      'invalid date range',
      () => {
        const workspace = validWorkspace();
        workspace.projects[0].tasks[0].startDate = '2026-08-20';
        workspace.projects[0].tasks[0].dueDate = '2026-08-19';
        return workspace;
      },
    ],
  ])('rejects %s', (_label, makeInvalid) => {
    expect(workspaceSnapshotV3Schema.safeParse(makeInvalid()).success).toBe(
      false,
    );
  });

  it('rejects duplicate project IDs and keys', () => {
    const duplicateId = validWorkspace();
    duplicateId.projects.push({
      ...duplicateId.projects[0],
      key: 'GAME',
      tasks: [],
      nextTaskNumber: 1,
    });
    expect(workspaceSnapshotV3Schema.safeParse(duplicateId).success).toBe(
      false,
    );

    const duplicateKey = validWorkspace();
    duplicateKey.projects.push({
      ...duplicateKey.projects[0],
      id: 'project-game',
      tasks: [],
      nextTaskNumber: 1,
    });
    expect(workspaceSnapshotV3Schema.safeParse(duplicateKey).success).toBe(
      false,
    );
  });
});
