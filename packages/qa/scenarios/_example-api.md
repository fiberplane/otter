---
name: Example API template smoke scenario
requires:
  - bun
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
- `_example-bootstrap-env` has prepared any env vars or ports listed by the consumer scenario.
- `bun` is available.
- `curl` or another HTTP client is available if the optional route exercise will run.

## Steps

1. Create an API app skeleton from the template.

   **Action:** In the isolated workspace, create the files described by the API template's project
   structure.

   **Expected:** The app includes a boundary entry point, route files, service definitions, layers,
   tagged errors, and adapter files.

   **Verify:** Compare the generated tree to `docs/templates/api.md`.

2. If runnable app details exist, start the API locally.

   **Action:** If the generated app includes a chosen HTTP framework, route implementation, and local
   start command, start it on an unused local port.

   **Expected:** The process starts without errors and is ready to receive HTTP requests on the
   selected local port.

   **Verify:** Save the startup command, port, and logs in `packages/qa/results/`.

3. If a route exists, exercise it.

   **Action:** Send an HTTP request to a generated route group, such as the health route if the
   scaffold implemented one.

   **Expected:** The route returns the status and response body defined by the generated app's route
   code.

   **Verify:** Capture the full request and response, including status, headers, and body.

4. If error handling exists, exercise an error response.

   **Action:** Send a request that triggers a scaffolded validation or not-found error.

   **Expected:** The boundary maps the tagged error to the documented HTTP status.

   **Verify:** Capture the response and compare it with the error-response guidance in
   `docs/templates/api.md`.

## Cleanup

- Stop the local API process if one was started.
- Run `_example-cleanup` to remove the isolated workspace and temporary files.
