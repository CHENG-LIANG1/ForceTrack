import { z } from 'zod';

import {
  SUPPORTED_LOCALES,
  THEME_PREFERENCES,
  type Member,
  type UserPreferences,
} from '@/domain/member';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  isCalendarDate,
  type Task,
  type TaskSnapshotV1,
  type TaskStatus,
} from '@/domain/task';

const nullableCalendarDateSchema = z
  .string()
  .refine(isCalendarDate, 'Expected a valid YYYY-MM-DD calendar date')
  .nullable();

export const memberSchema: z.ZodType<Member> = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    avatar: z.string().min(1).optional(),
  })
  .strict();

export const taskSchema: z.ZodType<Task> = z
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
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict()
  .superRefine((task, context) => {
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
  });

export const taskSnapshotV1Schema: z.ZodType<TaskSnapshotV1> = z
  .object({
    schemaVersion: z.literal(1),
    nextTaskNumber: z.number().int().positive(),
    tasks: z.array(taskSchema),
    members: z.array(memberSchema),
  })
  .strict()
  .superRefine((snapshot, context) => {
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
        context.addIssue({
          code: 'custom',
          path: ['tasks', index, 'assigneeId'],
          message: 'Assignee must reference an existing member',
        });
      }
    });

    for (const status of TASK_STATUSES) {
      const positions = snapshot.tasks
        .filter((task) => task.status === status)
        .map((task) => task.position)
        .sort((left, right) => left - right);
      if (positions.some((position, index) => position !== index)) {
        context.addIssue({
          code: 'custom',
          path: ['tasks'],
          message: `Positions for ${status satisfies TaskStatus} must be contiguous`,
        });
      }
    }

    const highestTaskNumber = snapshot.tasks.reduce((highest, task) => {
      const parsed = Number(task.key.slice(3));
      return Math.max(highest, parsed);
    }, 0);
    if (snapshot.nextTaskNumber <= highestTaskNumber) {
      context.addIssue({
        code: 'custom',
        path: ['nextTaskNumber'],
        message: 'Next task number must be greater than existing task keys',
      });
    }
  });

export const userPreferencesSchema: z.ZodType<UserPreferences> = z
  .object({
    locale: z.enum(SUPPORTED_LOCALES),
    theme: z.enum(THEME_PREFERENCES),
  })
  .strict();

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
