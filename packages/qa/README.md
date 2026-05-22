# @otter/qa

Prose-first QA scenarios for apps scaffolded from this repo.

This package intentionally contains no runner, fixtures, source code, or assertion library. A QA
scenario is a markdown file with small YAML frontmatter, readable steps, and links to the template
or code it exercises. Humans can run the scenarios manually, and agents can execute them by reading
the same prose.

The `_template.md` and `_example-*.md` files are not baseline tests. They are copyable examples for
new projects. Delete or rewrite them when a consumer adds real product scenarios.

## Layout

```
packages/qa/
  scenarios/   Markdown scenario files
  helpers/     Reusable markdown procedures referenced by scenarios
  results/     Local run notes, screenshots, logs, and captures; gitignored
```

Files under `scenarios/` and `helpers/` that start with `_` are examples or templates. Keep real
scenario and helper filenames unprefixed, for example `create-project.md` or `login-flow.md`.

## Frontmatter

Every scenario starts with YAML frontmatter:

```yaml
---
name: Create a project
requires:
  - bun
depends-on:
  - setup-test-dir
tags:
  - cli
---
```

Fields:

| Field        | Required | Meaning                                                                   |
| ------------ | -------- | ------------------------------------------------------------------------- |
| `name`       | yes      | Human-readable scenario name                                              |
| `requires`   | no       | Tools, services, env vars, or credentials needed before the scenario runs |
| `depends-on` | no       | Helper names or scenario names that must run first                        |
| `tags`       | no       | Filtering labels such as `cli`, `api`, `worker`, or `browser`             |

Do not add a `drift-anchors` field. Drift bindings are kept in normal prose references.

## Scenario Format

Use the same heading structure for every scenario:

1. `## Goals` states the behavior under test.
2. `## Prerequisites` lists setup, running services, and helper dependencies.
3. `## Steps` contains numbered steps. Each step has `Action`, `Expected`, and `Verify`.
4. `## Cleanup` returns the workspace and external systems to their original state.

Steps should be specific enough for an agent to execute without inventing product behavior. Prefer
observable checks over implementation guesses.

## Drift References

When a scenario depends on a template, source file, or doc section, mention it inline with an `@./`
path so `drift link` can bind the scenario to that target. For example:

```markdown
The CLI structure comes from @./docs/templates/cli.md.
```

After adding or changing scenarios, run:

```bash
drift link packages/qa/scenarios/<scenario>.md <target-path>
drift check
```

If the linked template or code changes later, `drift check` flags the scenario for review.

## Helpers

Helpers are markdown procedures, not executable scripts. A helper should include:

- Purpose
- Inputs
- Steps
- Outputs
- Cleanup or rollback notes

Reference helpers by name in `depends-on`. Keep reusable setup in helpers so scenarios stay focused
on product behavior.

## Results

Write local run output under `packages/qa/results/`. Useful artifacts include:

- Run notes and timestamps
- Screenshots or recordings
- HTTP transcripts
- CLI stdout and stderr captures
- Cleanup notes

Everything in `results/` is gitignored except `.gitkeep`.

## Driving UIs From Scenarios

Browser and Electron scenarios should instruct the runner to use the existing `agent-browser` skill,
or the Electron skill when one is available, instead of introducing per-scenario browser tooling. For
a web app, name the URL to open and the visible state to verify. For an already-running Electron app
with Chrome DevTools Protocol enabled, include the CDP endpoint, for example
`agent-browser --cdp ws://localhost:9222`.

The worker example demonstrates this pattern for a worker that serves HTML while also processing
background work.

## Running Scenarios

There is no package script yet. To run a scenario:

1. Read its frontmatter and prerequisites.
2. Run any helpers listed in `depends-on`.
3. Execute each step in order.
4. Save local evidence in `results/`.
5. Run cleanup.

When a future runner or QA agent is added, it should preserve this authoring surface.
