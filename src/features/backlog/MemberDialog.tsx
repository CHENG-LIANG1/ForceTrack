import { X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

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
  type Member,
  type MemberFields,
  type MemberValidationIssue,
} from '@/domain/member';

interface MemberDialogProps {
  open: boolean;
  members: readonly Member[];
  onOpenChange(open: boolean): void;
  onSave(fields: MemberFields): Promise<void>;
}

type MemberField = keyof MemberFields;
type MemberIssues = Partial<Record<MemberField | 'form', string>>;

function issueDetails(issue: MemberValidationIssue): {
  field: MemberField;
  messageKey: string;
} {
  return {
    field: issue.startsWith('name_') ? 'name' : 'email',
    messageKey: `member.validation.${issue}`,
  };
}

function memberInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toLocaleUpperCase())
    .join('');
}

/** Combines the persisted member roster with field-specific local member creation. */
export function MemberDialog({
  open,
  members,
  onOpenChange,
  onSave,
}: MemberDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [issues, setIssues] = useState<MemberIssues>({});
  const [saving, setSaving] = useState(false);

  const close = () => {
    setName('');
    setEmail('');
    setIssues({});
    onOpenChange(false);
  };

  const setFieldValue = (field: MemberField, value: string) => {
    if (field === 'name') setName(value);
    else setEmail(value);
    setIssues((current) => ({
      ...current,
      [field]: undefined,
      form: undefined,
    }));
  };

  const showValidationIssue = (issue: MemberValidationIssue) => {
    const details = issueDetails(issue);
    setIssues({ [details.field]: details.messageKey });
    requestAnimationFrame(() => {
      document.getElementById(`member-${details.field}`)?.focus();
    });
  };

  /** Preserves the draft on every failure and maps domain validation to its owning field. */
  const submit = async () => {
    const fields = { name, email };
    const issue = validateMemberFields(fields, members);
    if (issue) {
      showValidationIssue(issue);
      return;
    }

    setSaving(true);
    try {
      await onSave(fields);
      close();
    } catch (error) {
      if (error instanceof MemberValidationError) {
        showValidationIssue(error.issue);
      } else {
        setIssues({ form: 'member.validation.save_failed' });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
    >
      <DialogContent>
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
              aria-label={t('member.actions.close')}
            >
              <X size={18} />
            </Button>
          </DialogClose>
        </div>
        <section
          className="member-list-section"
          aria-labelledby="member-list-title"
        >
          <div className="member-list-heading">
            <h3 id="member-list-title">{t('member.list.title')}</h3>
            <span>{t('member.list.count', { count: members.length })}</span>
          </div>
          <ul className="member-list">
            {members.length ? (
              members.map((member) => (
                <li key={member.id}>
                  <span className="member-avatar" aria-hidden="true">
                    {memberInitials(member.name)}
                  </span>
                  <span>
                    <strong>{member.name}</strong>
                    <small>{member.email}</small>
                  </span>
                </li>
              ))
            ) : (
              <li className="member-list-empty">{t('member.list.empty')}</li>
            )}
          </ul>
        </section>

        <form
          className="task-form member-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="member-form-heading">
            <h3>{t('member.formTitle')}</h3>
          </div>
          <div className="form-field">
            <label htmlFor="member-name">{t('member.fields.name')} *</label>
            <Input
              id="member-name"
              autoFocus
              value={name}
              aria-invalid={Boolean(issues.name)}
              aria-describedby={issues.name ? 'member-name-error' : undefined}
              onChange={(event) => setFieldValue('name', event.target.value)}
            />
            {issues.name ? (
              <p className="field-error" id="member-name-error" role="alert">
                {t(issues.name)}
              </p>
            ) : null}
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
                onClick={close}
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
