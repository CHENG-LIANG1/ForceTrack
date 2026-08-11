import { useRef, useState } from 'react';

import { ACTIVE_SPRINT_ID, type TaskStatus } from '@/domain/task';

export interface TaskEditorState {
  open: boolean;
  taskId: string | null;
  createStatus: TaskStatus;
  createSprintId: string | null;
}

const INITIAL_EDITOR: TaskEditorState = {
  open: false,
  taskId: null,
  createStatus: 'todo',
  createSprintId: ACTIVE_SPRINT_ID,
};

/** Keeps dialog entry-point defaults and focus restoration consistent across views. */
export function useTaskEditor() {
  const [editor, setEditor] = useState<TaskEditorState>(INITIAL_EDITOR);
  const triggerRef = useRef<HTMLElement | null>(null);

  const openCreate = (
    trigger: HTMLElement,
    status: TaskStatus = 'todo',
    sprintId: string | null = ACTIVE_SPRINT_ID,
  ) => {
    triggerRef.current = trigger;
    setEditor({
      open: true,
      taskId: null,
      createStatus: status,
      createSprintId: sprintId,
    });
  };

  const openTask = (taskId: string, trigger: HTMLElement) => {
    triggerRef.current = trigger;
    setEditor((current) => ({ ...current, open: true, taskId }));
  };

  return { editor, setEditor, triggerRef, openCreate, openTask };
}
