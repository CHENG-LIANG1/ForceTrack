import { z } from 'zod';

import {
  PROJECT_KEY_PATTERN,
  type ProjectAggregate,
  type ProjectMember,
  type WorkspaceSnapshotV3,
} from '@/domain/project';
import { SPRINT_STATUSES, type Sprint } from '@/domain/sprint';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  isCalendarDate,
  type Task,
} from '@/domain/task';

const timestampSchema = z.iso.datetime({ offset: true });
const nullableCalendarDateSchema = z
  .string()
  .refine(isCalendarDate, 'Expected a valid YYYY-MM-DD calendar date')
  .nullable();

const projectMemberSchema: z.ZodType<ProjectMember> = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1).max(80),
    email: z.email(),
    avatar: z.string().min(1).optional(),
    createdAt: timestampSchema,
    role: z.enum(['owner', 'member']),
    status: z.enum(['joined', 'pending']),
  })
  .strict();

const workspaceTaskSchema: z.ZodType<Task> = z
  .object({
    id: z.string().min(1),
    key: z.string().regex(/^[A-Z][A-Z0-9]{1,9}-[1-9]\d*$/),
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
  .superRefine((task, context) => {
    if (task.startDate && task.dueDate && task.dueDate < task.startDate) {
      context.addIssue({
        code: 'custom',
        path: ['dueDate'],
        message: 'Due date must not precede start date',
      });
    }
  });

const workspaceSprintSchema: z.ZodType<Sprint> = z
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
  .strict();

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

function isContiguous(values: readonly number[]): boolean {
  return [...values]
    .sort((a, b) => a - b)
    .every((value, index) => value === index);
}

const projectAggregateSchema: z.ZodType<ProjectAggregate> = z
  .object({
    id: z.string().min(1),
    key: z.string().regex(PROJECT_KEY_PATTERN),
    name: z.string().trim().min(1).max(80),
    description: z.string().max(500),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
    nextTaskNumber: z.number().int().positive(),
    tasks: z.array(workspaceTaskSchema),
    members: z.array(projectMemberSchema),
    sprints: z.array(workspaceSprintSchema),
  })
  .strict()
  .superRefine((project, context) => {
    const taskIds = project.tasks.map((task) => task.id);
    const taskKeys = project.tasks.map((task) => task.key);
    const memberIds = project.members.map((member) => member.id);
    const sprintIds = project.sprints.map((sprint) => sprint.id);
    const duplicateSets = [taskIds, taskKeys, memberIds, sprintIds];
    if (duplicateSets.some(hasDuplicates)) {
      context.addIssue({
        code: 'custom',
        message: 'Project entity IDs and task keys must be unique',
      });
    }
    if (project.tasks.some((task) => !task.key.startsWith(`${project.key}-`))) {
      context.addIssue({
        code: 'custom',
        path: ['tasks'],
        message: 'Task keys must match the project key',
      });
    }
    const highestTaskNumber = project.tasks.reduce((highest, task) => {
      const match = /-(\d+)$/.exec(task.key);
      return Math.max(highest, match ? Number(match[1]) : 0);
    }, 0);
    if (project.nextTaskNumber <= highestTaskNumber) {
      context.addIssue({
        code: 'custom',
        path: ['nextTaskNumber'],
        message: 'Next task number must exceed existing keys',
      });
    }
    const memberIdSet = new Set(
      project.members
        .filter((member) => member.status === 'joined')
        .map((member) => member.id),
    );
    const sprintIdSet = new Set(sprintIds);
    const taskIdSet = new Set(taskIds);
    project.tasks.forEach((task, index) => {
      const invalidMember =
        (task.assigneeId !== null && !memberIdSet.has(task.assigneeId)) ||
        (task.reporterId !== null && !memberIdSet.has(task.reporterId));
      const invalidSprint =
        task.sprintId !== null && !sprintIdSet.has(task.sprintId);
      const invalidParent =
        task.parentId !== null && !taskIdSet.has(task.parentId);
      if (invalidMember || invalidSprint || invalidParent) {
        context.addIssue({
          code: 'custom',
          path: ['tasks', index],
          message: 'Task references must stay inside the project',
        });
      }
    });
    if (
      project.sprints.filter((sprint) => sprint.status === 'active').length > 1
    ) {
      context.addIssue({
        code: 'custom',
        path: ['sprints'],
        message: 'Only one sprint may be active',
      });
    }
    if (!isContiguous(project.sprints.map((sprint) => sprint.position))) {
      context.addIssue({
        code: 'custom',
        path: ['sprints'],
        message: 'Sprint positions must be contiguous',
      });
    }
    for (const status of TASK_STATUSES) {
      if (
        !isContiguous(
          project.tasks
            .filter((task) => task.status === status)
            .map((task) => task.position),
        )
      ) {
        context.addIssue({
          code: 'custom',
          path: ['tasks'],
          message: `Positions for ${status} must be contiguous`,
        });
      }
    }
    for (const sprintId of new Set(
      project.tasks.map((task) => task.sprintId),
    )) {
      if (
        !isContiguous(
          project.tasks
            .filter((task) => task.sprintId === sprintId)
            .map((task) => task.rank),
        )
      ) {
        context.addIssue({
          code: 'custom',
          path: ['tasks'],
          message: 'Task ranks must be contiguous per planning section',
        });
      }
    }
  });

/** V3 validates project-specific task keys without changing the frozen V2 schema. */
export const workspaceSnapshotV3Schema: z.ZodType<WorkspaceSnapshotV3> = z
  .object({
    schemaVersion: z.literal(3),
    projects: z.array(projectAggregateSchema),
  })
  .strict()
  .superRefine((workspace, context) => {
    if (hasDuplicates(workspace.projects.map((project) => project.id))) {
      context.addIssue({
        code: 'custom',
        path: ['projects'],
        message: 'Project IDs must be unique',
      });
    }
    if (
      hasDuplicates(
        workspace.projects.map((project) => project.key.toUpperCase()),
      )
    ) {
      context.addIssue({
        code: 'custom',
        path: ['projects'],
        message: 'Project keys must be unique ignoring case',
      });
    }
  });
