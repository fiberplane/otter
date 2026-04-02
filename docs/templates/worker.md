# How to Build an Effect Worker

This is a reference template for background workers and queue processors. For conventions that apply to all app types, see the patterns docs (`docs/patterns/`). This template shows worker-specific wiring.

## Project Structure

```
apps/<name>/
├── package.json
├── tsconfig.json
├── src/
│   ├── worker.ts         # Entry point (message loop, runtime)
│   ├── services.ts       # Context.Tag service definitions
│   ├── layers.ts         # Layer implementations
│   ├── errors.ts         # Data.TaggedError definitions
│   ├── handlers/
│   │   ├── process-job.ts
│   │   └── ...
│   └── adapters/
│       ├── queue.adapter.ts
│       └── ...
```

Same conventions: services, errors, layers. Handlers replace commands/routes. The queue adapter bridges an external message source into Effect.

## The Worker Boundary Pattern

Build a runtime once. Each message enters Effect through `Runtime.runPromise` at the boundary:

```typescript
// worker.ts (boundary)
import { Effect, ManagedRuntime, Runtime } from "effect";
import { AppContext } from "./layers";
import { routeMessage } from "./handlers";

const runtime = ManagedRuntime.make(AppContext);

// Message loop -- your queue adapter provides the source
for await (const message of messageSource) {
  const effect = routeMessage(message).pipe(
    Effect.withSpan("worker.message", {
      attributes: { messageType: message.type },
    }),
  );

  await Runtime.runPromise(runtime)(effect)
    .then(() => message.ack())
    .catch(() => message.nack());
}
```

## Queue Adapter

The adapter wraps the external queue system and exposes it as an Effect service. All queue-specific code lives here:

```typescript
// adapters/queue.adapter.ts (boundary)
import { Effect, Layer } from "effect";
import { QueueService } from "../services";

export const QueueLive = Layer.effect(
  QueueService,
  Effect.gen(function* () {
    // Connect to your queue system
    return {
      consume: (handler: (msg: Message) => Effect.Effect<void, ProcessError>) =>
        Effect.tryPromise({
          try: () => connectAndConsume(),
          catch: (error) => new QueueConnectionError({ cause: error }),
        }).pipe(Effect.withSpan("queue.consume")),
    };
  }),
);
```

Effect also has native primitives for this pattern -- `Queue`, `Stream`, and `PubSub` -- which work well when both producer and consumer are in-process. Use them when appropriate, but the adapter pattern still applies for external queue systems.

## Handlers

Handlers are pure Effect functions. They don't know about the queue or the runtime:

```typescript
// handlers/process-job.ts (interior)
import { Effect } from "effect";
import { DatabaseService } from "../services";
import type { ProcessError } from "../errors";

export const processJob = (job: Job): Effect.Effect<void, ProcessError, DatabaseService> =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    yield* db.updateStatus(job.id, "processing");
    yield* doWork(job);
    yield* db.updateStatus(job.id, "complete");
  }).pipe(Effect.withSpan("processJob", { attributes: { jobId: job.id } }));
```

## Graceful Shutdown

Use Effect's `Scope` and finalizers to clean up on shutdown. Layers with `acquireRelease` handle this automatically:

```typescript
// layers.ts
export const QueueConnectionLive = Layer.scoped(
  QueueService,
  Effect.acquireRelease(connectToQueue(), (connection) => Effect.sync(() => connection.close())),
);
```

When the runtime is disposed (e.g., on `SIGTERM`), all scoped resources finalize in reverse order.

## Observability

Same env-var-gated pattern (see `docs/patterns/observability.md`). For workers, add a long-running span for the worker loop and per-message spans for handlers:

```typescript
// layers.ts
const TracingLive = process.env["EFFECT_TRACE"]
  ? NodeSdk.layer(() => ({
      resource: { serviceName: "my-worker" },
      spanProcessor: new SimpleSpanProcessor(new ConsoleSpanExporter()),
    }))
  : Layer.empty;

export const AppContext = Layer.mergeAll(QueueLive, DatabaseLive, TracingLive);
```

## Checklist

When building a new worker app:

- [ ] Create `apps/<name>/` with the structure above
- [ ] Define services in `services.ts` for queue and dependencies
- [ ] Define tagged errors in `errors.ts`
- [ ] Queue adapter in `adapters/` wraps external queue system
- [ ] One file per handler in `handlers/`
- [ ] Boundary convention: `Runtime.runPromise` only in `worker.ts` (see `docs/patterns/boundaries.md`)
- [ ] `Effect.withSpan` on handlers and adapter exports
- [ ] Graceful shutdown via `Layer.scoped` / `acquireRelease`
- [ ] Run `bun run check` to verify ast-grep, drift, and types
