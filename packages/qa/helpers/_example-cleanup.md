# Example Helper: Cleanup

This is an example helper. Delete or replace it when real helpers exist.

## Purpose

Return the local machine and repository checkout to the state they were in before a scenario ran.

## Inputs

- Isolated workspace path.
- Process IDs or ports started during the scenario.
- Result artifact paths to keep.

## Steps

1. Stop local services started by the scenario.
2. Remove temporary workspaces and generated files outside `packages/qa/results/`.
3. Leave result artifacts in place for review.
4. Record cleanup actions and any leftovers in the scenario result notes.

## Outputs

- Cleanup status.
- List of artifacts retained for review.
- List of any resources that still require manual cleanup.
