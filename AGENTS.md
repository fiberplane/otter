# AGENTS.md

Effect.ts monorepo template with agent-friendly tooling for code quality, documentation, and work tracking.

## Prerequisites

The following tools must be installed on the host machine:

| Tool | Purpose | Install |
|------|---------|---------|
| **bun** | Package manager and runtime | [bun.sh](https://bun.sh) |
| **fp** | Issue tracking and work sessions | [fp.dev](https://fp.dev) |
| **drift** | Spec-to-code binding and staleness detection | [github.com/fiberplane/drift](https://github.com/fiberplane/drift) |
| **ast-grep** (`sg`) | Custom lint rules | [ast-grep.github.io](https://ast-grep.github.io) |

## Monorepo Conventions

- `apps/` — Published or deployable applications (CLIs, APIs, workers)
- `packages/` — Internal shared packages consumed by apps

Each app and package has its own `package.json` and `tsconfig.json` extending the root.

## Commands

```bash
bun install                 # Install all deps
bun run lint                # Biome lint (all workspaces)
bun run lint:ast            # ast-grep scan (custom TS rules)
bun run lint:drift          # drift lint (check for stale specs)
bun run format              # Biome format (all workspaces)
bun run typecheck           # Typecheck (all workspaces)
bun run test                # Tests (all workspaces)
bun run check               # ast-grep + drift + typecheck
```

## Where to Look

| Topic | Location |
|-------|----------|
| Effect conventions | `docs/patterns/effect.md` |
| Coding style | `docs/patterns/coding-style.md` |
| Observability setup | `docs/patterns/observability.md` |
| How to build a CLI | `docs/templates/cli.md` |
| Architecture notes | `docs/architecture/` |
| Docs convention guide | `docs/README.md` |
| ast-grep rules | `rules/shared/`, `rules/effect/` |
| ast-grep rule tests | `rule-tests/shared/`, `rule-tests/effect/` |

## Enforcement

**Biome** (`bun run lint`): `noExplicitAny` (error), `useBlockStatements` (error), `noAccumulatingSpread` (error), auto import organization. `noConsole` is off — handled by ast-grep for Effect code. Formatter: 2-space indent, 100-char lines, double quotes.

**ast-grep** (`bun run lint:ast`): Custom rules in `rules/`. Shared rules apply to all TypeScript; Effect rules apply to `apps/**` and `packages/**`. See `docs/patterns/effect.md` for the full rule table and code smell guide.

**drift** (`bun run lint:drift`): Specs in `docs/` can be bound to source files via anchors. When code changes, `drift lint` flags stale specs. Update the spec, then run `drift link <spec>` to re-stamp. See the drift skill for detailed workflow.

**After writing any code**, run `bun run check` to verify ast-grep rules, drift anchors, and types all pass.

## References

When docs are insufficient or potentially stale, clone upstream repos into `references/` so agents can read actual source code.

The `references/` directory is:
- Gitignored (`.gitignore`) — never committed
- Excluded from Biome (`biome.jsonc`) — not linted or formatted
- Local-only — each developer/agent clones what they need

### Usage

```bash
# Clone a specific repo (shallow clone to save space)
git clone --depth 1 https://github.com/Effect-TS/effect.git references/effect

# Clone another dependency you need to understand
git clone --depth 1 https://github.com/open-telemetry/opentelemetry-js.git references/opentelemetry-js
```

Then read the source directly:

```bash
# Find how Effect implements a specific function
grep -r "export const succeed" references/effect/packages/effect/src/
```

### When to use references/

- Debugging behavior that docs don't explain
- Understanding the exact API surface or type signatures of a dependency
- Verifying whether a pattern is supported before adopting it
- Reading test files to understand expected behavior

@FP_AGENTS.md
