import type { ReactNode } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Member } from '@/domain/member';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  member: Pick<Member, 'name' | 'email'> | null;
  className?: string;
  fallback?: ReactNode;
  fallbackLabel?: string;
  initialsLength?: 1 | 2;
}

function memberInitials(name: string, length: 1 | 2): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, length)
    .map((part) => part[0]?.toLocaleUpperCase())
    .join('');
}

/** Reuses one avatar disclosure pattern wherever project members appear. */
export function UserAvatar({
  member,
  className,
  fallback = '—',
  fallbackLabel,
  initialsLength = 2,
}: UserAvatarProps) {
  if (!member) {
    return (
      <span
        className={cn('user-identity-avatar', className)}
        aria-label={fallbackLabel}
      >
        {fallback}
      </span>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn('user-identity-avatar', className)}
            aria-label={`${member.name}, ${member.email}`}
          >
            {memberInitials(member.name, initialsLength)}
          </span>
        </TooltipTrigger>
        <TooltipContent className="user-avatar-tooltip">
          <strong>{member.name}</strong>
          <span>{member.email}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
