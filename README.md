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

**Explicit control flow.** Every branch handled, every error typed. Effect makes failure cases visible in function signatures — `TaggedError` gives errors identity, `catchTag` forces you to handle them by name. No silent `Effect.catchAll` recoveries, no `throw` inside `Effect.gen`, no bare `new Error`. You can read any function and know exactly what can go wrong.

**Code shape enforcement.** ast-grep rules enforce selected architecture cases, not just style. Tagged errors must live in `errors.ts`. Boundary conventions say external SDK wrappers and non-Effect I/O live in adapter files, while injected Effect platform services can be used in interior code. Current rules catch selected boundary anti-patterns, including direct `node:fs` imports and `Effect.runPromise` / `runSync` in Effect code. See the [rule summary](#ast-grep-rules) below.

**Runtime observability.** Structured logging with span context and templates that expect spans at boundaries. When tracing and logging layers are wired, set `EFFECT_TRACE=1` to emit console traces and correlated structured logs. The conventions establish the preconditions: Effect services are injectable, log calls use structured annotations, and boundary templates show where spans belong. See `docs/patterns/observability.md` and `docs/patterns/boundaries.md`.

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
| [drift](https://github.com/fiberplane/drift)       | Binds markdown docs/scenarios to source or template targets          |
| [fp](https://fp.dev)                               | Local-first issue tracking with lifecycle extensions                 |

## Structure

```
apps/           Deployable applications (CLIs, APIs, workers)
packages/       Internal shared packages
packages/qa/    Prose-first QA scenarios, helpers, and local run results
docs/           Conventions, templates, architecture notes, proposals, experiments
rules/          ast-grep lint rules (shared + Effect-specific)
.fp/extensions/ fp lifecycle extensions
```

## QA scenarios

`packages/qa` provides a prose-first scenario surface for validating scaffolded CLIs, APIs, workers,
and browser-visible flows. Scenarios are markdown files with small YAML frontmatter, reusable helper
docs, gitignored local results, and explicit drift bindings to the templates or code they exercise.

Start with `packages/qa/README.md` for the authoring guide and examples, and
`docs/testing/qa.md` for when to use QA scenarios versus code-level tests.

## ast-grep rules

Custom lint rules in `rules/`, run via `bun run lint:ast`.

**Shared** (all TypeScript):

| Rule                   | What it catches                                       |
| ---------------------- | ----------------------------------------------------- |
| `no-dynamic-import`    | Dynamic `import()` — use static imports               |
| `no-else-after-return` | Unnecessary `else` after `return` — use early returns |
| `no-foreach`           | `.forEach()` — use `for...of`                         |
| `no-hardcoded-colors`  | Hardcoded color literals in TS/TSX                    |

**Effect** (apps and packages):

| Rule                      | What it catches                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------- |
| `no-bare-new-error`       | `new Error()`, `new TypeError()`, etc. — use TaggedError or let unknowns propagate  |
| `no-console-log`          | `console.*` — use `Effect.log`                                                      |
| `no-direct-fs-import`     | Direct `node:fs` imports — use Effect's FileSystem service                          |
| `no-fetch-in-effect`      | `Effect.tryPromise` wrapping `fetch()` — use `@effect/platform`'s `HttpClient`      |
| `no-interface-in-models`  | `export interface` in models — use `Schema.Struct`                                  |
| `no-interpolated-logging` | Template literals or concatenation in log calls — use structured annotations        |
| `no-json-parse-without-schema` | Bare `JSON.parse` — validate parsed data through Schema                      |
| `no-manual-json-decode`   | `Effect.try({ try: () => JSON.parse(...) })` — use `Schema.parseJson(Inner)`        |
| `no-manual-tag-check`     | Manual `._tag` checks — use `Effect.catchTag` or `Match.tag`                        |
| `no-runpromise-in-effect` | `Effect.runPromise`/`runSync` inside Effect code — use `yield*` or boundary pattern |
| `no-silent-catch`         | `Effect.catchAll` without logging — always log before recovering                    |
| `no-throw-in-effect-generator` | `throw` in Effect generators — use `Effect.fail`                              |
| `no-try-catch-in-effect`  | `try/catch` in Effect code — use `Effect.try` or `Effect.catchTag`                  |
| `no-typed-boundary-assignment` | Typed assignment from parsed boundary data — decode first                    |
| `no-unsafe-typecast-at-boundary` | `as` casts on boundary data — decode with Schema                           |
| `tagged-error-location`   | `Data.TaggedError` outside `errors.ts` — keep error definitions co-located          |
| `use-tagged-error`        | `class X extends Error` — use `Data.TaggedError`                                    |

## fp extensions

Extensions in `.fp/extensions/` hook into fp's issue lifecycle to enforce workflow quality.

### `auto-done`

Manages parent/child issue lifecycle automatically.

- **Pre-hook**: blocks marking a parent issue as done if any children are still open
- **Post-hook**: when the last child is marked done, auto-marks the parent done

### `check-before-done`

Can gate the done transition on passing checks.

This repo currently disables the gate with `checks = ""`. Set `checks = "bun run check"` to run oxlint, ast-grep, drift, and typecheck before allowing an issue to move to done:

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
