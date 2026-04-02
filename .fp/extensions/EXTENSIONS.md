# FP Extensions Guide

Extensions are TypeScript files that hook into fp's issue-tracking lifecycle. They run in both the CLI (Bun) and the desktop app (Node/Electron). Each extension exports an `init` function that receives the `fp` context object.

## Quick Start

```ts
import type { ExtensionInit } from "@fiberplane/extensions";

const init: ExtensionInit = (fp) => {
  fp.on("issue:created", ({ issue }) => {
    fp.log.info(`New issue: ${issue.title}`);
  });
};

export default init;
```

The `ExtensionInit` signature is `(fp: FpExtensionContext) => void | Promise<void>`. The default export is the entry point.

When your init function needs to `await` calls like `registerProperty`, make it async:

```ts
const init: ExtensionInit = async (fp) => {
  await fp.issues.registerProperty("environment", {
    label: "Environment",
    icon: "globe",
    display: fp.ui.properties.select(
      fp.ui.properties.option("staging", { label: "Staging", color: "yellow" }),
      fp.ui.properties.option("production", { label: "Production", color: "red" }),
    ),
  });
};

export default init;
```

Always use the type-only import:

```ts
import type { ... } from "@fiberplane/extensions";
```

## Extension Discovery

fp loads extensions from two locations, checked in order:

1. **Project extensions** -- `.fp/extensions/` in your project root (takes precedence)
2. **Global extensions** -- `~/.fiberplane/extensions/`

Supported file types: `.ts`, `.js`, `.mts`, `.mjs`. An extension can be a single file or a directory with an `index.*` entry point. Files ending in `.d.ts` are skipped.

When both locations contain an extension with the same name, the project-level extension wins.

## The `fp` Context Object

Every extension receives a single `fp` argument of type `FpExtensionContext`:

| Property     | Type                                | Purpose                               |
|--------------|-------------------------------------|---------------------------------------|
| `issues`     | `ExtensionIssueContextAccessPromise`| CRUD operations + property registration |
| `comments`   | `ExtensionCommentAccessPromise`     | Create, list, delete comments         |
| `secrets`    | `ExtensionSecretsAccessPromise`     | OS keychain secret storage            |
| `ui`         | `ExtensionUiAccessPromise`          | Actions, notifications, property helpers |
| `config`     | `ExtensionConfigAccess`             | Read extension config values          |
| `log`        | `ExtensionLogger`                   | Structured logging                    |
| `on`         | Hook registration function          | Subscribe to lifecycle events         |
| `runtime`    | `ExtensionRuntime`                  | `"cli"` or `"desktop"`               |
| `projectDir` | `string`                            | Absolute path to project root         |

## Runtime Compatibility

Extensions must run in both the CLI (Bun runtime) and the desktop app (Node/Electron). Write Node-compatible code only.

### Allowed APIs

- `node:child_process` -- `spawn`, `execFile`
- `node:fs/promises` -- `readFile`, `writeFile`, `mkdir`, `rm`
- `node:path` -- `resolve`, `join`

### Avoid

- Bun global APIs (`Bun.spawn`, `Bun.file`, `Bun.env`)
- Bun-only modules (`bun:ffi`, `bun:sqlite`)
- Any API not present on the `FpExtensionContext` object

`fp.runtime` returns `"cli"` or `"desktop"` if you need conditional behavior, but prefer writing universal code.

---

Extensions subscribe to lifecycle events with `fp.on(event, handler)`. Hooks fall into two categories:

**Pre-hooks** run before the action is committed. Return a `HookValidationError` to block the operation, or `undefined` to allow it.

**Post-hooks** run after the action succeeds. They return `void` and are used for side effects.

## Event List

See the [Lifecycle Events](#lifecycle-events) section in the API Reference for the complete table of events, context types, and descriptions.

`on()` also accepts arbitrary event strings for forward compatibility with future events.

## Blocking with HookValidationError

Pre-hooks can return an error object to prevent the operation:

```ts
fp.on("issue:status:changing", ({ issue, from, to }) => {
  if (from === "todo" && to === "done") {
    return {
      code: "NO_SKIP_IN_PROGRESS",
      message: "Issues must go through in-progress before done",
    };
  }
  return undefined;
});
```

The `HookValidationError` shape:

```ts
interface HookValidationError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
```

## Execution Order

When multiple extensions register the same pre-hook, they run in discovery order. The first rejection stops remaining hooks.

Post-hooks are fire-and-forget. Uncaught exceptions are logged but don't crash the extension.

## Hook Selection Guidelines

- Use pre-hooks for validation, post-hooks for side effects.
- Avoid heavy work (network calls, spawning processes) in pre-hooks. Keep them fast.
- Do not mutate state in pre-hooks. They are for gating only.
- Register the narrowest hook possible. Use `issue:status:changing` rather than `issue:updating` when you only care about status transitions.

---

## API Reference

### Entry Point

#### `ExtensionInit`

Entry point for an extension. Called once when the extension is loaded.
Can be async (`Promise<void>`) when setup requires awaiting `registerProperty` or other async calls.

```ts
type ExtensionInit = (fp: FpExtensionContext) => void | Promise<void>
```

#### `ExtensionRuntime`

```ts
type ExtensionRuntime = "cli" | "desktop"
```

### The `fp` Context Object

The main context object passed to every extension's init function.
Provides access to issues, comments, secrets, UI, config, logging, and lifecycle hooks.

| Property | Type | Description |
| --- | --- | --- |
| `comments` | `ExtensionCommentAccessPromise` | Comment CRUD (create, list, delete). |
| `config` | `ExtensionConfigAccess` | Read extension config from `.fp/config.toml`. |
| `issues` | `ExtensionIssueContextAccessPromise` | Issue CRUD and custom property registration. |
| `log` | `ExtensionLogger` | Structured logging prefixed with the extension name. |
| `on` | `(event, handler) => void` | Register a hook handler for a lifecycle event. |
| `projectDir` | `string` | Absolute path to the project root directory. |
| `runtime` | `ExtensionRuntime` | `"cli"` when running in the fp CLI, `"desktop"` in the desktop app. |
| `secrets` | `ExtensionSecretsAccessPromise` | OS keychain secret storage (get, set, delete). |
| `ui` | `ExtensionUiAccessPromise` | Desktop command-palette actions, notifications, and property display builders. |

**`on`** — Register a hook handler for a lifecycle event.

The typed overload provides autocomplete for known events in ExtensionHookMap.
The loose overload accepts arbitrary event strings for forward-compatible
registration of future hook events.

### Issue Operations

#### `fp.issues`

The `fp.issues` interface — extends issue CRUD with custom property registration.

Extends [`ExtensionIssueAccessPromise`](#extensionissueaccesspromise).

#### `ExtensionIssueAccessPromise`

CRUD access to issues from within an extension.

- `get()` returns `null` for missing issues (does not throw).
- `update()` throws if the issue does not exist.
- `delete()` throws if the issue does not exist.

##### `create()`

Create a new issue. Only `title` is required — other properties
default to `status: "todo"`, no priority, no parent.

```ts
create(data: {
  description?: string;
  parent?: string;
  priority?: string;
  properties?: Record<string, unknown>;
  status?: string;
  title: string;
}): Promise<ExtensionIssue>
```

##### `delete()`

Delete an issue permanently. Throws if the issue doesn't exist.

```ts
delete(id: string): Promise<void>
```

##### `get()`

Get a single issue by ID. Returns `null` if the issue does not exist.

```ts
get(id: string): Promise<ExtensionIssue | null>
```

##### `list()`

List issues, optionally filtered by status or parent.

```ts
list(filter?: IssueListFilter): Promise<ExtensionIssue[]>
```

##### `update()`

Update an existing issue. Only provided properties are modified. Throws if the issue doesn't exist.

```ts
update(id: string, updates: {
  description?: string;
  priority?: string;
  properties?: Record<string, unknown>;
  status?: string;
  title?: string;
}): Promise<ExtensionIssue>
```

| Parameter | Type | Optional | Description |
| --- | --- | --- | --- |
| `id` | `string` | No | — |
| `updates` | `{ ... }` | No | — |

#### `registerProperty()`

Register a custom property on issues.

Keys are append-only per process lifetime and cannot collide with built-in
attributes (`title`, `description`, `status`, `priority`, `parent`, `dependencies`).
Must be called during init, not inside hook handlers.

```ts
registerProperty(key: string, options: PropertyOptions): Promise<void>
```

### Comment Operations

#### `fp.comments`

CRUD operations for issue comments.
Comments are plain-text or markdown strings attached to an issue.

##### `create()`

Add a comment to an issue. Returns the created comment with its assigned ID.

```ts
create(issueId: string, content: string): Promise<ExtensionComment>
```

| Parameter | Type | Optional | Description |
| --- | --- | --- | --- |
| `issueId` | `string` | No | — |
| `content` | `string` | No | — |

##### `delete()`

Delete a comment by ID. Throws if the comment doesn't exist.

```ts
delete(commentId: string): Promise<void>
```

##### `list()`

List all comments on an issue, ordered by creation time.

```ts
list(issueId: string): Promise<ExtensionComment[]>
```

### Secrets

#### `fp.secrets`

OS keychain-backed secret storage, scoped per extension and project.
Uses macOS Keychain or Linux `secret-tool` under the hood.
All methods throw on keychain errors (e.g. access denied, service unavailable).

##### `delete()`

Delete a secret. Throws if the key doesn't exist.

```ts
delete(key: string): Promise<void>
```

##### `get()`

Retrieve a secret. Returns `undefined` if the key doesn't exist.

```ts
get(key: string): Promise<string | undefined>
```

##### `set()`

Store a secret. Overwrites any existing value for the key.

```ts
set(key: string, value: string): Promise<void>
```

| Parameter | Type | Optional | Description |
| --- | --- | --- | --- |
| `key` | `string` | No | — |
| `value` | `string` | No | — |

### UI

#### `fp.ui`

UI integration: desktop command-palette actions, notifications, and
builder helpers for property display configuration.

In CLI mode, `registerAction` and `notify` are silent no-ops.
The `properties` builders work in both runtimes.

##### `notify()`

Show a toast notification to the user (desktop only).

```ts
notify(message: string, options?: ExtensionUiNotifyOptions): Promise<void>
```

| Parameter | Type | Optional | Description |
| --- | --- | --- | --- |
| `message` | `string` | No | — |
| `options` | `ExtensionUiNotifyOptions` | Yes | — |

##### `properties`

Builder functions for constructing `PropertyOption` and `PropertyDisplay`
values used with `fp.issues.registerProperty()`.

```ts
properties: {
  multiselect: (options: PropertyOption[]) => PropertyDisplay;
  option: (value: string, opts: { ... }) => PropertyOption;
  select: (options: PropertyOption[]) => PropertyDisplay;
  text: () => PropertyDisplay;
}
```

##### `registerAction()`

Register a command-palette action (desktop only).

```ts
registerAction(options: ExtensionUiActionOptions): Promise<void>
```

#### `ExtensionUiActionOptions`

Configuration for a command-palette action registered via `fp.ui.registerAction()`.
Actions appear in the desktop app's command palette. In CLI mode, registration is a no-op.

| Property | Type | Description |
| --- | --- | --- |
| `icon?` | `string` | Lucide icon name shown alongside the label. |
| `id` | `string` | Unique identifier, conventionally `extension-name.action-name`. |
| `keywords?` | `readonly string[]` | Additional search terms for palette filtering. |
| `label` | `string` | Display label in the command palette. |
| `onExecute` | `(ctx: Record<string, unknown>) => void | Promise<void>` | Handler called when the user triggers the action. |
| `when?` | `(ctx: Record<string, unknown>) => boolean | Promise<boolean>` | Visibility predicate — return `false` to hide the action contextually. |

#### `ExtensionUiNotifyOptions`

Options for `fp.ui.notify()`.

| Property | Type | Description |
| --- | --- | --- |
| `kind?` | `"success" | "warning" | "info" | "error"` | Visual style. Defaults to `"info"`. |
| `title?` | `string` | Notification title displayed above the message. |

### Config

#### `fp.config`

Reads config values from the project's `.fp/config.toml`.
The extension filename (without `.ts`) maps to the config section.
E.g., `my-extension.ts` reads from `[extensions.my-extension]`.

##### `get()`

```ts
get(key: string): T | undefined
```

### Logging

#### `fp.log`

Structured logging. Messages are automatically prefixed with the extension name.
Use `debug` for internals, `info` for normal operations, `warn` for recoverable
issues, `error` for failures.

| Property | Type | Description |
| --- | --- | --- |
| `debug` | `(message: string) => void` | Implementation details — hidden unless verbose/debug logging is enabled. |
| `error` | `(message: string) => void` | Failures that prevent the extension from completing an operation. |
| `info` | `(message: string) => void` | Normal operational messages. |
| `warn` | `(message: string) => void` | Recoverable issues that don't prevent the extension from functioning. |

### Lifecycle Events

Maps hook event names to their handler signatures.

**Pre-hooks** (`*:creating`, `*:updating`, `*:deleting`, `*:changing`) can be async.
Return a HookValidationError to reject the operation, or `undefined` to allow it.
When multiple extensions register the same pre-hook, they run in discovery order;
the first rejection stops remaining hooks.

**Post-hooks** (`*:created`, `*:updated`, `*:deleted`, `*:changed`) are fire-and-forget.
Uncaught exceptions are logged but do not affect the operation.

The `on()` method also accepts arbitrary event strings for forward compatibility.

#### Pre-hooks (validation)

Pre-hooks fire **before** an operation is persisted. Return a `HookValidationError` to block it, or `undefined` to allow.

| Event | Context | Description |
| --- | --- | --- |
| `comment:creating` | [`HookCommentCreatingContext`](#hookcommentcreatingcontext) | Fires before a comment is added to an issue. The context has `issueId` and `content` but no `comment.id` yet. Return a `HookValidationError` to block the comment. |
| `comment:deleting` | [`HookCommentContext`](#hookcommentcontext) | Fires before a comment is deleted. Return a `HookValidationError` to prevent deletion. |
| `issue:creating` | [`HookIssueContext`](#hookissuecontext) | Fires before a new issue is persisted. Return a `HookValidationError` to block creation, or `undefined` to allow it. |
| `issue:deleting` | [`HookIssueDeleteContext`](#hookissuedeletecontext) | Fires before an issue is deleted. Return a `HookValidationError` to prevent deletion. |
| `issue:status:changing` | [`HookStatusChangeContext`](#hookstatuschangecontext) | Fires before an issue's status changes. This is the most common hook for workflow enforcement. `from` and `to` are status values (e.g. `"todo"`, `"in-progress"`, `"done"`). Return a `HookValidationError` to block the transition. |
| `issue:updating` | [`HookIssueUpdateContext`](#hookissueupdatecontext) | Fires before issue properties are modified. The context contains the current persisted issue state and the pending updates. Return a `HookValidationError` to reject the update. |

#### Post-hooks (side effects)

Post-hooks fire **after** an operation succeeds. They are fire-and-forget — exceptions are logged but do not affect the operation.

| Event | Context | Description |
| --- | --- | --- |
| `comment:created` | [`HookCommentContext`](#hookcommentcontext) | Fires after a comment is successfully added. The context includes the full persisted comment with its ID. |
| `comment:deleted` | [`HookCommentContext`](#hookcommentcontext) | Fires after a comment is permanently deleted. |
| `issue:created` | [`HookIssueContext`](#hookissuecontext) | Fires after an issue is successfully created. Use for side effects: auto-commenting, creating child issues, notifications. |
| `issue:deleted` | [`HookIssueDeleteContext`](#hookissuedeletecontext) | Fires after an issue is permanently deleted. The context contains the issue as it was before deletion. |
| `issue:status:changed` | [`HookStatusChangeContext`](#hookstatuschangecontext) | Fires after an issue's status has changed. Use for post-transition side effects like running tests or notifications. |
| `issue:updated` | [`HookIssueUpdateContext`](#hookissueupdatecontext) | Fires after issue properties are successfully modified. `ctx.issue` reflects the final persisted issue state at hook time. Use for side effects like syncing external systems. |

### Hook Context Types

#### `HookValidationError`

Returned from a pre-hook to reject the operation.

| Property | Type | Description |
| --- | --- | --- |
| `code` | `string` | — |
| `details?` | `Record<string, unknown>` | — |
| `message` | `string` | — |

#### `HookPreResult`

Return type for pre-hooks: `undefined` to allow, `HookValidationError` to block.

```ts
type HookPreResult = undefined | HookValidationError
```

#### `HookIssueContext`

Hook context carrying the full issue state at the time the hook fires.

| Property | Type | Description |
| --- | --- | --- |
| `issue` | `ExtensionIssue` | — |

#### `HookIssueUpdateContext`

Hook context for issue update events.
For `issue:updating`, `issue` is the current persisted state BEFORE the updates are applied.
For `issue:updated`, `issue` is the final persisted state AFTER the updates are applied.
`updates` is a sparse object containing only the properties being changed, including extension properties.

| Property | Type | Description |
| --- | --- | --- |
| `issue` | `ExtensionIssue` | — |
| `updates` | `{ ... }` | — |

#### `HookIssueDeleteContext`

| Property | Type | Description |
| --- | --- | --- |
| `issue` | `ExtensionIssue` | — |
| `targetIds` | `readonly string[]` | All issue IDs being deleted in this operation (descendants first, root last). |

**`targetIds`** — All issue IDs being deleted in this operation (descendants first, root last).
When `targetIds.length > 1`, this is a cascade delete that will also remove all sub-issues.
Extensions can inspect this list to react differently to single vs. cascade deletions.

#### `HookStatusChangeContext`

Hook context for status transition events.
`from` and `to` are Status values as strings (e.g. `"todo"`, `"in-progress"`).
In pre-hooks (`issue:status:changing`), `issue` reflects state before the transition.
In post-hooks (`issue:status:changed`), `issue` reflects the final persisted state.

| Property | Type | Description |
| --- | --- | --- |
| `from` | `string` | — |
| `issue` | `ExtensionIssue` | — |
| `to` | `string` | — |

#### `HookCommentCreatingContext`

Context for the `comment:creating` pre-hook, fired before a comment is persisted.
There is no `comment.id` yet — only the target issue and the comment content.

| Property | Type | Description |
| --- | --- | --- |
| `content` | `string` | — |
| `issueId` | `string` | — |

#### `HookCommentContext`

Context for `comment:created`, `comment:deleted`, and `comment:deleting` hooks.

| Property | Type | Description |
| --- | --- | --- |
| `comment` | `ExtensionComment` | — |
| `issueId` | `string` | — |

### Data Models

#### `ExtensionIssue`

| Property | Type | Description |
| --- | --- | --- |
| `author?` | `string` | — |
| `createdAt` | `string` | — |
| `dependencies` | `readonly string[]` | — |
| `description` | `string` | — |
| `id` | `string` | — |
| `parent` | `string | null` | — |
| `priority` | `Priority | null` | — |
| `properties?` | `Record<string, unknown>` | — |
| `revisions` | `Ref | readonly Ref[] | null` | — |
| `status` | `Status` | — |
| `title` | `string` | — |
| `updatedAt` | `string` | — |

#### `ExtensionComment`

| Property | Type | Description |
| --- | --- | --- |
| `author` | `string` | — |
| `content` | `string` | — |
| `createdAt` | `string` | — |
| `id` | `string` | — |
| `issueId` | `string` | — |

#### `IssueListFilter`

Filter for listing issues.

| Property | Type | Description |
| --- | --- | --- |
| `parent?` | `string | null` | — |
| `status?` | `string` | — |

#### Value Types

##### `Status`

Issue workflow status.

```ts
type Status = "todo" | "in-progress" | "done"
```

##### `Priority`

Issue priority level.
- `low` — backlog / nice-to-have
- `medium` — default / normal priority
- `high` — important, should be addressed soon
- `critical` — urgent / blocking other work

```ts
type Priority = "low" | "medium" | "high" | "critical"
```

##### `Ref`

A VCS reference captured at a status transition.
Single `Ref` when one VCS reference exists, array when multiple (e.g. colocated Git + JJ).

```ts
type Ref = {
  _tag: "Git";
  sha: string;
} | {
  _tag: "JJ";
  changeId: string;
}
```

### Property System

#### `PropertyOptions`

Configuration for a custom issue property registered via `fp.issues.registerProperty()`.
Properties add typed data to issues (environment, labels, category, etc.).

| Property | Type | Description |
| --- | --- | --- |
| `display` | `PropertyDisplay` | — |
| `icon?` | `string` | Lucide icon name displayed alongside the property label. |
| `label?` | `string` | Display label shown next to the property in the UI. |
| `schema?` | `unknown` | Any Standard Schema v1 validator (Zod, Valibot, ArkType). |

**`schema?`** — Any Standard Schema v1 validator (Zod, Valibot, ArkType).
Values are validated on write — invalid values are rejected with an error.

#### `PropertyOption`

A single option in a `select` or `multiselect` property display.

| Property | Type | Description |
| --- | --- | --- |
| `color?` | `PropertyColor` | Color token for the option chip. |
| `icon?` | `string` | Lucide icon name. |
| `label?` | `string` | Display label shown in the UI. Defaults to `value` if omitted. |
| `value` | `string` | The value stored in the issue's `properties` record when this option is selected. |

**`icon`** — Lucide icon name. Recommended icons by category:

<table style="border-collapse:collapse"><tr><td style="vertical-align:top;white-space:nowrap;padding:4px 12px 4px 0"><strong>Status</strong></td><td style="padding:4px 0"><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/circle.svg" width="16" height="16" alt="circle" /><code>circle</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/circle-dot.svg" width="16" height="16" alt="circle-dot" /><code>circle-dot</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/circle-check.svg" width="16" height="16" alt="circle-check" /><code>circle-check</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/loader.svg" width="16" height="16" alt="loader" /><code>loader</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/clock.svg" width="16" height="16" alt="clock" /><code>clock</code></span></td></tr><tr><td style="vertical-align:top;white-space:nowrap;padding:4px 12px 4px 0"><strong>Priority</strong></td><td style="padding:4px 0"><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/signal.svg" width="16" height="16" alt="signal" /><code>signal</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/signal-low.svg" width="16" height="16" alt="signal-low" /><code>signal-low</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/signal-medium.svg" width="16" height="16" alt="signal-medium" /><code>signal-medium</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/signal-high.svg" width="16" height="16" alt="signal-high" /><code>signal-high</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/arrow-up.svg" width="16" height="16" alt="arrow-up" /><code>arrow-up</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/flame.svg" width="16" height="16" alt="flame" /><code>flame</code></span></td></tr><tr><td style="vertical-align:top;white-space:nowrap;padding:4px 12px 4px 0"><strong>People</strong></td><td style="padding:4px 0"><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/user.svg" width="16" height="16" alt="user" /><code>user</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/users.svg" width="16" height="16" alt="users" /><code>users</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/user-plus.svg" width="16" height="16" alt="user-plus" /><code>user-plus</code></span></td></tr><tr><td style="vertical-align:top;white-space:nowrap;padding:4px 12px 4px 0"><strong>Workflow</strong></td><td style="padding:4px 0"><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/git-branch.svg" width="16" height="16" alt="git-branch" /><code>git-branch</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/git-merge.svg" width="16" height="16" alt="git-merge" /><code>git-merge</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/rocket.svg" width="16" height="16" alt="rocket" /><code>rocket</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/flag.svg" width="16" height="16" alt="flag" /><code>flag</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/tag.svg" width="16" height="16" alt="tag" /><code>tag</code></span></td></tr><tr><td style="vertical-align:top;white-space:nowrap;padding:4px 12px 4px 0"><strong>Content</strong></td><td style="padding:4px 0"><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/file-text.svg" width="16" height="16" alt="file-text" /><code>file-text</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/folder.svg" width="16" height="16" alt="folder" /><code>folder</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/link.svg" width="16" height="16" alt="link" /><code>link</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/code.svg" width="16" height="16" alt="code" /><code>code</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/terminal.svg" width="16" height="16" alt="terminal" /><code>terminal</code></span></td></tr><tr><td style="vertical-align:top;white-space:nowrap;padding:4px 12px 4px 0"><strong>Feedback</strong></td><td style="padding:4px 0"><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/check.svg" width="16" height="16" alt="check" /><code>check</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/x.svg" width="16" height="16" alt="x" /><code>x</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/alert-circle.svg" width="16" height="16" alt="alert-circle" /><code>alert-circle</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/info.svg" width="16" height="16" alt="info" /><code>info</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/thumbs-up.svg" width="16" height="16" alt="thumbs-up" /><code>thumbs-up</code></span></td></tr><tr><td style="vertical-align:top;white-space:nowrap;padding:4px 12px 4px 0"><strong>Objects</strong></td><td style="padding:4px 0"><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/box.svg" width="16" height="16" alt="box" /><code>box</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/package.svg" width="16" height="16" alt="package" /><code>package</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/layers.svg" width="16" height="16" alt="layers" /><code>layers</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/zap.svg" width="16" height="16" alt="zap" /><code>zap</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/star.svg" width="16" height="16" alt="star" /><code>star</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/shield.svg" width="16" height="16" alt="shield" /><code>shield</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/lock.svg" width="16" height="16" alt="lock" /><code>lock</code></span><span style="display:inline-flex;align-items:center;gap:2px;margin:2px 8px 2px 0"><img src="https://unpkg.com/lucide-static@latest/icons/settings.svg" width="16" height="16" alt="settings" /><code>settings</code></span></td></tr></table>

**`color`** — Color token for the option chip. Available colors:

<div style="display:flex;flex-wrap:wrap;margin:8px 0"><span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#9ca3af;border:1px solid rgba(0,0,0,.1)"></span><code>neutral</code></span><span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#B197F9;border:1px solid rgba(0,0,0,.1)"></span><code>purple</code></span><span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#E87CC4;border:1px solid rgba(0,0,0,.1)"></span><code>pink</code></span><span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#5DDDD3;border:1px solid rgba(0,0,0,.1)"></span><code>turquoise</code></span><span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#56B7FF;border:1px solid rgba(0,0,0,.1)"></span><code>blue</code></span><span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#E4D166;border:1px solid rgba(0,0,0,.1)"></span><code>yellow</code></span><span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#E4A56B;border:1px solid rgba(0,0,0,.1)"></span><code>orange</code></span><span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#71DDA4;border:1px solid rgba(0,0,0,.1)"></span><code>mint</code></span><span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#D85C73;border:1px solid rgba(0,0,0,.1)"></span><code>red</code></span><span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#D4E74F;border:1px solid rgba(0,0,0,.1)"></span><code>lime</code></span><span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#4AAF6F;border:1px solid rgba(0,0,0,.1)"></span><code>success</code></span><span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#E8B84A;border:1px solid rgba(0,0,0,.1)"></span><code>warning</code></span><span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#A63946;border:1px solid rgba(0,0,0,.1)"></span><code>destructive</code></span></div>

#### `PropertyDisplay`

Controls how a custom property is rendered and how its value is stored in `properties`.
- `select` — single-value picker, stored as a `string`
- `multiselect` — multi-value chips, stored as a `string[]`
- `text` — freeform input, stored as a `string`

```ts
type PropertyDisplay = {
  options: readonly PropertyOption[];
  type: "select";
} | {
  options: readonly PropertyOption[];
  type: "multiselect";
} | {
  type: "text";
}
```

#### `PropertyColor`

Color token for property options and chips.

Rendering rules:
- icon + color: colored chip with icon
- icon only: icon with plain label
- color only: colored dot with label
- neither: plain text

<div style="display:flex;flex-wrap:wrap;margin:8px 0"><span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#9ca3af;border:1px solid rgba(0,0,0,.1)"></span><code>neutral</code></span><span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#B197F9;border:1px solid rgba(0,0,0,.1)"></span><code>purple</code></span><span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#E87CC4;border:1px solid rgba(0,0,0,.1)"></span><code>pink</code></span><span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#5DDDD3;border:1px solid rgba(0,0,0,.1)"></span><code>turquoise</code></span><span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#56B7FF;border:1px solid rgba(0,0,0,.1)"></span><code>blue</code></span><span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#E4D166;border:1px solid rgba(0,0,0,.1)"></span><code>yellow</code></span><span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#E4A56B;border:1px solid rgba(0,0,0,.1)"></span><code>orange</code></span><span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#71DDA4;border:1px solid rgba(0,0,0,.1)"></span><code>mint</code></span><span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#D85C73;border:1px solid rgba(0,0,0,.1)"></span><code>red</code></span><span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#D4E74F;border:1px solid rgba(0,0,0,.1)"></span><code>lime</code></span><span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#4AAF6F;border:1px solid rgba(0,0,0,.1)"></span><code>success</code></span><span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#E8B84A;border:1px solid rgba(0,0,0,.1)"></span><code>warning</code></span><span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#A63946;border:1px solid rgba(0,0,0,.1)"></span><code>destructive</code></span></div>

---

Practical, copy-pasteable extension patterns for common use cases.

## Validation Gate

Block status transitions that violate your workflow rules.

```ts
import type { ExtensionInit } from "@fiberplane/extensions";

const init: ExtensionInit = (fp) => {
  const requiredLabels = new Set(
    fp.config.get("required_labels", "").split(",").filter(Boolean),
  );

  fp.on("issue:status:changing", async ({ issue, from, to }) => {
    if (to !== "done" || requiredLabels.size === 0) {
      return undefined;
    }

    const labels = (issue.properties?.labels as string[]) ?? [];
    const missing = [...requiredLabels].filter((l) => !labels.includes(l));
    if (missing.length > 0) {
      return {
        code: "MISSING_LABELS",
        message: `Add required labels before marking done: ${missing.join(", ")}`,
      };
    }
    return undefined;
  });
};

export default init;
```

## Post-Create Automation

Add a guidance comment and optional child issues when an issue is created.

```ts
import type { ExtensionInit } from "@fiberplane/extensions";

const init: ExtensionInit = (fp) => {
  fp.on("issue:created", async ({ issue }) => {
    try {
      await fp.comments.create(
        issue.id,
        "Remember to add acceptance criteria before starting work.",
      );
    } catch (err) {
      fp.log.warn(`Failed to add guidance comment: ${err}`);
    }
  });
};

export default init;
```

## External CLI Integration

Run an external tool and use its output in a hook.

```ts
import type { ExtensionInit } from "@fiberplane/extensions";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

function runCommand(cmd: string, args: string[], cwd: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => { stdout += d; });
    proc.stderr.on("data", (d) => { stderr += d; });
    proc.on("error", reject);
    proc.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

const init: ExtensionInit = (fp) => {
  fp.on("issue:status:changing", async ({ issue, to }) => {
    if (to !== "done") {
      return undefined;
    }

    const result = await runCommand("make", ["test"], fp.projectDir);
    if (result.code !== 0) {
      return {
        code: "TESTS_FAILED",
        message: `Tests must pass before marking done. Exit code: ${result.code}`,
      };
    }
    return undefined;
  });
};

export default init;
```

## Config-Driven Behavior

Read config values and parse them into typed data.

```ts
import type { ExtensionInit } from "@fiberplane/extensions";

const init: ExtensionInit = (fp) => {
  const blockedStatuses = new Set(
    fp.config.get("blocked_transitions_from", "").split(",").filter(Boolean),
  );
  const dryRun = ["true", "1", "yes"].includes(
    fp.config.get("dry_run", "false").toLowerCase(),
  );

  fp.on("issue:status:changing", ({ from, to }) => {
    if (blockedStatuses.has(from)) {
      if (dryRun) {
        fp.log.warn(`Dry run: would block transition from ${from} to ${to}`);
        return undefined;
      }
      return {
        code: "BLOCKED_TRANSITION",
        message: `Transitions from '${from}' are not allowed`,
      };
    }
    return undefined;
  });
};

export default init;
```

## Webhook Notification (Slack)

Send a Slack message whenever an issue is created or changes status. Set the webhook URL as an environment variable, and configure which events to notify on.

```bash
# Set webhook URL as env var (add to ~/.zshrc to persist)
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/T.../B.../xxx"
```

```toml
# .fp/config.toml
[extensions.slack-notify]
events = "issue:created,issue:status:changed"
project_name = "My Project"
```

```ts
import type { ExtensionInit } from "@fiberplane/extensions";

const init: ExtensionInit = async (fp) => {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL ?? fp.config.get("webhook_url", "");
  if (!webhookUrl) {
    fp.log.warn("No Slack webhook URL configured.");
    return;
  }

  const projectName = fp.config.get("project_name", "");
  const prefix = projectName ? `*[${projectName}]*` : "📋";

  fp.on("issue:created", async ({ issue }) => {
    const text = `${prefix} 🆕 *${issue.id}*: ${issue.title}`;
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        blocks: [{
          type: "section",
          text: { type: "mrkdwn", text },
        }],
      }),
    }).catch((err) => fp.log.warn(`Slack failed: ${err}`));
  });

  fp.on("issue:status:changed", async ({ issue, from, to }) => {
    const emoji = to === "done" ? "✅" : to === "in-progress" ? "🔄" : "📝";
    const text = `${prefix} ${emoji} *${issue.id}* \`${from}\` → \`${to}\`\n${issue.title}`;
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        blocks: [{
          type: "section",
          text: { type: "mrkdwn", text },
        }],
      }),
    }).catch((err) => fp.log.warn(`Slack failed: ${err}`));
  });
};

export default init;
```

The same pattern works for Discord (`{ content: "text" }`), Microsoft Teams, or any webhook service — just change the payload shape. See the full [slack-notify example](https://github.com/fiberplane/fp/tree/main/examples/slack-notify) for config-driven event filtering and status transition guards.
