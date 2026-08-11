# ForceTrack

ForceTrack is a lightweight task-management web app focused on clear planning,
status tracking, and timeline visibility. The MVP is designed as a desktop-first,
single-page application with local persistence and no backend dependency.

## Current status

Tasks 0–4 — engineering foundation, domain persistence, application shell,
task CRUD, and the interactive Board — are complete.

The current repository includes:

- React 19, TypeScript 7, and Vite 8
- Tailwind CSS 4 with semantic design tokens
- shadcn/ui configuration and composable UI primitives
- Lucide icons
- ESLint, Prettier, and strict TypeScript checks
- Vitest with Testing Library
- Playwright smoke coverage for Chromium at 1280 × 720
- `/board` and `/timeline` routes with fallback redirects
- Persisted Chinese/English locale switching
- Persisted light/dark/system themes built on semantic color tokens
- A responsive application shell with route-aware navigation
- A shared task state provider with serialized local persistence
- A Radix task editor with create, edit, status updates, deletion, validation,
  and unsaved-change confirmation
- Four persisted Board columns with counts, sortable task cards, empty states,
  drag overlays, and pointer/keyboard drag-and-drop

Board filters and the Timeline grid will be implemented in subsequent tasks.
See [PRD.md](./PRD.md) and
[TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md) for the authoritative scope and
implementation plan.

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

## Branch workflow

- `main` contains reviewed, accepted milestones.
- Ongoing implementation starts from `dev`.
- Changes are submitted through pull requests from `dev` into `main`.
- A task should pass its documented acceptance gate before its pull request is
  merged.

## Project structure

```text
ForceTrack/
├── e2e/                  # Playwright browser tests
├── public/               # Static assets
├── src/
│   ├── app/              # Application shell and providers
│   ├── components/       # Shared and shadcn/ui components
│   ├── domain/           # Domain models and reducers
│   ├── features/         # Board, filters, editor, and timeline features
│   ├── infrastructure/   # Repository and persistence adapters
│   ├── i18n/             # Localization resources
│   ├── styles/           # Global styles and semantic tokens
│   └── test/             # Shared test setup
├── PRD.md
└── TECHNICAL_DESIGN.md
```

## Documentation

- [Product requirements](./PRD.md)
- [Technical design and implementation plan](./TECHNICAL_DESIGN.md)
