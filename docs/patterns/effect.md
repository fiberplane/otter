# Effect Conventions

This documents how we use [Effect](https://effect.website/) in this repo. It covers our conventions, not Effect basics -- agents should already know what `Effect.gen` and `Schema` do.

## Tagged Errors

All custom errors extend `Data.TaggedError` with strongly-typed properties:

```typescript
import { Data } from "effect";

export class IssueNotFoundError extends Data.TaggedError("IssueNotFoundError")<{
  readonly issueId: string;
  readonly suggestion?: string;
}> {
  get message(): string {
    const base = `Issue ${this.issueId} not found`;
    const suggestion = this.suggestion ?? "Run 'fp issue list' to see available issues";
    return `${base}\n  Suggestion: ${suggestion}`;
  }
}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string;
  readonly reason: string;
  readonly suggestion?: string;
}> {
  get message(): string {
    const base = `Invalid ${this.field}: ${this.reason}`;
    if (this.suggestion) {
      return `${base}\n  Suggestion: ${this.suggestion}`;
    }
    return base;
  }
}
```

## Schema.ErrorClass (Serializable Errors)

For errors that cross service boundaries (API responses, queue messages, RPC), use `Schema.ErrorClass` instead of `Data.TaggedError`. It adds schema validation and JSON serialization:

```typescript
import { Schema } from "effect";

export class ApiNotFoundError extends Schema.ErrorClass("ApiNotFoundError")({
  _tag: Schema.tag("ApiNotFoundError"),
  resource: Schema.String,
  id: Schema.String,
}) {
  get message(): string {
    return `${this.resource} ${this.id} not found`;
  }
}
```

Use `Data.TaggedError` for in-process errors. Use `Schema.ErrorClass` when errors need to serialize across boundaries. Both must live in `errors.ts`.

## Service Architecture

Define services with `Context.Tag`:

```typescript
// services.ts
import { Context } from "effect";

export class ConfigService extends Context.Tag("ConfigService")<
  ConfigService,
  { readonly configDir: string; readonly projectRoot: string }
>() {}
```

Create layers with `Layer.effect`:

```typescript
// layers.ts
import { Layer, Effect } from "effect";

export const ConfigLive = Layer.effect(
  ConfigService,
  Effect.gen(function* () {
    const resolution = yield* resolveConfigDir();

    return {
      configDir: resolution.configDir,
      projectRoot: resolution.projectRoot,
    };
  }),
);
```

Inject services with `yield*`:

```typescript
const listItemsCommand = Effect.gen(function* () {
  const { configDir } = yield* ConfigService;
  const items = yield* listItems(configDir);
  return formatItemTable(items);
});
```

## Bridging Non-Effect Code

When integrating with libraries that don't use Effect, wrap them at the boundary using `Effect.async` (callback-based) or `Effect.tryPromise` (promise-based).

### Callback-Based APIs

Use `Effect.async` to capture a callback result as an Effect:

```typescript
const fromCallback = <A>(register: (cb: (result: A) => void) => void): Effect.Effect<A> =>
  Effect.async<A>((resume) => {
    register((result) => {
      resume(Effect.succeed(result));
    });
  });
```

### Promise-Based APIs

Use `Effect.tryPromise` to wrap a promise and map its error:

```typescript
const fetchData = (url: string) =>
  Effect.tryPromise({
    try: () => fetch(url).then((r) => r.json()),
    catch: (error) => new FetchError({ url, cause: error }),
  });
```

These wrappers belong in boundary files (`*.adapter.ts` or `adapters/`). See `docs/patterns/boundaries.md` for the full convention on what goes where.

### Effect.all with Concurrency

Run independent operations in parallel:

```typescript
// Bad: Sequential (second waits for first)
const comments = yield * getComments(itemId);
const details = yield * getDetails(itemId);

// Good: Parallel execution
const [comments, details] =
  yield * Effect.all([getComments(itemId), getDetails(itemId)], { concurrency: "unbounded" });
```

### Effect.forkDaemon for Background Tasks

Fire-and-forget operations that should not block the current handler:

```typescript
// Prefetch in background -- don't block the current handler
yield * prefetchData(nextItemId).pipe(Effect.forkDaemon);
```

### Fallback with Logging

Recover from errors while still logging them:

```typescript
// Good: tapError + catchAll for safe fallback
const safeLoad = (effect: Effect.Effect<Data, Error>) =>
  effect.pipe(
    Effect.tapError((err) => Effect.logWarning("Falling back", err)),
    Effect.catchAll(() => Effect.succeed(fallbackValue)),
  );
```

## Code Smells (for AI Agents)

AI agents often produce these anti-patterns. Avoid them.

### 1. Try-Catch Blocks

```typescript
// Bad: Using try-catch
async function getItem(id: string) {
  try {
    const content = await fs.readFile(path);
    return parseItem(content);
  } catch (error) {
    console.error("Failed to get item:", error);
    return null;
  }
}

// Good: Effect error handling
const getItem = (id: string): Effect.Effect<Item, ItemNotFoundError | ParseError, FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const content = yield* fs
      .readFileString(path)
      .pipe(Effect.mapError(() => new ItemNotFoundError({ itemId: id })));
    return yield* parseItem(content);
  });
```

### 2. Manual \_tag Checking

Never inspect `_tag` directly -- not with `===`, not with `in`, not with `Reflect.get`.
Effect provides purpose-built APIs for every case:

```typescript
// Bad: Manual tag checking (any form)
if (error._tag === "ItemNotFoundError") { ... }
if ("_tag" in error && error._tag === "Foo") { ... }
const tag = Reflect.get(error, "_tag"); // still manual!

// Good: Effect.catchTag for specific error recovery in Effect pipelines
Effect.catchTag("ItemNotFoundError", (error) => {
  // `error` is properly typed as ItemNotFoundError
  return Effect.succeed(fallbackValue);
});

// Good: Effect.catchTags for handling multiple error types at once
program.pipe(
  Effect.catchTags({
    HttpError: (error) => Effect.succeed(`HTTP failed: ${error.status}`),
    ValidationError: (error) => Effect.succeed(`Invalid: ${error.field}`),
  })
);

// Good: Effect.catchIf with a predicate (for dynamic/runtime checks)
Effect.catchIf(
  (error): error is MyError => error instanceof MyError,
  (error) => Effect.succeed(fallback),
);

// Good: Match.tag for exhaustive pattern matching
import { Match } from "effect";
Match.value(result).pipe(
  Match.tag("Success", ({ value }) => `Got ${value}`),
  Match.tag("Failed", ({ error }) => `Error: ${error}`),
  Match.exhaustive,
);

// Good: Data.taggedEnum $match for tagged union values (concise alternative)
MyUnion.$match(result, {
  Success: ({ value }) => `Got ${value}`,
  Failed: ({ error }) => `Error: ${error}`,
});

// Good: Data.taggedEnum $is for type-narrowing guards
if (MyUnion.$is("Failed")(result)) {
  return handleFailure(result.error);
}

// Bad: Match.when with _tag object literal (still manual _tag checking)
Match.value(result).pipe(
  Match.when({ _tag: "Failed" }, ({ error }) => `Error: ${error}`),
  Match.orElse(() => "ok"),
);

// Good: Either.match for Either values (from Effect.either)
const either = yield* Effect.either(program);
Either.match(either, {
  onLeft: (error) => `Failed: ${error.message}`,
  onRight: (value) => `Success: ${value}`,
});

// Good: Either.isLeft / Either.isRight for branching
if (Either.isLeft(either)) {
  console.error(either.left.message);
}
```

**Key insight**: `Data.TaggedError("Foo")` extends `Error` and sets `.name` to the tag.
So at application boundaries (where you leave the Effect world), you can use
`error instanceof Error` and `error.name` instead of `_tag`. But inside Effect
pipelines, always prefer `catchTag`/`catchTags`/`Match`.

### 3. Not Using Option

```typescript
// Bad: Null checks everywhere
const item = await getItem(id);
if (item !== null && item !== undefined) {
  const title = item.title;
  if (title !== null) {
    displayTitle(title);
  }
}

// Good: Option combinators
import { Option, pipe } from "effect";

pipe(
  getItem(id),
  Effect.map(Option.fromNullable),
  Effect.map(Option.flatMap((item) => Option.fromNullable(item.title))),
  Effect.map(Option.map(displayTitle)),
);
```

### 4. Throwing Instead of Failing

```typescript
// Bad: Throwing in Effect code
const validateInput = (input: string): Effect.Effect<string> =>
  Effect.gen(function* () {
    if (input.length === 0) {
      throw new Error("Input cannot be empty"); // Don't do this!
    }
    return input;
  });

// Good: Using Effect.fail
const validateInput = (input: string): Effect.Effect<string, ValidationError> =>
  Effect.gen(function* () {
    if (input.length === 0) {
      return yield* Effect.fail(new ValidationError({ field: "input", reason: "cannot be empty" }));
    }
    return input;
  });
```

### 5. Missing `return` Before `yield*` on Early Exits

`yield* Effect.fail(...)` without `return` does not short-circuit the generator — execution continues to the next line. Always use `return yield*` for early exits:

```typescript
// Bug: generator continues past the fail
const validate = (input: string) =>
  Effect.gen(function* () {
    if (input.length === 0) {
      yield* Effect.fail(new ValidationError({ field: "input", reason: "empty" }));
    }
    // This line still executes!
    return yield* process(input);
  });

// Correct: return yield* short-circuits
const validate = (input: string) =>
  Effect.gen(function* () {
    if (input.length === 0) {
      return yield* Effect.fail(new ValidationError({ field: "input", reason: "empty" }));
    }
    return yield* process(input);
  });
```

This applies to `Effect.fail`, `Effect.interrupt`, and any other terminal effect in a branch.

### 6. Ignoring Effect Dependencies

```typescript
// Bad: Direct imports that should be services
import fs from "node:fs";

const readConfig = () =>
  Effect.gen(function* () {
    const content = fs.readFileSync(path, "utf-8"); // Direct fs usage
    return parseConfig(content);
  });

// Good: Injected FileSystem service
const readConfig = (): Effect.Effect<Config, Error, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const content = yield* fs.readFileString(path);
    return parseConfig(content);
  });
```

### 7. Using TypeScript Types Instead of Schema

```typescript
// Bad: Defining types separately from validation
interface Item {
  id: string;
  title: string;
  status: "todo" | "in-progress" | "done";
  createdAt: Date;
}

function parseItem(data: unknown): Item {
  return data as Item; // Unsafe cast
}

// Good: Schema as single source of truth
import { Schema } from "effect";

const Item = Schema.Struct({
  id: Schema.UUID,
  title: Schema.String,
  status: Schema.Literal("todo", "in-progress", "done"),
  createdAt: Schema.Date,
});

// Type is inferred from Schema -- always in sync
type Item = Schema.Schema.Type<typeof Item>;

// Validation returns Effect with proper error handling
const parseItem = Schema.decodeUnknown(Item);
// Returns: Effect<Item, ParseError>
```

Benefits of Schema-first approach:

- **Single source of truth**: Type and validation logic are never out of sync
- **Runtime validation**: Schema validates at runtime, not just compile time
- **Composable**: Schemas can be combined, extended, and transformed
- **Error messages**: Automatic, detailed parse error messages
- **Encoding/Decoding**: Handles serialization (e.g., Date <-> ISO string)

**Note**: The `no-interface-in-models` ast-grep rule enforces Schema in model directories. Schema can't express method signatures, so service contracts and internal option types remain regular TypeScript.

### 8. Using console.log Instead of Effect Logging

```typescript
// Bad: console methods bypass Effect's logging infrastructure
console.log("Processing data:", data);
console.error("Failed to fetch:", error);
console.warn("Deprecated feature");

// Good: Effect logging utilities
yield * Effect.log("Processing data:", data);
yield * Effect.logError("Failed to fetch:", error);
yield * Effect.logWarning("Deprecated feature");
```

Effect logging integrates with the runtime -- it can be configured, filtered, and tested. Console methods bypass all of that.

### 9. Using Effect.runPromise/runSync Inside Effect Code

```typescript
// Bad: Breaking out of Effect to re-enter it
Effect.gen(function* () {
  const result = await Effect.runPromise(someEffect);
  return result;
});

// Good: Stay in Effect with yield*
Effect.gen(function* () {
  const result = yield* someEffect;
  return result;
});

// Good: Runtime.runPromise at application boundaries (HTTP handlers, IPC)
app.get("/api/data", async (c) => {
  const runtime = c.get("runtime");
  return Runtime.runPromise(runtime)(getDataEffect);
});
```

`Effect.runPromise`/`runSync` should only appear at the edge of your application -- where Effect meets non-Effect code. Inside Effect code, use `yield*`.

### 10. Manual Either/Exit Inspection

```typescript
// Bad: Checking _tag on Either values
const result = await runEffectEither(myEffect);
if (result._tag === "Right") { ... }  // manual _tag!
if (result._tag === "Left") { ... }

// Good: Use Either.isLeft / Either.isRight
import { Either } from "effect";
const result = await runEffectEither(myEffect);
if (Either.isRight(result)) {
  return result.right;
}
console.error(result.left.message);

// Good: Either.match for both branches
Either.match(result, {
  onLeft: (error) => console.error(error.message),
  onRight: (value) => console.log(value),
});

// Good: Stay in Effect -- use Effect.either + yield*
const either = yield* Effect.either(myEffect);
if (Either.isLeft(either)) {
  yield* Effect.logWarning("Failed", either.left);
}
```

**Important**: If you have a helper like `runEffectEither`, make sure it
returns a proper `Either.Either<A, E>` (from `Effect.either`), not a plain
object union `{_tag: "Right", right: A} | {_tag: "Left", left: E}`. The
plain object won't work with `Either.isLeft`/`Either.isRight`.

### 11. Silently Swallowing Errors with catchAll

```typescript
// Bad: Error silently disappears -- impossible to debug
Effect.catchAll(() => Effect.succeed([]));

// Good: Log before recovering
Effect.catchAll((err) =>
  Effect.logWarning("Falling back due to error", err).pipe(Effect.map(() => [])),
);

// Good: Use tapError before catchAll
pipe(
  someEffect,
  Effect.tapError((err) => Effect.logWarning("Recovering from", err)),
  Effect.catchAll(() => Effect.succeed([])),
);

// Good: Catch specific errors instead of all
Effect.catchTag("NetworkError", (err) =>
  Effect.logWarning("Network unavailable, using cache").pipe(Effect.map(() => cachedValue)),
);
```

Silent `catchAll` hides failures and makes debugging impossible. Always log the error before recovering, or catch specific error tags instead.

## ast-grep Rules We Enforce

### Effect rules (`rules/effect/`) -- apply to `apps/**` and `packages/**`:

| Rule                      | Severity | What it catches                                                                                                                              |
| ------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `no-throw-in-effect`      | error    | `throw` inside `Effect.gen` -- use `Effect.fail`                                                                                             |
| `no-try-catch`            | error    | `try-catch` in Effect code -- use `Effect.try` or `Effect.catchTag`                                                                          |
| `no-manual-tag-check`     | warning  | Manual `._tag` checking -- use `Effect.catchTag` or `Match`                                                                                  |
| `no-direct-fs`            | error    | `import from "node:fs"` -- use Effect's `FileSystem` service                                                                                 |
| `use-tagged-error`        | error    | `extends Error` -- use `Data.TaggedError`                                                                                                    |
| `no-bare-new-error`       | error    | `new Error(...)` -- use tagged/domain error types                                                                                            |
| `no-console-log`          | error    | `console.log/warn/error/info` -- use `Effect.log`/`logWarning`/`logError`                                                                    |
| `no-runpromise-in-effect` | error    | `Effect.runPromise`/`runSync` -- use `yield*` inside Effect; `Runtime.runPromise` at boundary files only (see `docs/patterns/boundaries.md`) |
| `no-silent-catch`         | error    | `Effect.catchAll(() => Effect.succeed(...))` without logging -- no silent error swallowing                                                   |
| `no-interface-in-models`  | error    | `export interface` in models -- use `Schema.Struct` for domain types                                                                         |
| `no-unsafe-typecast-at-boundary` | error | `as` casts on JSON.parse, .json(), .text(), .body -- use `Schema.decodeUnknown` (see `docs/patterns/data-validation.md`)              |
| `no-json-parse-without-schema`   | error | Bare `JSON.parse` without `Schema.decode*` wrapper -- validate parsed data through Schema                                             |
| `no-typed-boundary-assignment`   | error | Typed variable assignment from JSON.parse, .json(), .body -- decode first, then assign                                                |

**After writing any code**, run `ast-grep scan` from the repo root to check for these anti-patterns.

## Quick Reference

| Pattern                    | Module   | Purpose                                |
| -------------------------- | -------- | -------------------------------------- |
| `Data.TaggedError`         | `effect` | Custom error types with context        |
| `Schema.ErrorClass`        | `effect` | Serializable errors (API, RPC, queues) |
| `Data.taggedEnum`          | `effect` | Discriminated unions (`$match`, `$is`) |
| `Context.Tag`              | `effect` | Service definition                     |
| `Layer.effect`             | `effect` | Creating service layers                |
| `Effect.gen`               | `effect` | Composing effects                      |
| `Effect.fail`              | `effect` | Return typed error                     |
| `Effect.try`               | `effect` | Wrap sync code                         |
| `Effect.tryPromise`        | `effect` | Wrap promises                          |
| `Effect.async`             | `effect` | Custom async logic                     |
| `Effect.all`               | `effect` | Concurrent operations                  |
| `Effect.catchTag`          | `effect` | Handle specific error by tag           |
| `Effect.catchTags`         | `effect` | Handle multiple error tags at once     |
| `Effect.catchIf`           | `effect` | Handle errors matching a predicate     |
| `Effect.catchAll`          | `effect` | Handle all remaining errors            |
| `Effect.catchAllCause`     | `effect` | Handle all errors including defects    |
| `Effect.either`            | `effect` | Lift errors into Either                |
| `Either.isLeft/isRight`    | `effect` | Branch on Either values                |
| `Either.match`             | `effect` | Handle both Either branches            |
| `Effect.mapError`          | `effect` | Transform errors                       |
| `Effect.match`             | `effect` | Handle success + failure (pure)        |
| `Effect.matchEffect`       | `effect` | Handle success + failure (effectful)   |
| `Schema.Struct`            | `effect` | Type-safe validation                   |
| `Option.fromNullable`      | `effect` | Nullable to Option                     |
| `Match.value`              | `effect` | Pattern matching on values             |
| `Match.tag`                | `effect` | Match tagged union variants            |
| `Runtime.runPromise`       | `effect` | Execute in async contexts              |
| `ManagedRuntime.make`      | `effect` | Shared configured runtime              |
| `Effect.all` (concurrency) | `effect` | Parallel execution control             |
| `Effect.forkDaemon`        | `effect` | Background fire-and-forget             |
| `Effect.tap` / `tapError`  | `effect` | Side effects in pipelines              |
| `Layer.merge`              | `effect` | Override single service in layer stack |
