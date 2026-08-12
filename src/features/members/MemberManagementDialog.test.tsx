import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';

import { wrapLegacySnapshot } from '@/domain/workspace';
import { MemberManagementDialog } from '@/features/members/MemberManagementDialog';
import { createI18n } from '@/i18n';
import { makeSnapshot } from '@/test/fixtures';

describe('MemberManagementDialog', () => {
  it('explains guarded removals and confirms an allowed removal', async () => {
    const user = userEvent.setup();
    const project = wrapLegacySnapshot(
      makeSnapshot({ tasks: [] }),
      '2026-08-12T00:00:00.000Z',
    ).projects[0];
    const removeMember = vi.fn().mockResolvedValue(undefined);
    render(
      <I18nextProvider i18n={createI18n('en-US')}>
        <MemberManagementDialog
          open
          members={project.members}
          tasks={project.tasks}
          onOpenChange={vi.fn()}
          onAdd={vi.fn()}
          onRemove={removeMember}
        />
      </I18nextProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Remove Ada' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'A project must keep at least one owner.',
    );

    await user.click(screen.getByRole('button', { name: 'Remove Lin' }));
    let confirmation = screen.getByRole('alertdialog', {
      name: 'Remove project member?',
    });
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
    expect(removeMember).toHaveBeenCalledWith('member-2');
  });

  it('explains why a member referenced by tasks cannot be removed', async () => {
    const user = userEvent.setup();
    const project = wrapLegacySnapshot(
      makeSnapshot(),
      '2026-08-12T00:00:00.000Z',
    ).projects[0];
    project.tasks[0].assigneeId = 'member-2';
    render(
      <I18nextProvider i18n={createI18n('en-US')}>
        <MemberManagementDialog
          open
          members={project.members}
          tasks={project.tasks}
          onOpenChange={vi.fn()}
          onAdd={vi.fn()}
          onRemove={vi.fn()}
        />
      </I18nextProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Remove Lin' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Reassign tasks owned or reported by this member first.',
    );
  });
});
