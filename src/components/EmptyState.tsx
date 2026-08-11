import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** Gives unfinished feature surfaces an accessible, theme-aware placeholder. */
export function EmptyState({
  icon: Icon,
  title,
  description,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon" aria-hidden="true">
        <Icon size={22} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
