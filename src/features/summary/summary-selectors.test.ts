import { selectSummaryData } from '@/features/summary/summary-selectors';
import { makeSnapshot, makeTask } from '@/test/fixtures';

describe('summary selectors', () => {
  const now = new Date('2026-08-12T12:00:00.000Z');
  const tasks = [
    makeTask({
      id: 'epic',
      key: 'FT-1',
      title: 'Checkout epic',
      workType: 'epic',
      assigneeId: 'member-1',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
      rank: 0,
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
      createdAt: '2026-08-05T12:00:00.000Z',
      updatedAt: '2026-08-12T11:00:00.000Z',
      dueDate: '2026-08-19',
    }),
    makeTask({
      id: 'recent-done',
      key: 'FT-3',
      workType: 'story',
      status: 'done',
      parentId: 'epic',
      position: 0,
      rank: 2,
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-08-06T00:00:00.000Z',
    }),
    makeTask({
      id: 'old-done',
      key: 'FT-4',
      workType: 'task',
      status: 'done',
      parentId: 'epic',
      position: 1,
      rank: 3,
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-20T00:00:00.000Z',
    }),
  ];

  it('calculates all time windows and aggregation families from one task set', () => {
    const snapshot = makeSnapshot({ nextTaskNumber: 5, tasks });
    const before = structuredClone(snapshot);
    const data = selectSummaryData(snapshot, {}, now);

    expect(data.overview).toEqual({
      created: 1,
      updated: 2,
      completed: 1,
      dueSoon: 1,
    });
    expect(data.status.todo.count).toBe(1);
    expect(data.status.in_progress.count).toBe(1);
    expect(data.status.done.count).toBe(1);
    expect(data.priorities.high.count).toBe(1);
    expect(data.workTypes.epic.count).toBe(1);
    expect(data.recentActivity[0].id).toBe('bug');
    expect(
      data.workload.find((entry) => entry.assigneeId === null)?.count,
    ).toBe(1);
    expect(data.epicProgress[0]).toMatchObject({
      epic: { id: 'epic' },
      total: 3,
      byStatus: { in_progress: 1, done: 2 },
    });
    expect(snapshot).toEqual(before);
  });

  it('applies OR within dimensions and AND across dimensions to every module', () => {
    const data = selectSummaryData(
      makeSnapshot({ nextTaskNumber: 5, tasks }),
      {
        assigneeIds: ['unassigned'],
        workTypes: ['bug', 'story'],
        statuses: ['in_progress', 'done'],
        priorities: ['high'],
        parentIds: ['epic'],
      },
      now,
    );

    expect(data.tasks.map((task) => task.id)).toEqual(['bug']);
    expect(data.overview.updated).toBe(1);
    expect(data.status.in_progress.count).toBe(1);
    expect(data.priorities.high.count).toBe(1);
    expect(data.workTypes.bug.count).toBe(1);
    expect(data.recentActivity.map((task) => task.id)).toEqual(['bug']);
    expect(
      data.workload.find((entry) => entry.assigneeId === null)?.count,
    ).toBe(1);
    expect(data.epicProgress).toEqual([]);
  });

  it('returns zero percentages for an empty result', () => {
    const data = selectSummaryData(
      makeSnapshot({ tasks: [], nextTaskNumber: 1 }),
      {},
      now,
    );
    expect(data.status.done.percent).toBe(0);
    expect(data.priorities.high.percent).toBe(0);
    expect(data.workTypes.epic.percent).toBe(0);
    expect(data.recentActivity).toEqual([]);
  });
});
