import {
  ArrowRight,
  Blocks,
  Check,
  GitBranch,
  PanelsTopLeft,
  Sparkles,
} from 'lucide-react';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';

const foundations = [
  { label: 'React + TypeScript', detail: 'Strict by default' },
  { label: 'shadcn/ui', detail: 'Composable primitives' },
  { label: 'Playwright', detail: 'Browser verified' },
] as const;

export function App() {
  return (
    <main className="app-shell">
      <AppHeader />

      <section id="top" className="hero-section">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-glow" aria-hidden="true" />

        <div className="hero-content">
          <div className="eyebrow">
            <Sparkles size={13} />
            Project foundation · Task 0
          </div>

          <h1>
            Move work forward.
            <span>Keep the signal clear.</span>
          </h1>

          <p className="hero-copy">
            ForceTrack is being built as a focused workspace for planning,
            tracking, and finishing the work that matters.
          </p>

          <div className="hero-actions">
            <Button size="lg">
              Open workspace
              <ArrowRight size={15} />
            </Button>
            <Button size="lg" variant="outline">
              View foundation
            </Button>
          </div>
        </div>

        <div
          className="foundation-panel"
          aria-label="Project foundation status"
        >
          <div className="panel-header">
            <div>
              <p className="panel-kicker">FORCETRACK / FOUNDATION</p>
              <h2>Ready for the first workflow</h2>
            </div>
            <span className="ready-badge">
              <Check size={12} strokeWidth={3} />
              Ready
            </span>
          </div>

          <div className="foundation-list">
            {foundations.map((item, index) => (
              <div className="foundation-row" key={item.label}>
                <span className="row-index">0{index + 1}</span>
                <span className="row-icon" aria-hidden="true">
                  {index === 0 ? (
                    <GitBranch size={16} />
                  ) : index === 1 ? (
                    <Blocks size={16} />
                  ) : (
                    <PanelsTopLeft size={16} />
                  )}
                </span>
                <span className="row-label">{item.label}</span>
                <span className="row-detail">{item.detail}</span>
                <Check className="row-check" size={15} />
              </div>
            ))}
          </div>

          <div className="panel-footer">
            <span>Node 24</span>
            <span>pnpm 10</span>
            <span>Vite 8</span>
            <span className="footer-spacer" />
            <span>Build 00</span>
          </div>
        </div>
      </section>
    </main>
  );
}
