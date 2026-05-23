---
name: Example worker template smoke scenario
requires:
  - bun
depends-on:
  - _example-setup-test-dir
  - _example-bootstrap-env
tags:
  - worker
---

# Example Worker Template Smoke Scenario

This is an example scenario. Delete or replace it when real worker scenarios exist.

## Goals

- Confirm a worker app authored from the worker template has the expected structure.
- If the consumer supplies runnable worker details, smoke-test message handling and shutdown.
- Keep the scenario tied to `docs/templates/worker.md` so template changes prompt QA review.

## Prerequisites

- The runner has read `docs/templates/worker.md`.
- `_example-setup-test-dir` has created an isolated workspace.
- `_example-bootstrap-env` has prepared any env vars or ports listed by the consumer scenario.
- `bun` is available.

## Steps

1. Create a worker app skeleton from the template.

   **Action:** In the isolated workspace, create the files described by the worker template's project
   structure.

   **Expected:** The app includes `src/worker.ts`, handlers, service definitions, layers, tagged
   errors, and queue adapters.

   **Verify:** Compare the generated tree to `docs/templates/worker.md`.

2. If runnable worker details exist, start the worker.

   **Action:** Start the worker using the local command and queue setup chosen for the generated app.

   **Expected:** The process starts without errors; logs or process state show it is ready for local
   messages.

   **Verify:** Save startup logs and the process command in `packages/qa/results/`.

3. If message details exist, process a message.

   **Action:** Use the consumer scenario's documented message shape and enqueue mechanism.

   **Expected:** The worker handles the message and records the documented logs or state changes.

   **Verify:** Capture logs or state proving the handler ran according to
   `docs/templates/worker.md`.

4. If a worker process was started, stop it.

   **Action:** Send the app's normal shutdown signal.

   **Expected:** Scoped resources finalize and the process exits cleanly.

   **Verify:** Capture shutdown logs and confirm the process exit code.

## Cleanup

- Stop any remaining worker processes.
- Run `_example-cleanup` to remove the isolated workspace and temporary files.
