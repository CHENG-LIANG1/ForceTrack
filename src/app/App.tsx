import { AppRoutes } from '@/app/routes';
import { AppHeader } from '@/components/AppHeader';

/** Renders the persistent shell while route elements own page-specific content. */
export function App() {
  return (
    <div className="app-shell">
      <AppHeader />
      <main className="page-shell">
        <AppRoutes />
      </main>
    </div>
  );
}
