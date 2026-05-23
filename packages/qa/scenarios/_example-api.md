---
name: Example API template smoke scenario
requires:
  - bun
  - curl
depends-on:
  - _example-setup-test-dir
  - _example-bootstrap-env
tags:
  - api
---

# Example API Template Smoke Scenario

This is an example scenario. Delete or replace it when real API scenarios exist.

## Goals

- Confirm an API app authored from the API template has the expected structure.
- If the consumer supplies runnable app details, smoke-test one documented route.
- Keep the scenario tied to `docs/templates/api.md` so template changes prompt QA review.

## Prerequisites

- The runner has read `docs/templates/api.md`.
- `_example-setup-test-dir` has created an isolated workspace.
- `_example-bootstrap-env` has prepared any local env vars required by the scaffold.
- `bun` and `curl` are available.

## Steps

1. Create an API app skeleton from the template.

   **Action:** In the isolated workspace, create the files described by the API template's project
   structure.

   **Expected:** The app includes a boundary entry point, route files, service definitions, layers,
   tagged errors, and adapter files.

   **Verify:** Compare the generated tree to `docs/templates/api.md`.

2. Start the API locally.

   **Action:** Start the API using the local command chosen for the generated app, on an unused local
   port.

   **Expected:** The process starts without errors and is ready to receive HTTP requests on the
   selected local port.

   **Verify:** Save the startup command, port, and logs in `packages/qa/results/`.

3. Exercise a route.

   **Action:** Send an HTTP request to a generated route group, such as the health route if the
   scaffold implemented one.

   **Expected:** The route returns the status and response body defined by the generated app's route
   code.

   **Verify:** Capture the full request and response, including status, headers, and body.

4. Exercise an error response.

   **Action:** Send a request that triggers a scaffolded validation or not-found error.

   **Expected:** The boundary maps the tagged error to the documented HTTP status.

   **Verify:** Capture the response and compare it with the error-response guidance in
   `docs/templates/api.md`.

## Cleanup

- Stop the local API process.
- Run `_example-cleanup` to remove the isolated workspace and temporary files.
