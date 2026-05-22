# Proposal: `packages/qa` template

**Status:** shipped

## Problem

Otter does not ship a QA scenario surface. Consumers scaffolding apps from otter's templates have no canonical place to write QA scenarios that exercise the resulting CLI / API / worker. Inside Fiberplane, nocturne's `packages/qa-scripts` has accumulated a working model — prose-first scenarios, helpers, gitignored results — but it is coupled to nocturne's internals (NOXR-\* issue IDs, `apps/console` at `localhost:7676`, brainstorm sync, Electron desktop multi-device flows, `seed:qa`, `apps/console/.env.qa`) and would not transplant cleanly.

This proposal extracts the _shape_ of nocturne's QA approach into a template at `packages/qa`, with the nocturne-specific coupling stripped and several small improvements over the original.

## Design

### What to keep from nocturne

The most valuable property of nocturne's `qa-scripts` is that it contains no source code — it is a directory of markdown scenarios with YAML frontmatter, plus a `helpers/` directory and a gitignored `results/` directory. That is the right shape for a template:

- Prose-first scenarios are readable by humans and executable by agents
- No framework to learn, no fixtures to maintain
- Frontmatter (`name`, `requires`, `depends-on`) gives just enough structure for dependency ordering and helper resolution
- Drift anchors tie scenario prose to the code it exercises, so scenarios stay honest

### What to strip / rename

- Drop everything coupled to nocturne: issue IDs, `apps/console` at `localhost:7676`,
  brainstorm sync, Electron desktop, multi-device user data directories, built CLI paths,
  `seed:qa`, and `apps/console/.env.qa`.
- Rename `qa-scripts` → `qa`. The "scripts" suffix is a misnomer (there are no scripts), and `packages/qa` leaves room for programmatic siblings later (a runner, a qa-agent port) without renaming the package.
- Do not port `qa-agent` _yet_. Leaving orchestration out for now; the template's directory shape is compatible with adding `packages/qa/src/` later for a runner without disturbing scenario authors.

### What to improve over nocturne

Four small upgrades:

1. **Formal authoring guide and copyable scenario template.** Nocturne has a useful README but the template is inlined in `01-init-project.md`. Lift it to `packages/qa/scenarios/_template.md` (prefixed with `_` so it sorts first and is clearly not a real scenario) and document the frontmatter schema explicitly in `packages/qa/README.md`.

2. **Lean on otter's existing conventions instead of reinventing them.**
   - Drift is already a first-class skill in otter (see [`.agents/skills/drift/SKILL.md`](../../../.agents/skills/drift/SKILL.md)). Make scenario→code anchoring a stated expectation. **Use inline `@./` references in scenario prose** — e.g., when a step says "the CLI's `init` command is at `@./apps/example-cli/src/commands/init.ts`", `drift link` picks that up and stamps it in `drift.lock` automatically. Anchors stay _invisible_ in the reading experience: no extra YAML field, no special syntax, just a path reference in normal prose that drift treats as a binding.
   - Otter's `docs/` system has a `testing/` slot that is currently empty (just `.gitkeep`). Add a single index page at `docs/testing/qa.md` that explains _what_ the qa package is and _when_ to write a scenario, linking out to `packages/qa/README.md` for the _how_. This matches otter's [docs/patterns vs. docs/templates split](../../README.md).
   - [`AGENTS.md`](../../../AGENTS.md) and [`docs/README.md`](../../README.md) both have tables pointing at `docs/testing/` — wire the qa entry into those.

3. **Small starter set, clearly marked as examples, that mirrors `docs/templates/`.** Otter ships three app templates today — [`docs/templates/cli.md`](../../templates/cli.md), [`docs/templates/api.md`](../../templates/api.md), [`docs/templates/worker.md`](../../templates/worker.md). The example scenarios target those one-for-one so anyone scaffolding from otter has a runnable model that matches the app they just generated. All example files use the `_example-` prefix to mark them as illustrative and meant to be deleted or replaced when the consumer writes real scenarios. The README states this up front.

4. **Document how to drive browsers and Electron apps from scenarios.** Some scenarios need to exercise a UI, not just a CLI or HTTP endpoint. Otter has the `agent-browser` skill (and `electron` skill, which wraps it for Electron apps via CDP) available. The README should have a short "Driving UIs from scenarios" section that says: when a scenario needs browser or Electron interaction, the step prose should instruct the runner to use `agent-browser` (e.g., `agent-browser --cdp ws://localhost:9222` for an already-running Electron app) rather than inventing per-scenario browser tooling. The browser pattern is demonstrated by extending the worker example (workers commonly serve HTML), so it does not require a fourth standalone scenario.

### Proposed package shape

```
packages/qa/
  README.md                          # philosophy, frontmatter schema, drift conventions, UI driving, how to run
  package.json                       # minimal: name @otter/qa, private, no deps, no scripts
  tsconfig.json                      # extends root config; no source inputs yet
  scenarios/
    _template.md                     # copy-this starter (NOT a real scenario)
    _example-cli.md                  # EXAMPLE: targets docs/templates/cli.md — delete or replace
    _example-api.md                  # EXAMPLE: targets docs/templates/api.md — delete or replace
    _example-worker.md               # EXAMPLE: targets docs/templates/worker.md, demonstrates agent-browser — delete or replace
  helpers/
    _example-setup-test-dir.md       # EXAMPLE helper — delete or replace
    _example-bootstrap-env.md        # EXAMPLE helper — delete or replace
    _example-cleanup.md              # EXAMPLE helper — delete or replace
  results/
    .gitkeep
  .gitignore                         # results/* except .gitkeep
```

Everything under `scenarios/` and `helpers/` that starts with `_` is _not_ a scenario or helper a consumer is expected to keep. `_template.md` is the copy-from-this starter; `_example-*.md` files are illustrations of the authoring conventions and should be deleted or rewritten as soon as the consumer has real scenarios of their own. The README states this explicitly so agents and humans do not mistake the demo set for a baseline.

### Key design calls

- **`package.json` is minimal and present.** Otter's workspace pattern (`bun run --filter '*' ...`) expects every entry under `packages/` to be a package. A bare `{ "name": "@otter/qa", "private": true, "version": "0.0.0" }` keeps the workspace happy without inviting source code _yet_. When we later add a runner or port qa-agent, `src/` slots in under the same package name without disturbing the scenario authoring surface.
- **Frontmatter schema, documented once.** Nocturne's minimum (`name`, `requires`, `depends-on`) plus `tags` for filtering (`cli`, `api`, `worker`, `browser`). **No `drift-anchors` field** — drift anchoring is invisible, handled via inline `@./` references in the scenario prose. The frontmatter stays small.
- **Scenario template structure.** Frontmatter → Goals → Prerequisites → numbered Steps (each with **Action**, **Expected**, **Verify**) → Cleanup. Same skeleton as nocturne's `01-init-project.md` but with the heading vocabulary fixed up-front in the template, so authors do not drift.
- **Examples track the real app templates.** Each `_example-*.md` step that mentions code uses `@./` references into `docs/templates/<which>.md` or into the example apps it describes, so `drift check` actually fails when those templates change. The examples earn their keep by exercising drift end-to-end.
- **Results stay gitignored.** Same convention as nocturne. The `.gitkeep` reserves the folder so agents do not have to `mkdir`.
- **Browser / Electron testing uses `agent-browser`.** The README points scenario authors at the existing `agent-browser` and `electron` skills rather than baking a UI driver into the qa package. The `_example-worker.md` scenario includes a phase that uses `agent-browser` to hit the worker's rendered output, demonstrating the calling pattern without needing a dedicated browser example.

### What this proposal deliberately does _not_ do

- No scenario runner, no DSL, no assertion library, no TypeScript at first land — the template ships prose-only, like nocturne. The package shape leaves room for `src/` to appear later (runner, qa-agent port) without re-org.
- No qa-agent port in this PR. The directory structure is compatible with adding one as a follow-up.
- No Effect-TS patterns inside `packages/qa` (it is not a code package _yet_), so the ast-grep rules do not apply and there is nothing for them to enforce.
- No `drift-anchors` YAML field. Anchoring stays invisible via `@./` inline references; the frontmatter does not grow.

## Phases

1. **Land the skeleton.** Create `packages/qa/` with `README.md`, `package.json`, `scenarios/_template.md`, `results/.gitkeep`, `.gitignore`. Wire `docs/testing/qa.md` and update the index tables in `AGENTS.md` / `docs/README.md`.
2. **Add the three `_example-*` scenarios.** One per template (cli, api, worker). Each uses `@./` references into `docs/templates/*` so drift catches template drift.
3. **Add the three `_example-*` helpers.** `setup-test-dir`, `bootstrap-env`, `cleanup`.
4. **Run `drift link` over the package** to stamp the anchors and verify `drift check` is clean.

Each phase is independently mergeable; phase 1 already provides a usable surface.

## Decisions locked in

1. **Examples target `docs/templates/`** (cli, api, worker) one-for-one, with inline `@./` references so drift catches template drift.
2. **No `drift-anchors` frontmatter field** — anchors are invisible, handled by inline `@./` references in the scenario prose. Drift runs unchanged.
3. **`packages/qa`** — chosen, leaving room for programmatic additions (runner, qa-agent port) under the same package later.
