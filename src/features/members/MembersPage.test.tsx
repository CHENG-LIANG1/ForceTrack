import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';

import {
  ProjectContext,
  type ProjectContextValue,
} from '@/app/project-context';
import { wrapLegacySnapshot } from '@/domain/workspace';
import { MembersPage } from '@/features/members/MembersPage';
import { createI18n } from '@/i18n';
import { makeSnapshot } from '@/test/fixtures';

function renderMembers(
  overrides: Partial<ProjectContextValue> = {},
): ProjectContextValue {
  const currentProject = wrapLegacySnapshot(
    makeSnapshot({ tasks: [] }),
    '2026-08-12T00:00:00.000Z',
  ).projects[0];
  const value: ProjectContextValue = {
    projects: [currentProject],
    currentProject,
    isReady: true,
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(
    <I18nextProvider i18n={createI18n('en-US')}>
      <ProjectContext value={value}>
        <MembersPage />
      </ProjectContext>
    </I18nextProvider>,
  );
  return value;
}

describe('MembersPage', () => {
  it('explains guarded removals and confirms an allowed removal', async () => {
    const user = userEvent.setup();
    const context = renderMembers();

    await user.click(screen.getByRole('button', { name: 'Remove Ada' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'A project must keep at least one owner.',
    );

    await user.click(screen.getByRole('button', { name: 'Remove Lin' }));
    let confirmation = screen.getByRole('alertdialog', {
      name: 'Remove project member?',
    });
    expect(confirmation).toHaveTextContent('Lin');
    await user.click(
      within(confirmation).getByRole('button', { name: 'Cancel' }),
    );

    await user.click(screen.getByRole('button', { name: 'Remove Lin' }));
    confirmation = screen.getByRole('alertdialog', {
      name: 'Remove project member?',
    });
    await user.click(
      within(confirmation).getByRole('button', { name: 'Remove member' }),
    );
    expect(context.removeMember).toHaveBeenCalledWith('member-2');
  });

  it('explains why a member referenced by tasks cannot be removed', async () => {
    const user = userEvent.setup();
    const referencedProject = wrapLegacySnapshot(
      makeSnapshot(),
      '2026-08-12T00:00:00.000Z',
    ).projects[0];
    referencedProject.tasks[0].assigneeId = 'member-2';
    renderMembers({
      projects: [referencedProject],
      currentProject: referencedProject,
    });

    await user.click(screen.getByRole('button', { name: 'Remove Lin' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Reassign tasks owned or reported by this member first.',
    );
  });
});
