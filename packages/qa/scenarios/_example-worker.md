---
name: Example worker template smoke scenario
requires:
  - bun
  - agent-browser
depends-on:
  - _example-setup-test-dir
  - _example-bootstrap-env
tags:
  - worker
  - browser
---

# Example Worker Template Smoke Scenario

This is an example scenario. Delete or replace it when real worker scenarios exist.

## Goals

- Confirm an app scaffolded from the worker template processes a message and shuts down cleanly.
- Demonstrate browser-driven verification for workers that also expose an HTML status page.
- Keep the scenario tied to `docs/templates/worker.md` so template changes prompt QA review.

## Prerequisites

- The runner has read `docs/templates/worker.md`.
- `_example-setup-test-dir` has created an isolated workspace.
- `_example-bootstrap-env` has prepared local env vars and ports.
- `bun` is available.
- `agent-browser` is available when the worker serves a UI.

## Steps

1. Create a worker app skeleton from the template.

   **Action:** In the isolated workspace, create the files described by the worker template's project
   structure.

   **Expected:** The app includes `src/worker.ts`, handlers, service definitions, layers, tagged
   errors, and queue adapters.

   **Verify:** Compare the generated tree to `docs/templates/worker.md`.

2. Start the worker.

   **Action:** Run the worker development command with local queue settings.

   **Expected:** The process reaches the scaffold's documented local ready state.

   **Verify:** Save startup logs and the process command in `packages/qa/results/`.

3. Process a message.

   **Action:** Enqueue or otherwise provide one sample message to the worker.

   **Expected:** The worker handles the message, acknowledges success, and records any expected side
   effects.

   **Verify:** Capture logs or state proving the handler ran according to
   `docs/templates/worker.md`.

4. Inspect optional browser-visible output.

   **Action:** If the worker serves HTML, open the local status URL with `agent-browser`. If testing
   an already-running Electron shell, connect to its CDP port with `agent-browser connect 9222`.

   **Expected:** The page shows the worker-visible status implemented by the scaffold.

   **Verify:** Save a screenshot or browser observation notes in `packages/qa/results/`.

5. Stop the worker.

   **Action:** Send the normal shutdown signal.

   **Expected:** Scoped resources finalize and the process exits cleanly.

   **Verify:** Capture shutdown logs and confirm the process exit code.

## Cleanup

- Stop any remaining worker or browser processes.
- Run `_example-cleanup` to remove the isolated workspace and temporary files.
