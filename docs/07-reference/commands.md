# Commands Reference

Complete reference for all bun scripts and commands in Collabryx.

---

## Table of Contents

- [Core Commands](#core-commands)
- [Development Commands](#development-commands)
- [Testing Commands](#testing-commands)
- [Build Commands](#build-commands)
- [Utility Commands](#utility-commands)
- [Git Commands](#git-commands)
- [Supabase Commands](#supabase-commands)

---

## Core Commands

### `bun run dev`

Start the Next.js development server.

```bash
bun run dev
```

**Details:**
- **Port:** 3000 (default)
- **Features:** Hot Module Replacement (HMR), source maps, detailed errors
- **URL:** http://localhost:3000

**Custom Port:**
```bash
PORT=3001 bun run dev
```

---

### `bun run build`

Create a production build of the application.

```bash
bun run build
```

**Details:**
- Compiles TypeScript
- Optimizes bundles
- Generates static files
- Output: `.next/` directory

**Expected Output:**
```
✓ Compiled successfully
✓ Generating static pages
✓ Collecting page data
✓ Finalizing page optimization
✓ Build completed
```

---

### `bun run start`

Start the production server (after build).

```bash
bun run start
```

**Details:**
- Runs on port 3000
- Uses production build
- Requires `bun run build` first

---

### `bun run lint`

Run ESLint for code quality checking.

```bash
bun run lint
```

**Details:**
- Checks TypeScript/TSX files
- Enforces coding standards
- Reports errors and warnings

**Auto-fix:**
```bash
bun run lint -- --fix
```

---

## Testing Commands

**118 test files | 750+ test cases | 10 modules (TC-001→TC-100)**

### `bun run test`

Run the full Vitest test suite (unit + component + integration).

```bash
bun run test
```

**Details:**
- Runs all `*.test.ts` and `*.test.tsx` files
- Excludes E2E tests
- Outputs results to console
- Exits with error code on failure

### `bun run test:e2e`

Run Playwright E2E browser tests.

```bash
bun run test:e2e
```

**Details:**
- Chromium browser
- Auto-starts dev server
- Screenshots on failure
- CI retries (2x)

---

### Module-Specific Commands

```bash
# Module 1: Environment & CLI (TC-001→010)
bun run test -- --run tests/scripts/ tests/unit/lib/env-validation.test.ts tests/integration/environment/ tests/integration/seeder/

# Module 2: Auth & Security (TC-011→020)
bun run test -- --run tests/unit/auth/ tests/unit/lib/auth-rate-limit.test.ts tests/components/features/auth/ tests/integration/auth/

# Module 3: User Profiling (TC-021→030)
bun run test -- --run tests/unit/actions/profile-actions.test.ts tests/unit/settings-validation.test.ts tests/integration/profile/ tests/components/features/onboarding/ tests/components/features/profile/ tests/components/features/dashboard/profile-card.test.tsx

# Module 4: UI & Accessibility (TC-031→040)
bun run test -- --run tests/components/ui/ tests/components/shared/ tests/integration/ui/

# Module 5: Vector Embedding (TC-041→050)
bun run test -- --run tests/unit/lib/embedding-* tests/integration/embeddings/

# Module 6: Semantic Matching (TC-051→060)
bun run test -- --run tests/unit/services/match-* tests/unit/services/feed-scorer.ts (native TS scoring) tests/components/features/matches/ tests/integration/matches/

# Module 7: Real-Time Networking (TC-061→075)
bun run test -- --run tests/unit/hooks/use-connection* tests/unit/hooks/use-messages* tests/unit/hooks/use-conversations* tests/unit/hooks/use-typing* tests/components/features/connections/ tests/components/features/messages/ tests/integration/realtime/ tests/integration/messaging/

# Module 8: AI Mentor (TC-076→085)
bun run test -- --run tests/unit/lib/prompt-injection.test.ts tests/unit/lib/ai/ tests/components/features/ai-mentor/ tests/integration/ai-mentor/

# Module 9: Notifications & Moderation (TC-086→095)
bun run test -- --run tests/unit/services/notification-engine (native TS) tests/unit/services/content-moderator* tests/components/shared/notification-item* tests/components/features/dashboard/posts/ tests/integration/notifications/ tests/integration/moderation/ tests/integration/analytics/

# Module 10: System Integration (TC-096→100)
bun run test -- --run tests/integration/edge-functions/ tests/integration/analytics/aggregator.test.ts && bun run test:e2e
```

---

### Watch & Coverage

```bash
# Watch mode (re-runs on file changes)
bun run test -- --watch

# Coverage report (text + HTML + JSON)
bun run test -- --coverage

# Run specific test file
bun run test -- tests/unit/lib/sanitize.test.ts

# Run specific test case by name pattern
bun run test -- -t "RLS blocks"
```

---

## Build Commands

### `bun run build:analyze`

Analyze bundle size.

```bash
bun run build:analyze
```

**Details:**
- Generates bundle analysis report
- Shows largest dependencies
- Helps identify optimization opportunities

**Output:** `.next/analyze/`

---

### `bun run build:vercel`

Build for Vercel deployment.

```bash
bun run build:vercel
```

**Details:**
- Uses Vercel build configuration
- Optimized for Vercel platform

---

## Utility Commands

### `bun run clean`

Clean build artifacts and caches.

```bash
bun run clean
```

**Removes:**
- `.next/` directory
- `node_modules/.cache/`
- `*.tsbuildinfo` files

---

### `bun run typecheck`

Run TypeScript type checking.

```bash
bun run typecheck
```

**Details:**
- Checks all TypeScript files
- No emit (doesn't generate JS)
- Faster than full build

---

### `bun run format`

Format code with Prettier.

```bash
bun run format
```

**Details:**
- Formats all supported files
- Uses project Prettier config

**Check Only:**
```bash
bun run format:check
```

---

### `bun run prepare`

Run Husky setup for git hooks.

```bash
bun run prepare
```

**Details:**
- Installs git hooks
- Enables pre-commit linting
- Auto-run on `bun install`

---

## Git Commands

### Standard Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Stage changes
git add .

# Commit with conventional commits
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/your-feature-name
```

### Commit Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Formatting, no code change |
| `refactor` | Code refactoring |
| `perf` | Performance improvement |
| `test` | Adding tests |
| `chore` | Build/config changes |

---

## Supabase Commands

### Install Supabase CLI

```bash
bun install -g supabase
```

### Login

```bash
supabase login
```

### Link Project

```bash
supabase link --project-ref your-project-ref
```

### Push Migrations

```bash
supabase db push
```

### Generate Types

```bash
supabase gen types typescript --project-id your-project-id > types/database.types.ts
```

---

## Python Worker Commands

### Start Development Server

```bash
cd python-worker
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Run Tests

```bash
cd python-worker
python test_embeddings.py
```

### Install Dependencies

```bash
cd python-worker
pip install -r requirements.txt
```

---

## Docker Commands

### Build Image

```bash
docker build -t collabryx .
```

### Run Container

```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your-url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key \
  collabryx
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f
```

---

## Command Aliases

Add to your shell config for convenience:

### Bash/ZSH

```bash
# Add to ~/.bashrc or ~/.zshrc
alias dev='bun run dev'
alias build='bun run build'
alias test='bun run test'
alias lint='bun run lint'
```

### PowerShell

```powershell
# Add to profile
Set-Alias dev "bun run dev"
Set-Alias build "bun run build"
Set-Alias test "bun run test"
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Start development | `bun run dev` |
| Build for production | `bun run build` |
| Run tests | `bun run test` |
| Run tests (watch) | `bun run test:watch` |
| Check code quality | `bun run lint` |
| Format code | `bun run format` |
| Type check | `bun run typecheck` |
| Clean build | `bun run clean` |

---

**Last Updated**: 2026-03-14  
**Version**: 2.0.0

[← Back to Docs](../README.md) | [Environment Variables →](./environment-variables.md)
