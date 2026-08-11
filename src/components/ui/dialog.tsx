import * as DialogPrimitive from '@radix-ui/react-dialog';
import { type ComponentProps, useState } from 'react';

import { DialogPortalContainerContext } from '@/components/ui/dialog-portal-context';
import { cn } from '@/lib/utils';

export function Dialog(props: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />;
}

export function DialogTrigger(
  props: ComponentProps<typeof DialogPrimitive.Trigger>,
) {
  return <DialogPrimitive.Trigger {...props} />;
}

export function DialogPortal(
  props: ComponentProps<typeof DialogPrimitive.Portal>,
) {
  return <DialogPrimitive.Portal {...props} />;
}

export function DialogClose(
  props: ComponentProps<typeof DialogPrimitive.Close>,
) {
  return <DialogPrimitive.Close {...props} />;
}

export function DialogOverlay({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn('dialog-overlay', className)}
      {...props}
    />
  );
}

export function DialogContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(
    null,
  );

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn('task-dialog-content', className)}
        {...props}
      >
        <DialogPortalContainerContext value={portalContainer}>
          {children}
        </DialogPortalContainerContext>
        <div ref={setPortalContainer} className="dialog-popover-root" />
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

export function DialogTitle(
  props: ComponentProps<typeof DialogPrimitive.Title>,
) {
  return <DialogPrimitive.Title {...props} />;
}

export function DialogDescription(
  props: ComponentProps<typeof DialogPrimitive.Description>,
) {
  return <DialogPrimitive.Description {...props} />;
}
