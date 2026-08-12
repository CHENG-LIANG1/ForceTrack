import { ShieldCheck, Trash2, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { UserAvatar } from '@/components/UserAvatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  MemberValidationError,
  validateMemberFields,
  type MemberFields,
  type MemberValidationIssue,
} from '@/domain/member';
import type { ProjectMember } from '@/domain/project';
import type { Task } from '@/domain/task';

interface MemberManagementDialogProps {
  open: boolean;
  members: readonly ProjectMember[];
  tasks: readonly Task[];
  onOpenChange(open: boolean): void;
  onAdd(fields: MemberFields): Promise<void>;
  onRemove(memberId: string): Promise<void>;
}

interface MemberCreateDialogProps {
  open: boolean;
  members: readonly ProjectMember[];
  onOpenChange(open: boolean): void;
  onAdd(fields: MemberFields): Promise<void>;
}

type CreateMemberField = 'familyName' | 'givenName' | 'email';
type CreateMemberIssues = Partial<Record<CreateMemberField | 'form', string>>;

function validationDetails(issue: MemberValidationIssue): {
  field: CreateMemberField;
  messageKey: string;
} {
  return {
    field: issue.startsWith('email_') ? 'email' : 'familyName',
    messageKey: `member.validation.${issue}`,
  };
}

/** Collects split names while preserving the existing display-name domain contract. */
function MemberCreateDialog({
  open,
  members,
  onOpenChange,
  onAdd,
}: MemberCreateDialogProps) {
  const { t, i18n } = useTranslation();
  const [familyName, setFamilyName] = useState('');
  const [givenName, setGivenName] = useState('');
  const [email, setEmail] = useState('');
  const [issues, setIssues] = useState<CreateMemberIssues>({});
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setFamilyName('');
    setGivenName('');
    setEmail('');
    setIssues({});
  };

  const changeOpen = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const setFieldValue = (field: CreateMemberField, value: string) => {
    if (field === 'familyName') setFamilyName(value);
    else if (field === 'givenName') setGivenName(value);
    else setEmail(value);
    setIssues((current) => ({
      ...current,
      [field]: undefined,
      form: undefined,
    }));
  };

  const focusField = (field: CreateMemberField) => {
    requestAnimationFrame(() => {
      document.getElementById(`member-${field}`)?.focus();
    });
  };

  /** Validates each name part before composing the persisted display name. */
  const submit = async () => {
    const normalizedFamilyName = familyName.trim();
    const normalizedGivenName = givenName.trim();
    if (!normalizedFamilyName) {
      setIssues({ familyName: 'member.validation.family_name_required' });
      focusField('familyName');
      return;
    }
    if (!normalizedGivenName) {
      setIssues({ givenName: 'member.validation.given_name_required' });
      focusField('givenName');
      return;
    }
    const name = i18n.resolvedLanguage?.startsWith('zh')
      ? `${normalizedFamilyName}${normalizedGivenName}`
      : `${normalizedGivenName} ${normalizedFamilyName}`;
    const fields = { name, email };
    const issue = validateMemberFields(fields, members);
    if (issue) {
      const details = validationDetails(issue);
      setIssues({ [details.field]: details.messageKey });
      focusField(details.field);
      return;
    }

    setSaving(true);
    try {
      await onAdd(fields);
      changeOpen(false);
    } catch (error) {
      if (error instanceof MemberValidationError) {
        const details = validationDetails(error.issue);
        setIssues({ [details.field]: details.messageKey });
        focusField(details.field);
      } else {
        setIssues({ form: 'member.validation.save_failed' });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="member-create-dialog">
        <div className="task-dialog-heading">
          <div>
            <DialogTitle>{t('member.createTitle')}</DialogTitle>
            <DialogDescription>
              {t('member.createDescription')}
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button
              className="icon-button"
              variant="unstyled"
              type="button"
              aria-label={t('member.actions.closeCreate')}
            >
              <X size={18} aria-hidden="true" />
            </Button>
          </DialogClose>
        </div>

        <form
          className="task-form member-create-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="member-name-fields">
            <div className="form-field">
              <label htmlFor="member-familyName">
                {t('member.fields.familyName')} *
              </label>
              <Input
                id="member-familyName"
                autoFocus
                value={familyName}
                aria-invalid={Boolean(issues.familyName)}
                aria-describedby={
                  issues.familyName ? 'member-family-name-error' : undefined
                }
                onChange={(event) =>
                  setFieldValue('familyName', event.target.value)
                }
              />
              {issues.familyName ? (
                <p
                  className="field-error"
                  id="member-family-name-error"
                  role="alert"
                >
                  {t(issues.familyName)}
                </p>
              ) : null}
            </div>
            <div className="form-field">
              <label htmlFor="member-givenName">
                {t('member.fields.givenName')} *
              </label>
              <Input
                id="member-givenName"
                value={givenName}
                aria-invalid={Boolean(issues.givenName)}
                aria-describedby={
                  issues.givenName ? 'member-given-name-error' : undefined
                }
                onChange={(event) =>
                  setFieldValue('givenName', event.target.value)
                }
              />
              {issues.givenName ? (
                <p
                  className="field-error"
                  id="member-given-name-error"
                  role="alert"
                >
                  {t(issues.givenName)}
                </p>
              ) : null}
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="member-email">{t('member.fields.email')} *</label>
            <Input
              id="member-email"
              type="email"
              value={email}
              aria-invalid={Boolean(issues.email)}
              aria-describedby={issues.email ? 'member-email-error' : undefined}
              onChange={(event) => setFieldValue('email', event.target.value)}
            />
            {issues.email ? (
              <p className="field-error" id="member-email-error" role="alert">
                {t(issues.email)}
              </p>
            ) : null}
          </div>
          {issues.form ? (
            <p className="field-error" role="alert">
              {t(issues.form)}
            </p>
          ) : null}
          <div className="task-form-actions">
            <span />
            <div>
              <Button
                type="button"
                variant="outline"
                size="dialog"
                onClick={() => changeOpen(false)}
              >
                {t('task.actions.cancel')}
              </Button>
              <Button type="submit" size="dialog" disabled={saving}>
                {saving ? t('task.actions.saving') : t('member.actions.add')}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Keeps the complete project-member workflow in modals instead of a route. */
export function MemberManagementDialog({
  open,
  members,
  tasks,
  onOpenChange,
  onAdd,
  onRemove,
}: MemberManagementDialogProps) {
  const { t } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);
  const [removalError, setRemovalError] = useState<string | null>(null);
  const pendingRemoval = members.find(
    (member) => member.id === pendingRemovalId,
  );

  const changeOpen = (nextOpen: boolean) => {
    if (!nextOpen) {
      setCreateOpen(false);
      setPendingRemovalId(null);
      setRemovalError(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent className="member-management-dialog">
          <div className="task-dialog-heading management-dialog-heading">
            <div>
              <DialogTitle>{t('member.title')}</DialogTitle>
              <DialogDescription>{t('member.description')}</DialogDescription>
            </div>
            <DialogClose asChild>
              <Button
                className="icon-button"
                variant="unstyled"
                type="button"
                aria-label={t('member.actions.close')}
              >
                <X size={18} aria-hidden="true" />
              </Button>
            </DialogClose>
          </div>

          <div className="member-management-content">
            <div className="member-management-toolbar">
              <span>{t('member.list.count', { count: members.length })}</span>
              <Button
                variant="unstyled"
                className="member-add-button"
                onClick={() => setCreateOpen(true)}
              >
                <UserPlus size={14} aria-hidden="true" />
                {t('member.actions.add')}
              </Button>
            </div>
            <ul
              className="member-management-list"
              aria-label={t('member.list.title')}
            >
              {members.length ? (
                members.map((member) => {
                  const referenced = tasks.some(
                    (task) =>
                      task.assigneeId === member.id ||
                      task.reporterId === member.id,
                  );
                  const lastOwner =
                    member.role === 'owner' &&
                    members.filter((item) => item.role === 'owner').length ===
                      1;
                  return (
                    <li key={member.id}>
                      <UserAvatar member={member} className="member-avatar" />
                      <span className="member-dialog-identity">
                        <strong>{member.name}</strong>
                        <small>{member.email}</small>
                      </span>
                      <span className="member-role">
                        <ShieldCheck size={14} aria-hidden="true" />
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
                          setRemovalError(null);
                          if (lastOwner || referenced) {
                            setRemovalError(
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
                })
              ) : (
                <li className="member-list-empty">{t('member.list.empty')}</li>
              )}
            </ul>
          </div>

          {removalError ? (
            <p className="form-error member-management-error" role="alert">
              {removalError}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>

      <MemberCreateDialog
        open={createOpen}
        members={members}
        onOpenChange={setCreateOpen}
        onAdd={onAdd}
      />

      <AlertDialog
        open={Boolean(pendingRemoval)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingRemovalId(null);
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
                  setRemovalError(null);
                  void onRemove(pendingRemoval.id)
                    .then(() => setPendingRemovalId(null))
                    .catch((cause) => {
                      setPendingRemovalId(null);
                      setRemovalError(
                        t(
                          `member.${cause instanceof Error ? cause.message : 'removeFailed'}`,
                        ),
                      );
                    });
                }}
              >
                {t('member.actions.confirmRemove')}
              </Button>
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
