<!-- This file is managed by fp init. Do not edit by hand. -->

## FP Issue Tracking

This project uses **fp** for issue tracking. AI agents must follow these rules.

## Workflow Primers

Bundled how-to guides for common agent workflows. Print them on demand:

```bash
fp guide              # List available primers
fp guide plan         # Planning workflow (alias: planning)
fp guide implement    # Implementation workflow
fp guide brainstorm   # Brainstorm authoring (alias: bs)
fp guide extension    # Extension authoring (aliases: extensions, ext)
```

Some primers bundle references reachable via `--references`, e.g. `fp guide brainstorm --references mermaid` for the Mermaid diagram guide.

### Task Tracking

- Use `fp issue` for all task tracking - do not use built-in todo tools
- Create subissues with `--parent` flag - never use markdown checklists (`- [ ]`)
- Break work into atomic tasks (1-3 hours each)

### Work Session Flow

1. `fp issue list --status todo` - find available work
2. `fp issue update --status in-progress <id>` - claim it before starting
3. `fp comment <id> "progress..."` - log at every milestone
4. `fp issue update --status done <id>` - mark complete when finished

When you commit work, mention the fp issue in the message, unless otherwise instructed.

### Progress Logging

- Run `fp comment <id> "..."` at every milestone
- Write comments after significant commits
- Always leave a final comment before ending session

### Commands Reference

```bash
fp tree [parent-id]        # View issue hierarchy (optionally only show tree of parent-id)
fp issue list --status X   # Filter by status (todo/in-progress/done)
fp search <query>          # Search issues (AND by default, OR, "phrases", -negation)
fp issue create --title "..." --parent X --property key=value
fp issue update --status X <id> --property key=value
fp comment <id> "message"
fp context <id>            # Load full issue context
fp guide extension         # Print the extensions authoring guide
fp guide brainstorm        # Print the brainstorm-authoring guide
```

### Flag Conventions

- Standard attributes use dedicated flags: `--status`, `--priority`, `--parent`, `--title`, `--description`
- `--property key=value` is for **extension-registered custom properties only** (e.g., labels, env, notes)
- Do not use `--property` for standard attributes — use the dedicated flags instead

### Extensions

FP is extensible via TypeScript extensions. Extensions can hook into issue and comment lifecycle events (e.g., before marking issues done, after comments are added) to automate workflows.

- Guide: `.fp/extensions/EXTENSIONS.md` (or run `fp guide extension` if the file is not present)
- Extensions live in `.fp/extensions/` as `.ts` files

### Brainstorms

Brainstorm plans (`fp brainstorm create` / `fp bs create`) support a rich markdown + Mermaid authoring surface. Before writing or editing one, load the bundled authoring docs:

- `fp guide brainstorm` — entrypoint; read this first
- `fp guide brainstorm --references mermaid` — diagram authoring reference
