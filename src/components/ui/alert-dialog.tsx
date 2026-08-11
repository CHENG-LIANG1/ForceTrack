import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export function AlertDialog(
  props: ComponentProps<typeof AlertDialogPrimitive.Root>,
) {
  return <AlertDialogPrimitive.Root {...props} />;
}

export function AlertDialogTrigger(
  props: ComponentProps<typeof AlertDialogPrimitive.Trigger>,
) {
  return <AlertDialogPrimitive.Trigger {...props} />;
}

export function AlertDialogPortal(
  props: ComponentProps<typeof AlertDialogPrimitive.Portal>,
) {
  return <AlertDialogPrimitive.Portal {...props} />;
}

export function AlertDialogAction(
  props: ComponentProps<typeof AlertDialogPrimitive.Action>,
) {
  return <AlertDialogPrimitive.Action {...props} />;
}

export function AlertDialogCancel(
  props: ComponentProps<typeof AlertDialogPrimitive.Cancel>,
) {
  return <AlertDialogPrimitive.Cancel {...props} />;
}

export function AlertDialogOverlay({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      className={cn('dialog-overlay dialog-overlay-raised', className)}
      {...props}
    />
  );
}

export function AlertDialogContent({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        className={cn('confirmation-dialog-content', className)}
        {...props}
      />
    </AlertDialogPortal>
  );
}

export function AlertDialogTitle(
  props: ComponentProps<typeof AlertDialogPrimitive.Title>,
) {
  return <AlertDialogPrimitive.Title {...props} />;
}

export function AlertDialogDescription(
  props: ComponentProps<typeof AlertDialogPrimitive.Description>,
) {
  return <AlertDialogPrimitive.Description {...props} />;
}
