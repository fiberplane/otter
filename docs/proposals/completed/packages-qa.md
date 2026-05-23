# Proposal: `packages/qa` template

**Status:** shipped

## Problem

Otter does not ship a QA scenario surface. Consumers scaffolding apps from otter's templates have no canonical place to write QA scenarios that exercise the resulting CLI / API / worker.

A prose-first scenario model — markdown files with small YAML frontmatter, reusable helpers, and gitignored local results — has proven useful in practice for this kind of cross-boundary validation. This proposal codifies that model as a generic, self-contained template at `packages/qa`.

## Design

### Authoring model

`packages/qa` contains no source code, no test runner, no fixtures, no assertion library. It is a directory of markdown scenarios with YAML frontmatter, plus a `helpers/` directory of reusable procedures and a gitignored `results/` directory for local run artifacts.

- Prose-first scenarios are readable by humans and structured enough for agents to follow.
- No framework to learn, no fixtures to maintain.
- Frontmatter (`name`, `requires`, `depends-on`, `tags`) gives just enough structure for dependency ordering and helper resolution.
- Drift anchors tie scenario prose to the code it exercises, so target changes flag scenarios for review.

### Package name

The workspace lives at `packages/qa` and the package is named `@otter/qa`, so programmatic siblings
can be added later — a runner, an agent-driven executor — without renaming the package. The initial
drop ships prose-only and leaves room for `src/` to appear later.

### Improvements baked in from day one

1. **Formal authoring guide and copyable templates.** A `_template.md` for scenarios and a `_template.md` for helpers (both prefixed `_` so they sort first and are clearly not real artifacts). The frontmatter schema is documented explicitly in the package README.

2. **Lean on otter's existing conventions instead of reinventing them.**
   - Drift is already a first-class skill in otter (see [`.agents/skills/drift/SKILL.md`](../../../.agents/skills/drift/SKILL.md)). Scenario→code anchoring is a stated expectation. Bindings are explicit: run `drift link <scenario> <target>` to stamp the relationship in `drift.lock`. Scenario prose can still mention the target path for reader context; explicit lockfile bindings are what drift freshness-checks. Relative markdown links are checked only for existence.
   - Otter's [`docs/testing/`](../../testing/) slot gets an index page at `docs/testing/qa.md` explaining _when_ to write a scenario, linking out to `packages/qa/README.md` for the _how_.
   - [`AGENTS.md`](../../../AGENTS.md) and [`docs/README.md`](../../README.md) tables get a QA scenarios entry.

3. **Small starter set mirroring `docs/templates/`.** Otter ships three app templates today — [`docs/templates/cli.md`](../../templates/cli.md), [`docs/templates/api.md`](../../templates/api.md), [`docs/templates/worker.md`](../../templates/worker.md). The example scenarios target those one-for-one so anyone scaffolding from otter has an adaptable model for the app they just generated. All example files use the `_example-` prefix to mark them as illustrative and meant to be deleted or replaced when the consumer writes real scenarios.

4. **Browser and Electron flows documented.** Otter can use the `agent-browser` skill for browser-visible flows, including already-running Electron apps that expose a Chrome DevTools Protocol port. Scenarios that need UI interaction describe the actions in prose and instruct the runner to use `agent-browser` (e.g., `agent-browser connect 9222`) rather than introducing per-scenario browser tooling. The worker example demonstrates the pattern.

### Package shape

```
packages/qa/
  README.md                          # philosophy, frontmatter schema, drift conventions, UI driving, how to run
  package.json                       # minimal: name @otter/qa, private, no deps, no scripts
  tsconfig.json                      # extends root config; points at the root ambient placeholder
  scenarios/
    _template.md                     # copy-this starter (NOT a real scenario)
    _example-cli.md                  # EXAMPLE: targets docs/templates/cli.md — delete or replace
    _example-api.md                  # EXAMPLE: targets docs/templates/api.md — delete or replace
    _example-worker.md               # EXAMPLE: targets docs/templates/worker.md, demonstrates agent-browser — delete or replace
  helpers/
    _template.md                     # copy-this helper starter
    _example-setup-test-dir.md       # EXAMPLE helper — delete or replace
    _example-bootstrap-env.md        # EXAMPLE helper — delete or replace
    _example-cleanup.md              # EXAMPLE helper — delete or replace
  results/
    .gitkeep
  .gitignore                         # results/* except .gitkeep
```

Everything under `scenarios/` and `helpers/` that starts with `_` is _not_ a scenario or helper a consumer is expected to keep. `_template.md` files are copy-from-this starters; `_example-*.md` files illustrate the authoring conventions and should be deleted or rewritten as soon as the consumer has real scenarios of their own. The README states this explicitly so agents and humans do not mistake the demo set for a baseline.

### Key design calls

- **`package.json` is minimal and present.** A bare `{ "name": "@otter/qa", "private": true, "version": "0.0.0" }` makes `packages/qa` an explicit workspace package and satisfies Otter's package convention without inviting source code _yet_. When a runner or agent-driven executor is added later, `src/` slots in under the same package name without disturbing the scenario authoring surface.
- **Frontmatter schema, documented once.** `name`, `requires`, `depends-on`, plus `tags` for filtering (`cli`, `api`, `worker`, `browser`). **No `drift-anchors` field** — drift anchoring lives in `drift.lock`, not in scenario frontmatter. The frontmatter stays small.
- **Scenario template structure.** Frontmatter → Goals → Prerequisites → numbered Steps (each with **Action**, **Expected**, **Verify**) → Cleanup. The heading vocabulary is fixed up-front in the template, so authors do not drift.
- **Examples track the real app templates.** Each `_example-*.md` scenario mentions its `docs/templates/<which>.md` target in prose and is bound to that target in `drift.lock`, so `drift check` fails when those templates change. The examples earn their keep by exercising drift end-to-end.
- **Results stay gitignored.** Local run artifacts (logs, screenshots, transcripts) live under `packages/qa/results/`, gitignored except `.gitkeep`.
- **Browser / Electron testing uses `agent-browser`.** The README points scenario authors at the available `agent-browser` skill rather than baking a UI driver into the qa package. The `_example-worker.md` scenario shows how to use `agent-browser` when a worker scaffold exposes browser-visible output, demonstrating the calling pattern without needing a dedicated browser example.

### What this proposal deliberately does _not_ do

- No scenario runner, no DSL, no assertion library, no QA source or runtime TypeScript at first land — the template ships prose-only. The package shape leaves room for `src/` to appear later without re-org.
- No Effect-TS code inside `packages/qa` yet, so ast-grep has nothing to enforce there. If TypeScript source is added later, repo ast-grep rules will scan it unless the package is explicitly excluded.
- No `drift-anchors` YAML field. Anchoring stays in `drift.lock`; the frontmatter does not grow.

## Phases

1. **Land the skeleton.** Create `packages/qa/` with `README.md`, `package.json`, `scenarios/_template.md`, `helpers/_template.md`, `results/.gitkeep`, `.gitignore`. Wire `docs/testing/qa.md` and update the index tables in `AGENTS.md` / `docs/README.md`.
2. **Add the three `_example-*` scenarios.** One per template (cli, api, worker). Each is bound to `docs/templates/*` so drift catches template drift.
3. **Add the three `_example-*` helpers.** `setup-test-dir`, `bootstrap-env`, `cleanup`.
4. **Stamp drift bindings.** Run `drift link <scenario> <target>` for each
   scenario/template binding, then verify `drift check` is clean.

Each phase is independently mergeable; phase 1 already provides a usable surface.

## Decisions locked in

1. **Examples target `docs/templates/`** (cli, api, worker) one-for-one, with explicit drift bindings so drift catches template drift.
2. **No `drift-anchors` frontmatter field** — anchors are handled by `drift.lock`. Drift runs unchanged.
3. **`packages/qa` / `@otter/qa`** — chosen, leaving room for programmatic additions (runner, agent-driven executor) under the same package later.
