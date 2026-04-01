---
name: fp-review
description: Review code, create stories, and ensure commits are assigned to issues. Use when user asks to "review code", "assign commits", "check commits are assigned", "prepare for review", "create a story", or "write a story".
metadata:
  fp_skill_version: "1.0.0"
  fp_bundle_version: "2026-02-23"
  fp_cli_min: "0.14.0"
---

# FP Review Skill

**Ensure commits are properly linked to issues and provide review feedback.**

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

## Core Purpose

1. Verify commits are assigned to the correct issues
2. Leave review comments on issues
3. Open interactive review in the desktop app
4. Create stories — narrative documents that walk through code changes

---

## Assigning Commits to Issues

### Check Current Assignments

```bash
fp issue files <PREFIX>-X
```

If empty, the issue has no commits assigned.

### Find Relevant Commits

```bash
jj log --limit 20        # Jujutsu
git log --oneline -20    # Git
```

### View Commit Details

```bash
jj show <commit-id>      # Jujutsu
git show <hash> --stat   # Git
```

### Match Commits to Issues

Compare:
- Files changed in commit vs issue description
- Commit message content vs issue title
- Code changes vs issue requirements

### Assign Commits

**Before assigning commits, confirm with the user.** Some users prefer to work without committing until they're done, or may not want commits linked to issues.

Use `AskUserTool` to ask:
> I found these commits that appear related to `<PREFIX>-X`:
> - `abc123` - Add user model
> - `def456` - Implement auth middleware
>
> Would you like me to assign them to the issue? (If you prefer to review uncommitted changes instead, you can run `fp review` for the working copy.)

If confirmed:

```bash
# Single commit
fp issue assign <PREFIX>-X --rev abc123

# Multiple commits
fp issue assign <PREFIX>-X --rev abc123,def456,ghi789

# Current HEAD
fp issue assign <PREFIX>-X

# Reset and reassign
fp issue assign <PREFIX>-X --reset
fp issue assign <PREFIX>-X --rev abc123,def456
```

### Verify Assignment

```bash
fp issue files <PREFIX>-X
fp issue diff <PREFIX>-X --stat
```

---

## Leaving Review Comments

Use `fp comment` for review feedback. Reference files and lines for specificity.

### File-Specific Comments

```bash
fp comment <PREFIX>-X "**src/utils/parser.ts**: Consider extracting the validation logic into a separate function for testability."

fp comment <PREFIX>-X "**src/api/handler.ts:45-60**: This error handling could swallow important exceptions. Suggest re-throwing after logging."
```

### Severity Prefixes

Use prefixes to indicate importance:

```bash
fp comment <PREFIX>-X "[blocker] **src/auth.ts**: Missing input sanitization creates SQL injection risk."

fp comment <PREFIX>-X "[suggestion] **src/utils.ts:23**: Could use optional chaining here for cleaner code."

fp comment <PREFIX>-X "[nit] **README.md**: Typo in setup instructions."
```

- `[blocker]` - Must fix before merging
- `[suggestion]` - Recommended improvement
- `[nit]` - Minor/cosmetic issue

### General Comments

```bash
fp comment <PREFIX>-X "Overall looks good. Main concern is the error handling in the API layer - see specific comments above."
```

---

## Interactive Review (Desktop App)

`fp review` opens the Fiberplane desktop app for interactive diff review.

**Requires the desktop app.** If not installed: https://setup.fp.dev/desktop/latest/

### Review Working Copy (No Commits Needed)

If the user hasn't committed yet (or prefers not to commit while work is in progress):

```bash
fp review
```

This shows all uncommitted changes in the working directory. No commit assignment required.

### Review by Issue

```bash
fp review <PREFIX>-X
```

**Note:** For issue-based review to work, the issue must have commits assigned. If no commits are assigned, either:
1. Assign commits first with `fp issue assign`, OR
2. Use `fp review` to review the working copy instead

### Review with Story

```bash
fp review <PREFIX>-X --with-story
```

Opens the review with the story panel visible alongside the diff. The issue must have a story created for it.

### Other Review Targets

```bash
fp review git:abc123           # Specific git commit
fp review jj:abc123            # Specific jj revision
fp review git:abc123..def456   # Range of commits
```

---

## Review Workflow

### Step 1: Check Assignments

```bash
fp issue files <PREFIX>-X
```

### Step 2: Assign Missing Commits

```bash
jj log --limit 20
fp issue assign <PREFIX>-X --rev abc,def
```

### Step 3: View the Diff

```bash
fp issue diff <PREFIX>-X --stat   # Overview
fp issue diff <PREFIX>-X          # Full diff
fp review <PREFIX>-X              # Open in desktop app
```

### Step 4: Leave Comments

```bash
fp comment <PREFIX>-X "**file.ts:line**: feedback"
```

---

## Stories

Stories are narrative documents that walk a reviewer through code changes. They combine markdown prose with embedded diffs, file excerpts, and chat transcripts.

**Requires the `experimental_story` feature flag:**
```bash
fp feature enable experimental_story
```

### Creating a Story

```bash
# From a file
fp story create <PREFIX>-X --file story.md

# From stdin
cat story.md | fp story create <PREFIX>-X
```

The first `## ` heading in the markdown becomes the story title.

### Story Format

Stories are markdown documents that use directives to embed code artifacts:

#### Diff Directive

Shows file changes from the issue's assigned commits:

```markdown
## Moved validation to a shared module

The old approach duplicated validation in each handler.

:::diff{file="src/validation.ts"}
Extracted from handler.ts and api.ts into a single module.
:::
```

- `file` (required): relative path to the changed file
- The text between `:::diff` and `:::` is the annotation — keep it to 1-2 sentences

#### File Directive

Shows file content (or a slice of it):

```markdown
:::file{path="src/config.ts" lines="10-25"}
The new defaults that drive the behavior change.
:::
```

- `path` (required): relative path to file
- `lines` (optional): line range, e.g. `"10-25"`

#### Chat Directive

Embeds excerpts from an AI coding session:

```markdown
:::chat{source="claude" session="/path/to/session.jsonl" messages="msg1,msg2"}
The key design discussion that led to this approach.
:::
```

- `source`: `"claude"`, `"pi"`, or `"opencode"`
- `session`: full path to session file
- `messages`: comma-separated message IDs

### Writing Guidelines

- **Headings are past-tense verbs** — describe what was done, not what to do (e.g. "Moved validation to a shared module")
- **Start with the user problem** — the opening prose should explain why the change exists
- **Show diff, then explain** — lead with the `:::diff` directive, follow with the annotation
- **Annotations are 1-2 sentences** — brief context, not a full explanation

### UI Support

Only `:::diff` is fully rendered in the desktop app right now. `:::file` works but the `collapsed` attribute is ignored. The `hunks` attribute on `:::diff` is also ignored.

### Managing Stories

```bash
fp story list                    # List all stories in the project
fp story get <story-id>          # Get story details (supports ID prefix)
fp story get <PREFIX>-X          # Get story by issue ID
fp story delete <story-id>       # Delete a story (supports ID prefix)
fp story delete <story-id> --yes # Skip confirmation
```

One story per issue. Creating a new story for an issue replaces the previous one.

---

## Quick Reference

### Commands

```bash
# Check assignments
fp issue files <PREFIX>-X

# Assign commits
fp issue assign <PREFIX>-X --rev <commits>

# View changes
fp issue diff <PREFIX>-X --stat
fp issue diff <PREFIX>-X

# Leave comments
fp comment <PREFIX>-X "message"

# Interactive review (desktop app)
fp review <PREFIX>-X

# Stories
fp story create <PREFIX>-X --file story.md
fp story list
fp story get <PREFIX>-X
fp story delete <story-id>
fp review <PREFIX>-X --with-story
```

### Comment Format

```
**filepath**: general comment about file
**filepath:line**: comment about specific line
**filepath:start-end**: comment about line range
[severity] **filepath**: prefixed comment
```

### Severity Levels

- `[blocker]` - Must fix
- `[suggestion]` - Should consider
- `[nit]` - Minor issue
