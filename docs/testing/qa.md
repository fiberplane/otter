# QA Scenarios

Otter includes a prose-first QA package at [packages/qa](../../packages/qa/README.md). Use it when
behavior needs validation above unit tests: CLI smoke flows, HTTP API checks, worker message
handling, browser-visible status pages, or end-to-end scaffolding checks.

Scenarios are markdown files with small YAML frontmatter and numbered steps. They are meant to be
readable by humans and executable by agents. They also use inline `@./` references so drift can bind
scenario prose to the templates or source files being exercised.

Write a QA scenario when:

- A template or app behavior needs a repeatable manual or agent-run smoke check.
- The behavior crosses a process boundary, such as CLI invocation, HTTP, queues, or browser UI.
- The expected result is better described as user-visible evidence than as a narrow unit assertion.

Do not use QA scenarios as a replacement for fast automated tests. Keep unit, integration, and
property tests near the code they exercise. Use `packages/qa` for scenario-level evidence and local
run artifacts.

For authoring details, frontmatter schema, example scenarios, helper conventions, result storage,
and UI-driving guidance, see [packages/qa/README.md](../../packages/qa/README.md).
