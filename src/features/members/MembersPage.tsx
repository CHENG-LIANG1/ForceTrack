import { ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useProjects } from '@/app/project-context';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { MemberDialog } from '@/features/backlog/MemberDialog';

/** Shows project-local membership without implying cloud invitations or authentication. */
export function MembersPage() {
  const { t } = useTranslation();
  const { currentProject, addMember, removeMember, isReady } = useProjects();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingRemoval = currentProject?.members.find(
    (member) => member.id === pendingRemovalId,
  );

  return (
    <section
      className="workspace-page members-page"
      aria-labelledby="members-title"
    >
      <PageHeader
        section={t('member.title')}
        titleId="members-title"
        title={t('member.title')}
        description={t('member.description')}
        actions={
          <Button
            size="lg"
            disabled={!isReady || !currentProject}
            onClick={() => setDialogOpen(true)}
          >
            <UserPlus size={16} />
            {t('member.actions.add')}
          </Button>
        }
      />
      {error ? (
        <p className="form-error members-error" role="alert">
          {error}
        </p>
      ) : null}
      {!currentProject || !currentProject.members.length ? (
        <EmptyState
          icon={Users}
          title={t('member.emptyTitle')}
          description={t('member.emptyDescription')}
        />
      ) : (
        <div className="members-panel">
          <div className="members-table-heading" aria-hidden="true">
            <span>{t('member.columns.person')}</span>
            <span>{t('member.columns.role')}</span>
            <span>{t('member.columns.status')}</span>
            <span />
          </div>
          <ul className="members-list">
            {currentProject.members.map((member) => {
              const referenced = currentProject.tasks.some(
                (task) =>
                  task.assigneeId === member.id ||
                  task.reporterId === member.id,
              );
              const lastOwner =
                member.role === 'owner' &&
                currentProject.members.filter((item) => item.role === 'owner')
                  .length === 1;
              return (
                <li key={member.id}>
                  <span className="member-avatar" aria-hidden="true">
                    {member.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="member-identity">
                    <strong>{member.name}</strong>
                    <small>{member.email}</small>
                  </span>
                  <span className="member-role">
                    <ShieldCheck size={14} />
                    {t(`member.role.${member.role}`)}
                  </span>
                  <span className="member-status">
                    {t(`member.status.${member.status}`)}
                  </span>
                  <Button
                    variant="unstyled"
                    className="member-remove"
                    aria-disabled={lastOwner || referenced}
                    title={
                      lastOwner
                        ? t('member.removeLastOwner')
                        : referenced
                          ? t('member.removeReferenced')
                          : t('member.actions.remove')
                    }
                    aria-label={t('member.actions.removeNamed', {
                      name: member.name,
                    })}
                    onClick={() => {
                      setError(null);
                      if (lastOwner || referenced) {
                        setError(
                          lastOwner
                            ? t('member.removeLastOwner')
                            : t('member.removeReferenced'),
                        );
                        return;
                      }
                      setPendingRemovalId(member.id);
                    }}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <MemberDialog
        open={dialogOpen}
        members={currentProject?.members ?? []}
        onOpenChange={setDialogOpen}
        onSave={addMember}
      />
      <AlertDialog
        open={Boolean(pendingRemoval)}
        onOpenChange={(open) => {
          if (!open) setPendingRemovalId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>{t('member.removeTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('member.removeDescription', { name: pendingRemoval?.name })}
          </AlertDialogDescription>
          <div className="confirmation-actions">
            <AlertDialogCancel asChild>
              <Button variant="outline" size="dialog">
                {t('task.actions.cancel')}
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                size="dialog"
                disabled={!pendingRemoval}
                onClick={(event) => {
                  if (!pendingRemoval) return;
                  event.preventDefault();
                  setError(null);
                  void removeMember(pendingRemoval.id)
                    .then(() => setPendingRemovalId(null))
                    .catch((cause) =>
                      setError(
                        t(
                          `member.${cause instanceof Error ? cause.message : 'removeFailed'}`,
                        ),
                      ),
                    );
                }}
              >
                {t('member.actions.confirmRemove')}
              </Button>
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
