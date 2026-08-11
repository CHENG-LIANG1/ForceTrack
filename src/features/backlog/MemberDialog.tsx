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
import type { MemberFields } from '@/domain/member';

interface MemberDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  onSave(fields: MemberFields): Promise<void>;
}

export function MemberDialog({
  open,
  onOpenChange,
  onSave,
}: MemberDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  const close = () => {
    setName('');
    setEmail('');
    setError(false);
    onOpenChange(false);
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
              aria-label={t('task.actions.close')}
            >
              <X size={18} />
            </Button>
          </DialogClose>
        </div>
        <form
          className="task-form"
          onSubmit={(event) => {
            event.preventDefault();
            const invalid =
              !name.trim() || !/^\S+@\S+\.\S+$/.test(email.trim());
            setError(invalid);
            if (invalid) return;
            setSaving(true);
            void onSave({ name, email })
              .then(close)
              .catch(() => setError(true))
              .finally(() => setSaving(false));
          }}
        >
          <div className="form-field form-field-wide">
            <label htmlFor="member-name">{t('member.fields.name')} *</label>
            <Input
              id="member-name"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="form-field form-field-wide">
            <label htmlFor="member-email">{t('member.fields.email')} *</label>
            <Input
              id="member-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          {error ? (
            <p className="field-error" role="alert">
              {t('member.validation.invalid')}
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
