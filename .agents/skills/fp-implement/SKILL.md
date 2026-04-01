---
name: fp-implement
description: Implement work on issues. Use when user asks to "start working on issue", "what should I work on", "pick up task", "continue work", or "find next task".
---

# FP Implement Skill

**Find, claim, and complete work on issues.**

## Prerequisites

Before using fp commands, check setup:

```bash
# Check if fp is installed
fp --version
```

**If fp is not installed**, tell the user:
> The `fp` CLI is not installed. Install it with:
> ```bash
> curl -fsSL https://setup.fp.dev/install.sh | sh -s
> ```

```bash
# Check if project is initialized
fp tree
```

**If project is not initialized**, ask the user if they want to initialize:
> This project hasn't been initialized with fp. Would you like to initialize it?

If yes:
```bash
fp init
```

---

## Core Workflow

```
1. Find work     → fp tree, fp issue list --status todo
2. Claim work    → fp issue update --status in-progress <PREFIX>-X
3. Do work       → implement the task
4. Comment often → fp comment <PREFIX>-X "progress update"
5. Complete      → fp issue update --status done <PREFIX>-X
```

---

## Finding Work

### See the Full Picture

```bash
fp tree
```

Shows all issues with hierarchy, status, and dependencies.

```bash
fp tree --status todo
```

Shows only todo items (filters out done work).

```bash
fp tree <PREFIX>-X
```

Shows a specific issue and its children - useful for focusing on one feature/epic.

### List by Status

```bash
fp issue list --status todo          # Available to pick up
fp issue list --status in-progress   # Currently active
fp issue list --status done          # Completed
fp issue list                        # All issues
```

### Pick the Right Task

Look for tasks that:
- Have status `todo`
- Have no dependencies, OR all dependencies are `done`
- Match your current focus/expertise

---

## Claiming Work

### Mark as In-Progress

```bash
fp issue update --status in-progress <PREFIX>-2
```

This captures the current VCS state as the starting point for tracking changes.

### Log That You're Starting

```bash
fp comment <PREFIX>-2 "Starting work. First step: implement the User model schema"
```

### Load Context

```bash
fp context <PREFIX>-2
```

Shows issue details, description, and related information.

---

## During Work

### Comment Frequently

Log progress at key milestones:

```bash
fp comment <PREFIX>-2 "Completed schema design. Added User, Session, Token models to src/models/"

fp comment <PREFIX>-2 "Hit a snag: OAuth library doesn't support refresh tokens out of the box. Investigating alternatives."

fp comment <PREFIX>-2 "Resolved: using custom refresh logic. Proceeding with implementation."
```

**When to comment:**
- When you start a task
- When you complete a significant milestone
- When you discover important information
- When you encounter problems
- When you finish work

### Check Progress

```bash
fp issue diff <PREFIX>-2 --stat   # Quick view of changed files
fp issue files <PREFIX>-2         # List files changed
fp issue diff <PREFIX>-2          # Full diff
```

---

## Completing Work

### Mark as Done

```bash
fp issue update --status done <PREFIX>-2
```

This captures the current VCS state as the endpoint.

### Add Completion Comment

```bash
fp comment <PREFIX>-2 "Task completed. Implemented User, Session, and Token models with Drizzle ORM. All tests passing."
```

---

## Continuing Previous Work

### Find In-Progress Work

```bash
fp issue list --status in-progress
```

### Load Context

```bash
fp context <PREFIX>-5
```

### Review Recent Activity

```bash
fp log <PREFIX>-5 --limit 5
```

### See What's Changed

```bash
fp issue diff <PREFIX>-5 --stat
```

### Resume

```bash
fp comment <PREFIX>-5 "Resuming work. Current focus: finishing the error handling logic"
```

---

## Breaking Down Work

If a task is too large, break it down:

```bash
# Create sub-tasks
fp issue create --title "Part 1: Setup" --parent <PREFIX>-4
fp issue create --title "Part 2: Implementation" --parent <PREFIX>-4 --depends "<PREFIX>-10"
fp issue create --title "Part 3: Tests" --parent <PREFIX>-4 --depends "<PREFIX>-11"

# Document
fp comment <PREFIX>-4 "Broke down into sub-tasks: <PREFIX>-10, <PREFIX>-11, <PREFIX>-12. Working on <PREFIX>-10 first."

# Work on sub-tasks
fp issue update --status in-progress <PREFIX>-10
```

---

## Viewing Changes

### For a Single Issue

```bash
fp issue diff <PREFIX>-2           # Full diff since task started
fp issue diff <PREFIX>-2 --stat    # Just file stats
fp issue files <PREFIX>-2          # List of changed files
```

### For Parent Issues

For parent issues with children, these commands aggregate changes from all descendants:

```bash
fp issue diff <PREFIX>-1 --stat    # All changes across child tasks
fp issue files <PREFIX>-1          # All files changed by descendants
```

---

## Quick Reference

### Essential Commands

```bash
# Find work
fp tree                              # Full hierarchy
fp tree --status todo                # Only todo items
fp tree <PREFIX>-X                   # Focus on one issue
fp issue list --status todo          # List available tasks

# Claim work
fp issue update --status in-progress <PREFIX>-X
fp context <PREFIX>-X

# Log progress
fp comment <PREFIX>-X "message"

# View changes
fp issue diff <PREFIX>-X --stat
fp issue files <PREFIX>-X

# Complete
fp issue update --status done <PREFIX>-X

# Activity
fp log --limit 10
fp log <PREFIX>-X
```

### Status Values

- `todo` - Not started
- `in-progress` - Actively being worked on
- `done` - Completed

### Priority Values (optional)

- `critical` - Blocking other work
- `high` - Important, do soon
- `medium` - Normal priority
- `low` - Nice to have

```bash
fp issue update --priority high <PREFIX>-X
```
