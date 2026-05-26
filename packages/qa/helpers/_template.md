# Copyable QA Helper Template

This is not a real helper. Copy it to a new filename without the `_` prefix, then replace every
section with helper-specific content.

## Purpose

State, in one or two sentences, what this helper prepares or cleans up and which scenarios use it.

## Inputs

- List the scenario inputs the helper expects (paths, env vars, tool versions, ports, credentials).
- Note which inputs are required versus optional, with sensible defaults.

## Steps

1. Describe the first action the helper performs.
2. Continue with each ordered action the helper must complete.
3. Mention any safety checks the helper should run before proceeding.

## Outputs

- List what the helper produces or guarantees: directories, env var values, port assignments,
  generated credentials, recorded notes.
- Name any artifact that should be written under `packages/qa/results/`.

## Cleanup

- Describe how to undo what this helper set up.
- Note anything that cannot be safely auto-cleaned and must be reviewed by a human.
