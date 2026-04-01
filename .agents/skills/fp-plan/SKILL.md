---
name: fp-plan
description: Create and break down plans into trackable issues. Use when user asks to "create a plan", "break down feature", "design implementation", "structure this work", or pastes a Linear/GitHub/Notion URL to import.
---

# FP Plan Skill

**Create plans and break them down into trackable issues.**

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

## When This Skill Triggers

1. User asks to "create a plan", "break down feature", "design implementation"
2. User pastes a **Linear**, **GitHub**, or **Notion** URL (import external issue/doc)
3. User runs `/plan` with no arguments (interactive plan import from `~/.claude/plans/`)

---

## Importing from External Sources

### Detecting URLs

When user pastes a URL, detect the source and fetch content:

**GitHub Issues** (`github.com/owner/repo/issues/123`):
```bash
gh issue view <url> --json title,body,labels,state
```

**Linear Issues** (`linear.app/team/issue/TEAM-123`):
Extract the issue ID (e.g., `TEAM-123`) from the URL, then use the `get_issue` MCP tool from the Linear server.

**Notion Pages** (`notion.so/...`):
Use the `notion-fetch` MCP tool from the Notion server with the full URL or page ID.

### After Fetching

Create an FP issue from the extracted content:
```bash
fp issue create \
  --title "<extracted title>" \
  --description "<extracted body/content>"
```

Then offer to break it down into subtasks (see Planning Workflow below).

---

## Interactive Plan Import (when `/plan` invoked alone)

When user runs `/plan` with no additional text:

1. **Check for existing plans**:
   ```bash
   ls -la ~/.claude/plans/*.md 2>/dev/null
   ```

2. **If plans exist**, use `AskUserTool` to prompt:
   > Found plans in ~/.claude/plans/:
   > 1. moonlit-brewing-lynx.md
   > 2. swift-falcon-auth.md
   > 3. [Create new plan instead]
   >
   > Which plan would you like to import?

3. **Parse the selected plan**:
   - Extract title from first `#` heading
   - Strip "Plan: " prefix if present
   - Identify numbered lists or `##` sections as potential subtasks

4. **Create issues**:
   - Parent issue with full plan content as description
   - Subtasks for each identified section/step

---

## Planning Workflow

### Core Concept: Plans are Issues

In FP, a plan is just an issue that:
- Has a comprehensive description (the plan document)
- Has child issues (the tasks/subtasks)
- May have dependencies between children

### Issue Hierarchy

```
Plan (Parent Issue)
├── Task 1 (Child Issue)
│   ├── Sub-task 1.1 (Grandchild)
│   └── Sub-task 1.2 (Grandchild)
├── Task 2 (Child Issue)
└── Task 3 (Child Issue)
```

Typical depth: 2-3 levels (Plan → Task → Subtask).

### Dependency Modeling

- **Serial**: Task B depends on Task A (`--depends`)
- **Parallel**: No dependencies (can run concurrently)
- **Fan-out/Fan-in**: Multiple dependencies

---

## Step-by-Step Planning

### Step 1: Create the Plan Issue

```bash
fp issue create \
  --title "Add user authentication system" \
  --description "Implement OAuth2 authentication with GitHub provider.

Goals:
- Support GitHub OAuth login
- Store user sessions securely
- Provide middleware for protected routes

Technical approach:
- Use Cloudflare D1 for session storage
- OAuth2 library for GitHub integration
- JWT tokens for session management

Success criteria:
- Users can log in with GitHub
- Sessions persist across requests
- Protected routes require authentication"
```

This creates `<PREFIX>-1`.

### Step 2: Break Down Into Tasks

```bash
# Foundation: Data models
fp issue create \
  --title "Design and implement data models" \
  --parent <PREFIX>-1 \
  --description "Create TypeScript schemas and database tables for User, Session, and Token models.

Details:
- User model: id, githubId, email, name, avatarUrl
- Session model: id, userId, token, expiresAt
- Token model: id, userId, accessToken, refreshToken, expiresAt

Files to modify:
- src/models/user.ts
- src/models/session.ts
- src/models/token.ts
- drizzle/schema.ts"
```

Creates `<PREFIX>-2` as child of `<PREFIX>-1`.

```bash
# OAuth integration (depends on data models)
fp issue create \
  --title "Implement GitHub OAuth flow" \
  --parent <PREFIX>-1 \
  --depends "<PREFIX>-2" \
  --description "Set up OAuth2 flow with GitHub:
- Redirect to GitHub authorization
- Handle callback with authorization code
- Exchange code for access token
- Fetch user info from GitHub API

Files:
- src/auth/oauth.ts (new)
- src/routes/auth.ts (new)"
```

Creates `<PREFIX>-3`, dependent on `<PREFIX>-2`.

```bash
# Session management (depends on models + OAuth)
fp issue create \
  --title "Implement session management" \
  --parent <PREFIX>-1 \
  --depends "<PREFIX>-2,<PREFIX>-3" \
  --description "Create session creation, validation, and cleanup logic.

Features:
- Create session on successful login
- Validate session on each request
- Refresh expired sessions
- Clean up old sessions

Files:
- src/auth/session.ts (new)
- src/middleware/auth.ts (new)"
```

Creates `<PREFIX>-4`, dependent on both `<PREFIX>-2` and `<PREFIX>-3`.

```bash
# Frontend UI (depends on session management)
fp issue create \
  --title "Add login UI components" \
  --parent <PREFIX>-1 \
  --depends "<PREFIX>-4" \
  --description "Create React components for authentication:
- Login button (redirects to OAuth)
- User profile dropdown
- Logout button

Files:
- app/components/LoginButton.tsx (new)
- app/components/UserProfile.tsx (new)
- app/components/LogoutButton.tsx (new)"
```

Creates `<PREFIX>-5`, dependent on `<PREFIX>-4`.

```bash
# Testing and docs (depends on implementation)
fp issue create \
  --title "Testing and documentation" \
  --parent <PREFIX>-1 \
  --depends "<PREFIX>-4,<PREFIX>-5" \
  --description "Write tests and documentation:
- Unit tests for auth logic
- Integration tests for OAuth flow
- Update README with setup instructions

Files:
- src/auth/__tests__/*.test.ts (new)
- README.md
- .env.example"
```

Creates `<PREFIX>-6`, dependent on `<PREFIX>-4` and `<PREFIX>-5`.

### Step 3: Visualize and Verify

```bash
fp tree
```

Shows full hierarchy. Expected output:
```
<PREFIX>-1 [todo] Add user authentication system
├── <PREFIX>-2 [todo] Design and implement data models
├── <PREFIX>-3 [todo] Implement GitHub OAuth flow
│   └── blocked by: <PREFIX>-2
├── <PREFIX>-4 [todo] Implement session management
│   └── blocked by: <PREFIX>-2, <PREFIX>-3
├── <PREFIX>-5 [todo] Add login UI components
│   └── blocked by: <PREFIX>-4
└── <PREFIX>-6 [todo] Testing and documentation
    └── blocked by: <PREFIX>-4, <PREFIX>-5
```

To focus on just the plan you created:
```bash
fp tree <PREFIX>-1
```

To see only remaining work:
```bash
fp tree --status todo
```

### Step 4: Iterate and Refine

```bash
# Add missing dependency
fp issue update --depends "<PREFIX>-2,<PREFIX>-4" <PREFIX>-5

# Break down large task further
fp issue create \
  --title "OAuth callback handler" \
  --parent <PREFIX>-3 \
  --description "Handle OAuth callback and exchange code for token"

fp issue create \
  --title "GitHub user info fetcher" \
  --parent <PREFIX>-3 \
  --description "Fetch user profile from GitHub API"

# Document the breakdown
fp comment <PREFIX>-3 "Broke down into sub-tasks: <PREFIX>-10, <PREFIX>-11"
```

---

## Best Practices

### Make Tasks Atomic

Each task should:
- Be completable in one work session (1-3 hours)
- Have a clear definition of "done"
- Touch a small, focused set of files

### Write Clear Descriptions

Include:
- **What**: Brief summary of the task
- **Why**: Context or rationale
- **How**: Technical approach or key steps
- **Files**: Where the work happens
- **Done**: Definition of done

### Task Creation Template

```bash
fp issue create \
  --title "[Clear, specific title]" \
  --parent "[Parent issue ID]" \
  --depends "[Comma-separated dependency IDs]" \
  --priority "[low|medium|high|critical]" \
  --description "
What: [What needs to be done]
Why: [Context or rationale]
How: [Technical approach]
Files: [Key files to modify]
Done: [Definition of done]
"
```

---

## Updating Plans Mid-Execution

### Adding New Tasks

```bash
fp issue create \
  --title "Add token refresh logic" \
  --parent <PREFIX>-1 \
  --depends "<PREFIX>-3"

# Update dependent tasks
fp issue update --depends "<PREFIX>-2,<PREFIX>-3,<PREFIX>-7" <PREFIX>-4
```

### Adjusting Dependencies

```bash
# Replace entire dependency list
fp issue update --depends "<PREFIX>-2" <PREFIX>-5

# To add without removing, include all existing + new
fp issue show <PREFIX>-5  # Check current deps
fp issue update --depends "<PREFIX>-2,<PREFIX>-4,<PREFIX>-6" <PREFIX>-5
```

### Splitting Large Tasks

```bash
# Create sub-tasks
fp issue create --title "OAuth redirect handler" --parent <PREFIX>-3
fp issue create --title "OAuth callback handler" --parent <PREFIX>-3 --depends "<PREFIX>-10"
fp issue create --title "User info fetcher" --parent <PREFIX>-3 --depends "<PREFIX>-11"

# Document
fp comment <PREFIX>-3 "Broke down into sub-tasks: <PREFIX>-10, <PREFIX>-11, <PREFIX>-12"
```

---

## Anti-Patterns

### ❌ Using markdown task lists instead of subissues

```markdown
# BAD: Checkboxes in description
- [ ] Create directory
- [ ] Set up package.json
- [ ] Configure build
```

Checkboxes aren't trackable. Create proper subissues instead:

```bash
# GOOD
fp issue create --title "Create directory" --parent <PREFIX>-1
fp issue create --title "Set up package.json" --parent <PREFIX>-1 --depends "<PREFIX>-2"
fp issue create --title "Configure build" --parent <PREFIX>-1 --depends "<PREFIX>-3"
```

### ❌ Creating orphan tasks

```bash
# BAD: Unconnected tasks
fp issue create --title "Add OAuth"
fp issue create --title "Add session logic"

# GOOD: Hierarchy
fp issue create --title "Authentication system"
fp issue create --title "Add OAuth" --parent <PREFIX>-1
fp issue create --title "Add session logic" --parent <PREFIX>-1 --depends "<PREFIX>-2"
```

### ❌ Ignoring dependencies

```bash
# BAD: No dependencies
fp issue create --title "Frontend UI" --parent <PREFIX>-1
fp issue create --title "Backend API" --parent <PREFIX>-1

# GOOD: Explicit order
fp issue create --title "Backend API" --parent <PREFIX>-1
fp issue create --title "Frontend UI" --parent <PREFIX>-1 --depends "<PREFIX>-2"
```

### ❌ Monolithic tasks

```bash
# BAD: Entire feature as one task
fp issue create --title "Build authentication system"

# GOOD: Decomposed
fp issue create --title "Authentication system"
fp issue create --title "OAuth integration" --parent <PREFIX>-1
fp issue create --title "Session management" --parent <PREFIX>-1
fp issue create --title "Auth middleware" --parent <PREFIX>-1
```

---

## Quick Reference

### Planning Checklist

- [ ] Create parent issue with clear goals
- [ ] Break into atomic subtasks (`--parent`)
- [ ] Model dependencies (`--depends`)
- [ ] Write clear descriptions
- [ ] Visualize with `fp tree`
- [ ] Never use `- [ ]` checkbox lists

### Key Commands

```bash
fp issue create --title "..." --parent <id> --depends "<ids>" --description "..."
fp issue update --depends "<ids>" <id>
fp tree
fp issue show <id>
fp comment <id> "message"
```
