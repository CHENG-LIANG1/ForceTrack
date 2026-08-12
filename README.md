# ForceTrack

ForceTrack is a lightweight task-management web app focused on clear planning,
status tracking, and timeline visibility. The MVP is designed as a desktop-first,
single-page application with local persistence and no backend dependency.

## Current status

Tasks 0–9 are implemented as a local-first release candidate. The application
supports planning, Sprint execution, project health review, and timeline
visibility without a backend or account system.

The current repository includes:

- React 19, TypeScript 7, and Vite 8
- Tailwind CSS 4 with semantic design tokens
- shadcn/ui configuration and composable UI primitives
- Lucide icons
- ESLint, Prettier, and strict TypeScript checks
- Vitest with Testing Library
- Playwright release coverage for Chromium at 1280 × 720
- Project-scoped Summary, Backlog, Board, and Timeline routes with legacy-path
  redirects; member management opens from the Project Switcher
- Multi-project creation, switching, editing, deletion, and recent-project
  recovery
- Persisted Chinese/English locale switching
- Persisted Light/Dark theme cards built on semantic color tokens, defaulting
  to Dark
- A responsive application shell with route-aware navigation
- A shared task state provider with serialized local persistence
- Versioned V1/V2 → Workspace V3 migration with corrupt-storage recovery
- A Radix task editor with create, edit, status updates, deletion, validation,
  and unsaved-change confirmation
- Four persisted Board columns with counts, sortable task cards, empty states,
  drag overlays, and pointer/keyboard drag-and-drop
- Backlog search and combined assignee, work type, status, and priority filters
- Backlog ranking, Sprint creation/editing/start/completion/deletion, and one
  active Sprint at a time
- Summary health metrics and filters backed by shared selectors
- A read-only Timeline with scheduled bars and an unscheduled-work section
- Local members that can immediately be assigned as assignee or reporter
- Root error recovery, storage feedback, bilingual UI, and 768 px access paths

See [PRD.md](./PRD.md), [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md), and
[ACCEPTANCE.md](./ACCEPTANCE.md) for scope, implementation decisions, and
release evidence.

## Requirements

- Node.js 24.x
- pnpm 10.x

## Local development

```bash
pnpm install
pnpm dev
```

Vite prints the local URL after startup. The default is
`http://localhost:5173` when that port is available.

## Product workflow

1. Create local members from Backlog and assign them in the task editor.
2. Create or rank work in Backlog, then place it into a planned Sprint.
3. Start a non-empty Sprint with a goal and date range. Board shows only the
   active Sprint.
4. Move work through Board, review derived metrics in Summary, and inspect
   scheduled work in Timeline.
5. Complete the Sprint and move unfinished work to Backlog or another planned
   Sprint. Completed work remains attached to the completed Sprint.

ForceTrack intentionally excludes authentication, invitations, roles,
permissions, parallel active Sprints, and server collaboration from this MVP.

## Local storage

- Current workspace: `forcetrack:workspace:v3`
- Current preferences: `forcetrack:preferences:v2`
- Onboarding completion: `forcetrack:onboarding:v1`
- Read-only migration inputs: `forcetrack:tasks:v2`, `forcetrack:tasks:v1`, and
  `forcetrack:preferences:v1`
- Recovery backups: `forcetrack:recovery:workspace:last-invalid` and
  `forcetrack:recovery:preferences:last-invalid`

A valid V3 workspace always wins. When V3 is absent, the repository wraps valid
V2 data as the default `FT` project or migrates V1 through V2. Legacy values are
retained unchanged, and corrupt current payloads are backed up before recovery.

## Quality checks

```bash
# Formatting, lint, typecheck, unit tests, and production build
pnpm check

# Unit-test coverage
pnpm test:coverage

# Chromium end-to-end tests
pnpm test:e2e

# Production preview
pnpm build
pnpm preview
```

Coverage is release-blocking: global coverage has a 75% floor, while domain,
infrastructure, and shared selector groups have 90% risk-based thresholds.

## Static hosting

`pnpm build` writes the deployable application to `dist/`. Configure the static
host to serve `index.html` for unknown paths so direct refreshes of Summary,
Backlog, Board, and Timeline continue to work.

## Branch workflow

- `main` contains reviewed, accepted milestones.
- Ongoing implementation uses short-lived topic branches from the latest
  `main`; use `dev` only when a maintainer explicitly requests it.
- Changes are submitted through focused pull requests into `main`.
- A task should pass its documented acceptance gate before its pull request is
  merged.

## Project structure

```text
ForceTrack/
├── e2e/                  # Playwright browser tests
├── docs/wiki/            # Secondary-development and collaboration guide
├── public/               # Static assets
├── src/
│   ├── app/              # Application shell and providers
│   ├── components/       # Shared and shadcn/ui components
│   ├── domain/           # Domain models and reducers
│   ├── features/         # Summary, Backlog, Board, Timeline, filters, editor
│   ├── infrastructure/   # Repository and persistence adapters
│   ├── i18n/             # Localization resources
│   ├── styles/           # Global styles and semantic tokens
│   └── test/             # Shared test setup
├── PRD.md
├── ACCEPTANCE.md
└── TECHNICAL_DESIGN.md
```

## Documentation

- [Developer wiki](./docs/wiki/README.md)
- [Product requirements](./PRD.md)
- [Technical design and implementation plan](./TECHNICAL_DESIGN.md)
- [Release acceptance evidence](./ACCEPTANCE.md)
