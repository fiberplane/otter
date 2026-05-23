---
name: Copyable QA scenario template
requires: []
depends-on: []
tags: []
---

# Copyable QA Scenario Template

This is not a real scenario. Copy it to a new filename without the `_` prefix, then replace every
section with product-specific behavior.

## Goals

- State the user-visible behavior this scenario validates.
- Name any template, source file, or doc the scenario depends on, then bind it with
  `drift link <scenario> <target>`.

## Prerequisites

- List required tools, env vars, credentials, seeded data, and running services.
- List helpers from `depends-on` and what each helper prepares.

## Steps

1. Start from a clean state.

   **Action:** Describe the command, request, browser interaction, or manual action.

   **Expected:** Describe the visible or measurable outcome.

   **Verify:** Describe exactly how to confirm the expected outcome.

2. Exercise the behavior under test.

   **Action:** Describe the main action.

   **Expected:** Describe the success state and any important side effects.

   **Verify:** Describe the command, UI observation, log line, file, or response to inspect.

## Cleanup

- Undo data, files, services, and environment changes created by the scenario.
