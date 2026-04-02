<p align="center">
  <img src="otter.png" alt="otter" width="120" />
</p>

<h3 align="center">otter</h3>

<p align="center">
  A light software factory for Effect.ts monorepos
  <br />
  with agent-friendly tooling for code quality, documentation, and work tracking.
</p>

---

## Philosophy

**Explicit control flow.** Every branch handled, every error typed. Effect makes failure cases visible in function signatures — `TaggedError` gives errors identity, `catchTag` forces you to handle them by name. No silent catches, no untyped throws, no bare `new Error`. You can read any function and know exactly what can go wrong.

**Code shape enforcement.** ast-grep rules enforce architecture, not just style. Tagged errors must live in `errors.ts`. I/O must live in adapter files. `runPromise` can only appear at entry points. The rules define the shape of the codebase — when an agent reads them, it understands the architecture. See the [full rule table](#ast-grep-rules) below.

**Runtime observability.** Structured logging with span context, traces at every boundary. Set `EFFECT_TRACE=1` and see the full call tree, timings, and correlated logs on stdout. This works because the first two pillars enforce the preconditions: all I/O goes through traced Effect services, log calls use structured annotations, and spans are required at boundaries. See `docs/patterns/observability.md` and `docs/patterns/boundaries.md`.

## Getting started

Install the [prerequisites](#prerequisites), then:

```bash
bun install
```

Start your coding agent in this repo and start building. See `AGENTS.md` for the full command reference, enforcement rules, and conventions.

## Tools

| Tool                                               | Role                                                                 |
| -------------------------------------------------- | -------------------------------------------------------------------- |
| [bun](https://bun.sh)                              | Package manager and runtime                                          |
| [oxlint](https://oxc.rs) + [oxfmt](https://oxc.rs) | Linting and formatting                                               |
| [tsgo](https://github.com/microsoft/typescript-go) | TypeScript native compiler (preview)                                 |
| [ast-grep](https://ast-grep.github.io)             | Custom TypeScript lint rules (Effect-specific patterns)              |
| [drift](https://github.com/fiberplane/drift)       | Binds documentation specs to source code; detects when docs go stale |
| [fp](https://fp.dev)                               | Local-first issue tracking with lifecycle extensions                 |

## Structure

```
apps/           Deployable applications (CLIs, APIs, workers)
packages/       Internal shared packages
docs/           Conventions, templates, architecture notes
rules/          ast-grep lint rules (shared + Effect-specific)
.fp/extensions/ fp lifecycle extensions
```

## ast-grep rules

Custom lint rules in `rules/`, run via `bun run lint:ast`.

**Shared** (all TypeScript):

| Rule                   | What it catches                                       |
| ---------------------- | ----------------------------------------------------- |
| `no-dynamic-import`    | Dynamic `import()` — use static imports               |
| `no-else-after-return` | Unnecessary `else` after `return` — use early returns |
| `no-foreach`           | `.forEach()` — use `for...of`                         |

**Effect** (apps and packages):

| Rule                      | What it catches                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------- |
| `no-bare-new-error`       | `new Error()`, `new TypeError()`, etc. — use TaggedError or let unknowns propagate  |
| `no-console-log`          | `console.*` — use `Effect.log`                                                      |
| `no-direct-fs`            | Direct `node:fs` imports — use Effect's FileSystem service                          |
| `no-interface-in-models`  | `export interface` in models — use `Schema.Struct`                                  |
| `no-interpolated-logging` | Template literals or concatenation in log calls — use structured annotations        |
| `no-manual-tag-check`     | Manual `._tag` checks — use `Effect.catchTag` or `Match.tag`                        |
| `no-runpromise-in-effect` | `Effect.runPromise`/`runSync` inside Effect code — use `yield*` or boundary pattern |
| `no-silent-catch`         | `Effect.catchAll` without logging — always log before recovering                    |
| `no-throw-in-effect`      | `throw` in Effect generators — use `Effect.fail`                                    |
| `no-try-catch`            | `try/catch` in Effect code — use `Effect.try` or `Effect.catchTag`                  |
| `tagged-error-location`   | `Data.TaggedError` outside `errors.ts` — keep error definitions co-located          |
| `use-tagged-error`        | `class X extends Error` — use `Data.TaggedError`                                    |

## fp extensions

Extensions in `.fp/extensions/` hook into fp's issue lifecycle to enforce workflow quality.

### `auto-done`

Manages parent/child issue lifecycle automatically.

- **Pre-hook**: blocks marking a parent issue as done if any children are still open
- **Post-hook**: when the last child is marked done, auto-marks the parent done

### `check-before-done`

Gates the done transition on passing checks.

Runs `bun run check` (ast-grep + drift + typecheck) before allowing an issue to move to done. Configurable via `.fp/config.toml`:

```toml
[extensions.check-before-done]
checks = "bun run check"  # comma-separated commands
```

### `done-reminder`

Prints a reminder to stderr when an issue transitions to done, prompting the agent to:

- Run code review (via subagent) if the work was non-trivial
- Update `docs/` with architectural or flow decisions, using the drift skill to link specs to relevant source files

## Prerequisites

### bun

```bash
curl -fsSL https://bun.sh/install | bash
```

See [bun.sh](https://bun.sh) for more options.

### fp

```bash
curl -fsSL https://setup.fp.dev/install.sh | sh -s
```

See [fp.dev](https://fp.dev) for more info.

### drift

```bash
curl -fsSL https://drift.fp.dev/install.sh | sh
```

See [github.com/fiberplane/drift](https://github.com/fiberplane/drift) for more info.
