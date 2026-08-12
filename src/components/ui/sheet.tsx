import * as DialogPrimitive from '@radix-ui/react-dialog';
import { type ComponentProps, useState } from 'react';

import { DialogPortalContainerContext } from '@/components/ui/dialog-portal-context';
import { cn } from '@/lib/utils';

export function Sheet(props: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />;
}

export function SheetClose(
  props: ComponentProps<typeof DialogPrimitive.Close>,
) {
  return <DialogPrimitive.Close {...props} />;
}

export function SheetTitle(
  props: ComponentProps<typeof DialogPrimitive.Title>,
) {
  return <DialogPrimitive.Title {...props} />;
}

export function SheetDescription(
  props: ComponentProps<typeof DialogPrimitive.Description>,
) {
  return <DialogPrimitive.Description {...props} />;
}

/** Uses the proven dialog focus trap with a dedicated right-edge presentation. */
export function SheetContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(
    null,
  );
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay" />
      <DialogPrimitive.Content
        className={cn('sheet-content', className)}
        {...props}
      >
        <DialogPortalContainerContext value={portalContainer}>
          {children}
        </DialogPortalContainerContext>
        <div ref={setPortalContainer} className="dialog-popover-root" />
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
