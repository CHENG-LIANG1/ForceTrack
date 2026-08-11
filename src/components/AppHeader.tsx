import { CircleDotDashed } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="ForceTrack home">
        <span className="brand-mark" aria-hidden="true">
          <CircleDotDashed size={17} strokeWidth={2.2} />
        </span>
        <span>ForceTrack</span>
      </a>

      <nav className="header-nav" aria-label="Primary navigation">
        <span className="nav-item nav-item-active">Overview</span>
        <span className="nav-item">Changelog</span>
      </nav>

      <div className="header-meta">
        <span className="status-dot" aria-hidden="true" />
        Foundation ready
      </div>
    </header>
  );
}
