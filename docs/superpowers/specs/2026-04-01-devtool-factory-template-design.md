# Devtool Factory Template — Design Spec

## Overview

Otter is a template repository for Effect.ts monorepos with agent-friendly tooling. It ships with guardrails (ast-grep, biome), documentation conventions (drift), work tracking (fp), and observability patterns — but no application code. Agents clone it, read the instructions, and build.

Working title for the public framing: **devtool factory**.

## Prerequisites

The template assumes the host machine has:

1. **bun** — package manager and runtime
2. **fp** CLI — issue tracking and work sessions ([fp.dev](https://fp.dev))
3. **drift** CLI — spec-to-code binding and staleness detection
4. **ast-grep** (`sg`) — custom TypeScript lint rules

## Monorepo Structure

```
otter/
├── AGENTS.md                          # Agent instructions (symlinked to CLAUDE.md)
├── FP_AGENTS.md                       # fp issue tracking (managed by fp)
├── package.json                       # Bun workspace root
├── bunfig.toml                        # Bun config
├── biome.jsonc                        # Biome linting/formatting
├── sgconfig.yml                       # ast-grep rule config
├── tsconfig.json                      # Base TypeScript config
├── rules/
│   ├── shared/                        # 3 generic TS rules
│   └── effect/                        # 12 Effect-specific rules
├── rule-tests/
│   ├── shared/
│   └── effect/
├── docs/
│   ├── README.md                      # Docs convention guide
│   ├── patterns/
│   │   ├── effect.md                  # Effect conventions (ported from nocturne)
│   │   ├── coding-style.md            # General TS style (ported from nocturne)
│   │   └── observability.md           # Effect OTel console/file exporter setup
│   ├── templates/
│   │   └── cli.md                     # "How to build an Effect CLI" spec
│   └── architecture/                  # Architecture notes (populated as apps are built)
├── apps/                              # Published apps (agents create these)
├── packages/                          # Shared packages (agents create these)
├── .codex/                            # Codex sandbox config for fp/bun/git
├── .claude/skills/                    # Claude Code skills (drift, fp-*)
├── .agents/skills/                    # Multi-agent skills
└── .fp/                               # fp project config
```

Convention: `apps/` for published/deployable apps, `packages/` for internal shared code.

## AGENTS.md

Modeled on nocturne's structure. Sections:

1. **Project overview** — "Template for Effect.ts monorepos with agent-friendly tooling"
2. **Prerequisites** — bun, fp, drift, ast-grep with install pointers
3. **Monorepo conventions** — apps/ vs packages/ explanation
4. **Commands** — table of root-level scripts:

```bash
bun install                 # Install all deps
bun run lint                # Biome lint (all workspaces)
bun run lint:ast            # ast-grep scan
bun run lint:drift          # drift lint (spec staleness)
bun run format              # Biome format (all workspaces)
bun run typecheck           # Typecheck (all workspaces)
bun run test                # Tests (all workspaces)
bun run check               # All linters + typecheck
```

5. **Where to Look** — table pointing to docs/:

| Topic | Location |
|-------|----------|
| Effect conventions | `docs/patterns/effect.md` |
| Coding style | `docs/patterns/coding-style.md` |
| Observability setup | `docs/patterns/observability.md` |
| How to build a CLI | `docs/templates/cli.md` |
| Architecture notes | `docs/architecture/` |
| Docs convention guide | `docs/README.md` |

6. **Enforcement** section:

- **Biome**: `noExplicitAny` (error), `useBlockStatements` (error), `noAccumulatingSpread` (error), auto import organization. `noConsole` off (handled by ast-grep for Effect code).
- **ast-grep** (`bun run lint:ast`): Custom rules in `rules/`. Shared rules apply to all TS; Effect rules apply to `apps/**` and `packages/**`. See `docs/patterns/effect.md` for the full rule table.
- **drift** (`bun run lint:drift`): Specs in `docs/` are bound to source files via anchors. When code changes, `drift lint` flags stale specs. Update the spec, then `drift link <spec>` to re-stamp.

7. **Important notes** — commit discipline, don't skip linting, etc.

## ast-grep Rules

### Shared rules (all TypeScript)

Ported from nocturne. 3 rules:

| Rule | What it catches |
|------|-----------------|
| `no-dynamic-import` | `await import(...)` — use static imports |
| `no-else-after-return` | `if (...) { return } else { ... }` — use early returns |
| `no-foreach` | `.forEach()` — use `for...of` (excludes `Effect.forEach`) |

### Effect rules (apps/**/*, packages/**/*)

Ported from nocturne. 12 rules with `files:` globs adjusted from nocturne-specific paths to generic `apps/**/*.ts(x)` + `packages/**/*.ts(x)`:

| Rule | What it catches |
|------|-----------------|
| `no-bare-new-error` | `new Error()` — use `Data.TaggedError` |
| `no-console-log` | `console.log/warn/error/info` — use Effect logging |
| `no-direct-fs` | `import from "node:fs"` — use Effect FileSystem |
| `no-interface-in-models` | `export interface` in models — use `Schema.Struct` |
| `no-interpolated-logging` | Template literals in logger calls — use structured fields |
| `no-manual-tag-check` | Manual `._tag ===` checks — use `Effect.catchTag`/`Match` |
| `no-node-or-bun-in-core` | `node:` imports in core packages — use `@effect/platform` |
| `no-runpromise-in-effect` | `Effect.runPromise` inside Effect code — use `yield*` |
| `no-silent-catch` | `catchAll` without logging — always log before recovery |
| `no-throw-in-effect` | `throw` in `Effect.gen` — use `Effect.fail` |
| `no-try-catch` | try-catch in Effect generators — use `Effect.try`/`catchTag` |
| `use-tagged-error` | `extends Error` — use `Data.TaggedError` |

Rule tests ported where they exist in nocturne (6 of 12 effect rules have tests, all 3 shared rules have tests).

### sgconfig.yml

Direct copy from nocturne:

```yaml
ruleDirs:
  - rules/shared
  - rules/effect
testConfigs:
  - testDir: rule-tests/shared
  - testDir: rule-tests/effect
languageGlobs:
  tsx: ["*.ts", "*.tsx"]
```

## Package Configuration

### package.json

```json
{
  "name": "@otter/root",
  "private": true,
  "scripts": {
    "lint": "bun run --filter '*' lint",
    "lint:ast": "bunx @ast-grep/cli scan",
    "lint:drift": "drift lint",
    "test": "bun run --filter '*' test",
    "format": "bun run --filter '*' format",
    "typecheck": "bun run --filter '*' typecheck",
    "check": "bun run lint && bun run lint:ast && bun run lint:drift && bun run typecheck"
  },
  "workspaces": ["apps/*", "packages/*"],
  "devDependencies": {
    "@ast-grep/cli": "^0.42.0",
    "@biomejs/biome": "^2.4.10"
  },
  "trustedDependencies": ["@ast-grep/cli"]
}
```

### biome.jsonc

Ported from nocturne, removing CSS/frontend-specific config:

```jsonc
{
  "$schema": "node_modules/@biomejs/biome/configuration_schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "formatter": { "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": { "noExplicitAny": "error", "noConsole": "off" },
      "performance": { "noAccumulatingSpread": "error" },
      "style": { "useBlockStatements": { "level": "error" } }
    }
  },
  "javascript": {
    "formatter": { "quoteStyle": "double", "indentWidth": 2, "lineWidth": 100 }
  },
  "assist": {
    "enabled": true,
    "actions": { "source": { "organizeImports": "on" } }
  }
}
```

### bunfig.toml

Minimal — just workspace defaults. No tailwind plugin (nocturne has it, we don't need it).

## Docs

### docs/patterns/effect.md

Direct port from nocturne with these removals:
- Desktop/Electron section (ManagedRuntime, Effect RPC, scoped layer overrides)
- Nocturne-specific path references (`apps/desktop`, `packages/fp-core`, etc.)
- Hono integration example (defer to when an API template is added)
- `no-interface-in-models` note about `packages/fp-core/src/models/` path

Keep everything else: tagged errors, service architecture, yargs bridging, code smells 1-10, ast-grep rule table (updated with new globs), quick reference table.

### docs/patterns/coding-style.md

Port from nocturne with these removals:
- "Defensive Programming with Database Validation" (no DB yet)
- Vitest assertions section (no tests yet)
- GitHub PR Updates section (operational, not a pattern)

Keep: type safety, modern JS patterns, early returns, consistent code structure.

### docs/patterns/observability.md

New document. Shows how to wire up Effect with `@effect/opentelemetry` using a console/file span exporter for development:

```typescript
import { NodeSdk } from "@effect/opentelemetry"
import { ConsoleSpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-node"

const TracingLive = NodeSdk.layer(() => ({
  resource: { serviceName: "my-cli" },
  spanProcessor: new SimpleSpanProcessor(new ConsoleSpanExporter()),
}))
```

Documents:
- How to add the tracing layer to your app's layer composition
- How Effect.log/logWarning/logError integrate with the OTel logger
- How to read structured trace output (for agents debugging runtime behavior)
- How to swap in Jaeger/Honeycomb/etc. later

This doc needs hands-on validation — marking as needs-refinement.

### docs/templates/cli.md

"How to build an Effect CLI" specification. Covers:
- Project structure (`apps/<name>/`)
- Yargs + Effect bridging pattern (from nocturne's effect.md)
- Service layer setup (Context.Tag → Layer.effect → provide)
- Tagged error conventions
- Entry point pattern (Effect.runMain)
- Observability integration (import the tracing layer)

### docs/README.md

Adapted from nocturne's docs convention guide:

| Location | Contains |
|---|---|
| `docs/patterns/` | How we write code. Conventions, rules, idioms. |
| `docs/templates/` | How to build things. Specs for software components. |
| `docs/architecture/` | What the system looks like. Domain boundaries, data flow, key decisions. |

Plus the docs/ vs skills distinction from nocturne.

## Codex Support

Port nocturne's `.codex/` structure:

- `config.toml` — includes shared + local configs
- `config.shared.toml` — `[shell_environment_policy] inherit = "all"`
- `config.local.example.toml` — template for `~/.fiberplane` writable root
- `rules/fp.rules` — sandbox allowlists for `fp`, `git`, `bun` commands

Gitignore `config.local.toml` (contains user-specific paths).

## Open Questions

1. **Observability doc** needs hands-on validation with actual Effect OTel setup
2. **CLI template doc** needs to be written from scratch, referencing nocturne patterns
3. **fp extensions** — investigate which extensions could enforce workflow (e.g., code review reminders, ast-grep scan before commit)
4. **Naming** — "otter" is the repo name, "devtool factory" is the public framing. TBD on final branding.
