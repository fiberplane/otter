# Example Helper: Setup Test Directory

This is an example helper. Delete or replace it when real helpers exist.

## Purpose

Create an isolated workspace for a QA scenario so generated apps, temporary files, and dependency
installs do not modify the repository checkout.

## Inputs

- A scenario name.
- Optional base directory for temporary work.

## Steps

1. Create a fresh temporary directory named for the scenario and current timestamp.
2. Record the directory path in the scenario notes under `packages/qa/results/`.
3. Run all scaffold or app commands from that directory unless the scenario says otherwise.

## Outputs

- Path to the isolated workspace.
- A result note containing the path and creation time.

## Cleanup

- Remove the temporary directory after the scenario completes.
