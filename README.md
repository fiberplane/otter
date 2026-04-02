<p align="center">
  <img src="otter.png" alt="otter" width="200" />
</p>

# otter

Effect.ts monorepo template with agent-friendly tooling for code quality, documentation, and work tracking.

This is a "light factory" — a starter repo that provides structure, conventions, and enforcement so that AI agents (and humans) can build Effect.ts applications with guardrails already in place.

## Tools

| Tool | Role |
|------|------|
| [bun](https://bun.sh) | Package manager and runtime |
| [Biome](https://biomejs.dev) | Linting and formatting |
| [ast-grep](https://ast-grep.github.io) | Custom TypeScript lint rules (Effect-specific patterns) |
| [drift](https://github.com/fiberplane/drift) | Binds documentation specs to source code; detects when docs go stale |
| [fp](https://fp.dev) | Local-first issue tracking with lifecycle extensions |

## Structure

```
apps/           Deployable applications (CLIs, APIs, workers)
packages/       Internal shared packages
docs/           Conventions, templates, architecture notes
rules/          ast-grep lint rules (shared + Effect-specific)
.fp/extensions/ fp lifecycle extensions
.codex/         Codex sandbox configuration
references/     Shallow clones of upstream repos (gitignored, local-only)
```

## Getting started

```bash
bun install
```

See `AGENTS.md` for the full command reference, enforcement rules, and conventions.

## fp extensions

Extensions in `.fp/extensions/` hook into fp's issue lifecycle to enforce workflow quality.

### auto-done

Manages parent/child issue lifecycle automatically.

- **Pre-hook**: blocks marking a parent issue as done if any children are still open
- **Post-hook**: when the last child is marked done, auto-marks the parent done

### check-before-done

Gates the done transition on passing checks.

Runs `bun run check` (ast-grep + drift + typecheck) before allowing an issue to move to done. Configurable via `.fp/config.toml`:

```toml
[extensions.check-before-done]
checks = "bun run check"  # comma-separated commands
```

### done-reminder

Prints a reminder to stderr when an issue transitions to done, prompting the agent to:

- Run code review (via subagent) if the work was non-trivial
- Update `docs/` with architectural or flow decisions, using the drift skill to link specs to relevant source files
