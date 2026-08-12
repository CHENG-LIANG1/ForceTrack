/**
 * Shared page identity and action layout for every primary workspace view.
 * Centralizing it keeps heading rhythm and responsive wrapping consistent.
 */
import type { ReactNode } from 'react';

interface PageHeaderProps {
  section: string;
  titleId: string;
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({
  section,
  titleId,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-heading compact-page-heading">
        <p className="page-kicker">ForceTrack / {section}</p>
        <h1 id={titleId}>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  );
}
