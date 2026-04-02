# How to Build an Effect API

This is a reference template for HTTP API apps. For conventions that apply to all app types, see the patterns docs (`docs/patterns/`). This template shows API-specific wiring.

## Project Structure

```
apps/<name>/
├── package.json
├── tsconfig.json
├── src/
│   ├── server.ts         # Entry point (build runtime, start server)
│   ├── services.ts       # Context.Tag service definitions
│   ├── layers.ts         # Layer implementations
│   ├── errors.ts         # Data.TaggedError definitions
│   ├── routes/
│   │   ├── health.ts     # One file per route group
│   │   └── ...
│   └── adapters/
│       ├── database.adapter.ts
│       └── ...
```

Same conventions as other app types: services in `services.ts`, errors in `errors.ts`, layers in `layers.ts`. Routes replace commands; adapters wrap external I/O.

## The API Boundary Pattern

Build a `ManagedRuntime` once at startup with all layers provided. Each incoming request enters Effect through `Runtime.runPromise` at the boundary:

```typescript
// server.ts (boundary)
import { ManagedRuntime } from "effect";
import { AppContext } from "./layers";

const runtime = ManagedRuntime.make(AppContext);

// Your HTTP framework route handler
async function handleRequest(req: Request): Promise<Response> {
  const effect = routeRequest(req).pipe(
    Effect.withSpan("http.request", {
      attributes: { method: req.method, path: new URL(req.url).pathname },
    }),
  );

  const result = await Runtime.runPromise(runtime)(effect);
  return new Response(JSON.stringify(result), { status: 200 });
}
```

The runtime is built once and reused across all requests. This amortizes layer construction cost and shares service state (connection pools, caches).

## Route Handlers

Route handlers return Effects with typed errors. They don't touch the runtime -- that's the entry point's job:

```typescript
// routes/users.ts (interior)
import { Effect } from "effect";
import { DatabaseService } from "../services";
import type { UserNotFoundError } from "../errors";

export const getUser = (userId: string): Effect.Effect<User, UserNotFoundError, DatabaseService> =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    return yield* db.findUser(userId);
  }).pipe(Effect.withSpan("getUser", { attributes: { userId } }));
```

## Adapters

Adapter files wrap external services and expose them as Effects. All I/O lives here:

```typescript
// adapters/database.adapter.ts (boundary)
import { Effect, Layer } from "effect";
import { DatabaseService } from "../services";

export const DatabaseLive = Layer.effect(
  DatabaseService,
  Effect.gen(function* () {
    // Connect to database, return service implementation
    return {
      findUser: (id: string) =>
        Effect.tryPromise({
          try: () => queryDatabase("SELECT * FROM users WHERE id = ?", [id]),
          catch: (error) => new DatabaseError({ operation: "findUser", cause: error }),
        }).pipe(Effect.withSpan("db.findUser", { attributes: { userId: id } })),
    };
  }),
);
```

## Observability

Same env-var-gated pattern as all app types (see `docs/patterns/observability.md`):

```typescript
// layers.ts
const TracingLive = process.env["EFFECT_TRACE"]
  ? NodeSdk.layer(() => ({
      resource: { serviceName: "my-api" },
      spanProcessor: new SimpleSpanProcessor(new ConsoleSpanExporter()),
    }))
  : Layer.empty;

export const AppContext = Layer.mergeAll(DatabaseLive, TracingLive, DevLoggingLive);
```

For production, swap `ConsoleSpanExporter` for the OTLP exporter.

## Error Responses

Map tagged errors to HTTP status codes at the boundary:

```typescript
// server.ts (boundary)
const toResponse = (effect: Effect.Effect<unknown, AppError>) =>
  effect.pipe(
    Effect.map((data) => new Response(JSON.stringify(data), { status: 200 })),
    Effect.catchTags({
      UserNotFoundError: () => Effect.succeed(new Response("Not found", { status: 404 })),
      ValidationError: (e) => Effect.succeed(new Response(e.message, { status: 400 })),
    }),
    Effect.catchAll((e) =>
      Effect.logError("Unhandled error", e).pipe(
        Effect.map(() => new Response("Internal error", { status: 500 })),
      ),
    ),
  );
```

## Checklist

When building a new API app:

- [ ] Create `apps/<name>/` with the structure above
- [ ] Define services in `services.ts` for each external dependency
- [ ] Define tagged errors in `errors.ts`
- [ ] Create layers in `layers.ts` with `ManagedRuntime` at the entry point
- [ ] One file per route group in `routes/`
- [ ] Adapter files (`*.adapter.ts`) for all external I/O
- [ ] Boundary convention: `Runtime.runPromise` only in `server.ts` (see `docs/patterns/boundaries.md`)
- [ ] `Effect.withSpan` on route handlers and adapter exports
- [ ] Map tagged errors to HTTP status codes at the boundary
- [ ] Run `bun run check` to verify ast-grep, drift, and types
