---
name: Example CLI template smoke scenario
requires:
  - bun
depends-on:
  - _example-setup-test-dir
tags:
  - cli
---

# Example CLI Template Smoke Scenario

This is an example scenario. Delete or replace it when real CLI scenarios exist.

## Goals

- Confirm an app scaffolded from the CLI template has the expected command structure.
- Keep the scenario tied to @./docs/templates/cli.md so template changes prompt QA review.

## Prerequisites

- The runner has read @./docs/templates/cli.md.
- `_example-setup-test-dir` has created an isolated workspace.
- `bun` is available.

## Steps

1. Create a CLI app skeleton from the template.

   **Action:** In the isolated workspace, create the directories and files described by the CLI
   template's project structure.

   **Expected:** The app has `src/index.ts`, `src/services.ts`, `src/layers.ts`, `src/errors.ts`,
   and at least one file under `src/commands/`.

   **Verify:** List the app directory and compare it to the project structure in
   @./docs/templates/cli.md.

2. Run the development command.

   **Action:** Install dependencies and run the package's CLI development command with a sample
   command such as `hello Otter`.

   **Expected:** The command exits successfully and emits the expected user-visible output.

   **Verify:** Capture stdout, stderr, and the exit code in `packages/qa/results/`.

3. Check the template conventions.

   **Action:** Run the repository checks recommended by the CLI template.

   **Expected:** Linting and typechecking complete without template-related failures.

   **Verify:** Save the command output in `packages/qa/results/`.

## Cleanup

- Run `_example-cleanup` to remove the isolated workspace and any temporary files.
