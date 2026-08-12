import {
  createTimestampProjectIdentity,
  projectToTaskSnapshot,
  validateProjectInput,
} from '@/domain/project';
import { wrapLegacySnapshot } from '@/domain/workspace';
import { makeSnapshot } from '@/test/fixtures';

describe('project rules', () => {
  it('derives collision-safe IDs and task keys from the timestamp', () => {
    const timestamp = '2026-08-12T00:00:00.000Z';
    const first = createTimestampProjectIdentity(timestamp, []);
    const existing = wrapLegacySnapshot(makeSnapshot(), timestamp).projects[0];
    existing.id = first.id;
    existing.key = first.key;
    const second = createTimestampProjectIdentity(timestamp, [existing]);

    expect(first).toEqual({
      id: `project-${Date.parse(timestamp)}`,
      key: `P${Date.parse(timestamp).toString(36).toUpperCase()}`,
    });
    expect(second).toEqual({
      id: `project-${Date.parse(timestamp) + 1}`,
      key: `P${(Date.parse(timestamp) + 1).toString(36).toUpperCase()}`,
    });
  });

  it.each([
    ['name_required', { name: ' ', description: '' }],
    ['name_too_long', { name: 'x'.repeat(81), description: '' }],
    ['description_too_long', { name: 'Game', description: 'x'.repeat(501) }],
  ] as const)('reports %s', (issue, input) => {
    expect(validateProjectInput(input)).toBe(issue);
  });

  it('only exposes joined members to planning views', () => {
    const project = wrapLegacySnapshot(makeSnapshot(), '2026-08-12T00:00:00Z')
      .projects[0];
    project.members[1].status = 'pending';

    expect(projectToTaskSnapshot(project).members).toEqual([
      expect.objectContaining({ id: project.members[0].id }),
    ]);
  });
});
