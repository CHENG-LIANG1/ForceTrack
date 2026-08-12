import { z } from 'zod';

import {
  SUPPORTED_LOCALES,
  THEME_PREFERENCES,
  type Member,
  type MemberV1,
  type UserPreferences,
} from '@/domain/member';
import { SPRINT_STATUSES, type Sprint } from '@/domain/sprint';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  isCalendarDate,
  type Task,
  type TaskSnapshotV1,
  type TaskSnapshotV2,
  type TaskStatus,
  type TaskV1,
} from '@/domain/task';

const nullableCalendarDateSchema = z
  .string()
  .refine(isCalendarDate, 'Expected a valid YYYY-MM-DD calendar date')
  .nullable();
const timestampSchema = z.iso.datetime({ offset: true });

export const memberV1Schema: z.ZodType<MemberV1> = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1),
    avatar: z.string().min(1).optional(),
  })
  .strict();

export const memberSchema: z.ZodType<Member> = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1).max(80),
    email: z.email(),
    avatar: z.string().min(1).optional(),
    createdAt: timestampSchema,
  })
  .strict();

const taskV1BaseSchema: z.ZodType<TaskV1> = z
  .object({
    id: z.string().min(1),
    key: z.string().regex(/^FT-[1-9]\d*$/),
    title: z.string().trim().min(1).max(100),
    description: z.string().max(2_000),
    status: z.enum(TASK_STATUSES),
    priority: z.enum(TASK_PRIORITIES),
    assigneeId: z.string().min(1).nullable(),
    startDate: nullableCalendarDateSchema,
    dueDate: nullableCalendarDateSchema,
    position: z.number().int().nonnegative(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()
  .superRefine(addTaskDateIssue);

export const taskSchema: z.ZodType<Task> = z
  .object({
    id: z.string().min(1),
    key: z.string().regex(/^FT-[1-9]\d*$/),
    title: z.string().trim().min(1).max(100),
    description: z.string().max(2_000),
    workType: z.enum(TASK_TYPES),
    status: z.enum(TASK_STATUSES),
    priority: z.enum(TASK_PRIORITIES),
    assigneeId: z.string().min(1).nullable(),
    reporterId: z.string().min(1).nullable(),
    parentId: z.string().min(1).nullable(),
    labels: z.array(z.string().trim().min(1).max(50)).max(10),
    sprintId: z.string().min(1).nullable(),
    storyPoints: z.number().int().min(0).max(100).nullable(),
    startDate: nullableCalendarDateSchema,
    dueDate: nullableCalendarDateSchema,
    position: z.number().int().nonnegative(),
    rank: z.number().int().nonnegative(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()
  .superRefine(addTaskDateIssue);

export const sprintSchema: z.ZodType<Sprint> = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1).max(80),
    goal: z.string().max(500),
    startDate: nullableCalendarDateSchema,
    endDate: nullableCalendarDateSchema,
    status: z.enum(SPRINT_STATUSES),
    position: z.number().int().nonnegative(),
    createdAt: timestampSchema,
    startedAt: timestampSchema.nullable(),
    completedAt: timestampSchema.nullable(),
  })
  .strict()
  .superRefine((sprint, context) => {
    if (
      sprint.startDate !== null &&
      sprint.endDate !== null &&
      sprint.endDate < sprint.startDate
    ) {
      context.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'Sprint end date must not precede start date',
      });
    }
    if (
      sprint.status !== 'planned' &&
      (sprint.startDate === null ||
        sprint.endDate === null ||
        sprint.startedAt === null)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['status'],
        message: 'Started sprints require dates and startedAt',
      });
    }
    if ((sprint.status === 'completed') !== (sprint.completedAt !== null)) {
      context.addIssue({
        code: 'custom',
        path: ['completedAt'],
        message: 'Only completed sprints require completedAt',
      });
    }
  });

export const taskSnapshotV1Schema: z.ZodType<TaskSnapshotV1> = z
  .object({
    schemaVersion: z.literal(1),
    nextTaskNumber: z.number().int().positive(),
    tasks: z.array(taskV1BaseSchema),
    members: z.array(memberV1Schema),
  })
  .strict()
  .superRefine((snapshot, context) => {
    addBaseSnapshotIssues(snapshot, context);
    addBoardPositionIssues(snapshot.tasks, context);
  });

export const taskSnapshotV2Schema: z.ZodType<TaskSnapshotV2> = z
  .object({
    schemaVersion: z.literal(2),
    nextTaskNumber: z.number().int().positive(),
    tasks: z.array(taskSchema),
    members: z.array(memberSchema),
    sprints: z.array(sprintSchema),
  })
  .strict()
  .superRefine((snapshot, context) => {
    addBaseSnapshotIssues(snapshot, context);
    addBoardPositionIssues(snapshot.tasks, context);
    addDuplicateIssues(
      snapshot.sprints.map((sprint) => sprint.id),
      ['sprints'],
      'Sprint IDs must be unique',
      context,
    );
    addDuplicateIssues(
      snapshot.members.map((member) => member.email.toLocaleLowerCase()),
      ['members'],
      'Member emails must be unique ignoring case',
      context,
    );

    const sprintIds = new Set(snapshot.sprints.map((sprint) => sprint.id));
    const memberIds = new Set(snapshot.members.map((member) => member.id));
    snapshot.tasks.forEach((task, index) => {
      if (task.assigneeId !== null && !memberIds.has(task.assigneeId)) {
        addReferenceIssue(context, ['tasks', index, 'assigneeId'], 'Assignee');
      }
      if (task.reporterId !== null && !memberIds.has(task.reporterId)) {
        addReferenceIssue(context, ['tasks', index, 'reporterId'], 'Reporter');
      }
      if (task.sprintId !== null && !sprintIds.has(task.sprintId)) {
        addReferenceIssue(context, ['tasks', index, 'sprintId'], 'Sprint');
      }
      if (task.parentId !== null) {
        const parent = snapshot.tasks.find(
          (candidate) => candidate.id === task.parentId,
        );
        if (!parent || parent.workType !== 'epic' || parent.id === task.id) {
          context.addIssue({
            code: 'custom',
            path: ['tasks', index, 'parentId'],
            message: 'Parent must reference another epic',
          });
        }
      }
    });

    if (
      snapshot.sprints.filter((sprint) => sprint.status === 'active').length > 1
    ) {
      context.addIssue({
        code: 'custom',
        path: ['sprints'],
        message: 'Only one sprint may be active',
      });
    }
    addContiguousIssues(
      snapshot.sprints.map((sprint) => sprint.position),
      ['sprints'],
      'Sprint positions must be contiguous',
      context,
    );

    const planningSectionIds = new Set(
      snapshot.tasks.map((task) => task.sprintId),
    );
    for (const sprintId of planningSectionIds) {
      addContiguousIssues(
        snapshot.tasks
          .filter((task) => task.sprintId === sprintId)
          .map((task) => task.rank),
        ['tasks'],
        'Task ranks must be contiguous within each planning section',
        context,
      );
    }
  });

export const userPreferencesSchema: z.ZodType<UserPreferences> = z
  .object({
    locale: z.enum(SUPPORTED_LOCALES),
    theme: z.enum(THEME_PREFERENCES),
    lastProjectId: z.string().min(1).nullable(),
    recentProjectIds: z.array(z.string().min(1)).max(5),
  })
  .strict();

/** The previous preference shape remains a read-only migration input. */
export const userPreferencesV1Schema = z
  .object({
    locale: z.enum(SUPPORTED_LOCALES),
    theme: z.enum(['light', 'dark']),
  })
  .strict();

function addTaskDateIssue(
  task: { startDate: string | null; dueDate: string | null },
  context: z.core.$RefinementCtx<unknown>,
): void {
  if (
    task.startDate !== null &&
    task.dueDate !== null &&
    task.dueDate < task.startDate
  ) {
    context.addIssue({
      code: 'custom',
      path: ['dueDate'],
      message: 'Due date must not precede start date',
    });
  }
}

function addBaseSnapshotIssues(
  snapshot: {
    nextTaskNumber: number;
    tasks: readonly TaskV1[];
    members: readonly MemberV1[];
  },
  context: z.core.$RefinementCtx<unknown>,
): void {
  addDuplicateIssues(
    snapshot.tasks.map((task) => task.id),
    ['tasks'],
    'Task IDs must be unique',
    context,
  );
  addDuplicateIssues(
    snapshot.tasks.map((task) => task.key),
    ['tasks'],
    'Task keys must be unique',
    context,
  );
  addDuplicateIssues(
    snapshot.members.map((member) => member.id),
    ['members'],
    'Member IDs must be unique',
    context,
  );
  const memberIds = new Set(snapshot.members.map((member) => member.id));
  snapshot.tasks.forEach((task, index) => {
    if (task.assigneeId !== null && !memberIds.has(task.assigneeId)) {
      addReferenceIssue(context, ['tasks', index, 'assigneeId'], 'Assignee');
    }
  });
  const highestTaskNumber = snapshot.tasks.reduce(
    (highest, task) => Math.max(highest, Number(task.key.slice(3))),
    0,
  );
  if (snapshot.nextTaskNumber <= highestTaskNumber) {
    context.addIssue({
      code: 'custom',
      path: ['nextTaskNumber'],
      message: 'Next task number must be greater than existing task keys',
    });
  }
}

function addBoardPositionIssues(
  tasks: readonly Pick<TaskV1, 'status' | 'position'>[],
  context: z.core.$RefinementCtx<unknown>,
): void {
  for (const status of TASK_STATUSES) {
    addContiguousIssues(
      tasks
        .filter((task) => task.status === status)
        .map((task) => task.position),
      ['tasks'],
      `Positions for ${status satisfies TaskStatus} must be contiguous`,
      context,
    );
  }
}

function addReferenceIssue(
  context: z.core.$RefinementCtx<unknown>,
  path: PropertyKey[],
  label: string,
): void {
  context.addIssue({
    code: 'custom',
    path,
    message: `${label} must reference an existing entity`,
  });
}

function addContiguousIssues(
  values: readonly number[],
  path: PropertyKey[],
  message: string,
  context: z.core.$RefinementCtx<unknown>,
): void {
  const sorted = [...values].sort((left, right) => left - right);
  if (sorted.some((value, index) => value !== index)) {
    context.addIssue({ code: 'custom', path, message });
  }
}

function addDuplicateIssues(
  values: readonly string[],
  path: PropertyKey[],
  message: string,
  context: z.core.$RefinementCtx<unknown>,
): void {
  if (new Set(values).size !== values.length) {
    context.addIssue({ code: 'custom', path, message });
  }
}
