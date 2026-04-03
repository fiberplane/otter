# Data Validation

How we validate external data at boundaries. The core rule: never trust data from outside the process — validate it through Effect Schema before it enters the type system.

## Why Type Assertions Are Dangerous

`as` casts and bare `JSON.parse` both produce values the compiler trusts but the runtime hasn't verified:

```typescript
// The compiler trusts this completely — no runtime check happens
const user = JSON.parse(body) as User;
user.name.toUpperCase(); // Crashes if `name` is missing or not a string
```

The crash happens far from the parse site, making it hard to diagnose. Schema validation catches this at the boundary with a clear error message.

## The Schema-First Pattern

Define the shape once as a Schema. The type is inferred — always in sync:

```typescript
import { Schema } from "effect";

const User = Schema.Struct({
  id: Schema.UUID,
  name: Schema.String,
  email: Schema.String,
  role: Schema.Literal("admin", "member", "viewer"),
  createdAt: Schema.Date,
});

// Type is inferred from Schema — never out of sync
type User = Schema.Schema.Type<typeof User>;
```

Validate at the boundary with `Schema.decodeUnknown`:

```typescript
// In Effect code — returns Effect<User, ParseError>
const user = yield* Schema.decodeUnknown(User)(JSON.parse(body));

// In non-Effect code — throws ParseError on invalid data
const user = Schema.decodeUnknownSync(User)(JSON.parse(body));
```

Other `Schema.decode*` variants (`decodeUnknownEither`, `decodeUnknownOption`, `decodeSync`, `decode`) also satisfy the `no-json-parse-without-schema` rule.

## Common Boundary Scenarios

### HTTP Request Bodies

```typescript
// ❌ Bad
const input = await request.json() as CreateUserInput;

// ✅ Good
const CreateUserInput = Schema.Struct({
  name: Schema.String,
  email: Schema.String,
  role: Schema.optional(Schema.Literal("admin", "member", "viewer")),
});

const input = yield* Schema.decodeUnknown(CreateUserInput)(await request.json());
```

### HTTP Response Bodies

```typescript
// ❌ Bad
const data = await response.json() as ApiResponse;

// ✅ Good
const ApiResponse = Schema.Struct({
  items: Schema.Array(Item),
  total: Schema.Number,
  nextCursor: Schema.optional(Schema.String),
});

const data = yield* Schema.decodeUnknown(ApiResponse)(await response.json());
```

### JSON Files

```typescript
// ❌ Bad
const config = JSON.parse(content) as AppConfig;

// ✅ Good
const AppConfig = Schema.Struct({
  port: Schema.Number.pipe(Schema.int(), Schema.between(1, 65535)),
  host: Schema.String,
  debug: Schema.optional(Schema.Boolean),
});

const config = yield* Schema.decodeUnknown(AppConfig)(JSON.parse(content));
```

### Discriminated Unions

For data that can be one of several shapes, use `Schema.Union` with literal discriminators:

```typescript
const WebhookEvent = Schema.Union(
  Schema.Struct({
    type: Schema.Literal("issue.created"),
    issue: IssueSchema,
  }),
  Schema.Struct({
    type: Schema.Literal("issue.updated"),
    issue: IssueSchema,
    changes: ChangesSchema,
  }),
  Schema.Struct({
    type: Schema.Literal("comment.added"),
    comment: CommentSchema,
  }),
);

const event = yield* Schema.decodeUnknown(WebhookEvent)(JSON.parse(body));
// TypeScript now knows event.type discriminates the union
```

### Custom Branded Types

For values with domain constraints beyond basic types:

```typescript
const Port = Schema.Number.pipe(
  Schema.int(),
  Schema.between(1, 65535),
  Schema.brand("Port"),
);

const ISOTimestamp = Schema.String.pipe(
  Schema.pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/),
  Schema.brand("ISOTimestamp"),
);
```

## Anti-Patterns

### 1. Type Assertion on Parsed Data

```typescript
// ❌ JSON.parse returns `any` — the cast is a lie
const data = JSON.parse(body) as MyType;

// ❌ Same problem through .json()
const payload = await response.json() as ApiResponse;
```

Caught by: `no-unsafe-typecast-at-boundary` ast-grep rule.

### 2. Bare JSON.parse Without Validation

```typescript
// ❌ Result is `any` — disables type checking downstream
const data = JSON.parse(body);
processData(data); // No type safety here
```

Caught by: `no-json-parse-without-schema` ast-grep rule.

### 3. Typed Assignment on Boundary Data

```typescript
// ❌ Type annotation still trusts unvalidated data
const payload: ApiResponse = await response.json();

// ❌ Same problem with parsed strings
const config: AppConfig = JSON.parse(body);
```

Caught by: `no-typed-boundary-assignment` ast-grep rule.

### 4. Intermediate Variable Before Validation

```typescript
// ❌ Still flagged — the `any` leaks into `raw`
const raw = JSON.parse(body);
const data = yield* Schema.decodeUnknown(MySchema)(raw);
```

Pass `JSON.parse` directly to the Schema decode call. This keeps the unvalidated `any` contained:

```typescript
// ✅ Good — `any` never escapes into a variable
const data = yield* Schema.decodeUnknown(MySchema)(JSON.parse(body));
```

### 5. Interface Instead of Schema in Models

```typescript
// ❌ Type and validation are separate — they drift apart
interface User {
  id: string;
  name: string;
}

function parseUser(data: unknown): User {
  return data as User;
}
```

Caught by: `no-interface-in-models` ast-grep rule (in `models/` and `domain/` directories).

## ast-grep Enforcement

| Rule                                | What it catches                                          |
| ----------------------------------- | -------------------------------------------------------- |
| `no-unsafe-typecast-at-boundary`    | `as` casts on JSON.parse, .json(), .text(), .body        |
| `no-json-parse-without-schema`      | Bare JSON.parse without Schema.decode* wrapper           |
| `no-typed-boundary-assignment`      | Typed variable assignment from JSON.parse, .json(), .body |
| `no-interface-in-models`            | `export interface` in model dirs (use Schema.Struct)     |
