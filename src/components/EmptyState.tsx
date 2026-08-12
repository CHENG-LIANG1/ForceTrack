import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  headingLevel?: 1 | 2;
  action?: ReactNode;
}

/** Gives empty product surfaces an accessible message and optional next action. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  headingLevel = 2,
  action,
}: EmptyStateProps) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return (
    <div className="empty-state">
      <span className="empty-state-icon" aria-hidden="true">
        <Icon size={22} />
      </span>
      <Heading>{title}</Heading>
      <p>{description}</p>
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  );
}
