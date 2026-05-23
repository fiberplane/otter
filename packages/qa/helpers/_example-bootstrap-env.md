# Example Helper: Bootstrap Environment

This is an example helper. Delete or replace it when real helpers exist.

## Purpose

Prepare local environment variables, ports, and placeholder credentials required by a scenario.

## Inputs

- Scenario name.
- Tools, services, environment variables, or credentials listed in the scenario's `requires`
  entries.
- Preferred local ports or port constraints from prerequisites, if any.

## Steps

1. Choose unused local ports for services started by the scenario.
2. If the scenario lists environment variables, export local-safe values for them before the scenario
   starts.
3. Write the non-secret env var names and local port assignments to `packages/qa/results/`.
4. Confirm required tools are available before the scenario starts.

## Outputs

- Environment variable names and any non-secret local values safe for result notes.
- Port assignments.
- Tool availability notes.

## Cleanup

- Unset temporary env vars.
- Stop processes that were started only for environment bootstrap.
