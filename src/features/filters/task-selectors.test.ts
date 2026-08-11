import { selectFilteredTasks } from '@/features/filters/task-selectors';
import { makeTask } from '@/test/fixtures';

describe('shared task filters', () => {
  const tasks = [
    makeTask({
      id: 'epic',
      key: 'FT-1',
      title: 'Payments Epic',
      workType: 'epic',
      priority: 'high',
      assigneeId: 'member-1',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    }),
    makeTask({
      id: 'bug',
      key: 'FT-2',
      title: 'Fix checkout',
      workType: 'bug',
      status: 'in_progress',
      priority: 'high',
      assigneeId: null,
      parentId: 'epic',
      position: 0,
      rank: 1,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-10T00:00:00.000Z',
      dueDate: '2026-08-15',
    }),
  ];

  it('matches title or key case-insensitively', () => {
    expect(
      selectFilteredTasks(tasks, { query: 'ft-2' }).map((task) => task.id),
    ).toEqual(['bug']);
    expect(
      selectFilteredTasks(tasks, { query: 'PAYMENTS' }).map((task) => task.id),
    ).toEqual(['epic']);
  });

  it('uses OR within dimensions and AND across dimensions, including unassigned and parent', () => {
    expect(
      selectFilteredTasks(tasks, {
        assigneeIds: ['unassigned', 'member-2'],
        workTypes: ['bug', 'story'],
        statuses: ['todo', 'in_progress'],
        priorities: ['high'],
        parentIds: ['epic'],
      }).map((task) => task.id),
    ).toEqual(['bug']);
  });

  it('matches a date range when created, updated, or due date is in range without mutating input', () => {
    const before = structuredClone(tasks);
    const result = selectFilteredTasks(tasks, {
      dateFrom: '2026-08-09',
      dateTo: '2026-08-11',
    });
    expect(result.map((task) => task.id)).toEqual(['bug']);
    expect(tasks).toEqual(before);
    expect(result).not.toBe(tasks);
  });
});
