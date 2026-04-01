<!-- DO NOT EDIT FP_AGENTS.md: This file is managed by fp. Run 'fp setup agent' to update. -->

## FP Issue Tracking

This project uses **fp** for issue tracking. AI agents must follow these rules.

### Task Tracking

- Use `fp issue` for all task tracking - do not use built-in todo tools
- Create subissues with `--parent` flag - never use markdown checklists (`- [ ]`)
- Break work into atomic tasks (1-3 hours each)

### Work Session Flow

1. `fp issue list --status todo` - find available work
2. `fp issue update --status in-progress <id>` - claim it before starting
3. Work and commit frequently
4. `fp comment <id> "progress..."` - log at every milestone
5. `fp issue assign <id> --rev <commit>` - attach commits to the issue
6. `fp issue update --status done <id>` - mark complete when finished

### Commit Discipline

- Commit early and often with descriptive messages
- Always commit before session ends
- Always commit before context compaction

### Progress Logging

- Run `fp comment <id> "..."` at every milestone
- Log after significant commits
- Always leave a final comment before ending session

### Commands Reference

```bash
fp tree [parent-id]        # View issue hierarchy (optionally only show tree of parent-id)
fp issue list --status X   # Filter by status (todo/in-progress/done)
fp search <query>          # Search issues (AND by default, OR, "phrases", -negation)
fp issue create --title "..." --parent X --property key=value
fp issue update --status X <id> --property key=value
fp issue assign <id> --rev X  # Attach commit(s) to issue
fp comment <id> "message"
fp issue diff <id>         # See changes since task started
fp context <id>            # Load full issue context
fp extension docs          # Print the extensions authoring guide
```

### Extensions

FP is extensible via TypeScript extensions. Extensions can hook into lifecycle events (e.g., after issue creation, before commits) to automate workflows.

- Guide: `.fp/extensions/EXTENSIONS.md` (or run `fp extension docs` if the file is not present)
- Extensions live in `.fp/extensions/` as `.ts` files
