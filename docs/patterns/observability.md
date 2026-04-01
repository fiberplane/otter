# Observability

How to wire up tracing, logging, and metrics with Effect and OpenTelemetry.

## Why

Effect has built-in support for structured logging, spans, and metrics. By wiring these into OpenTelemetry, you get full observability with minimal code — traces show the call tree of your Effect programs, logs carry span context, and metrics are exported automatically.

For development, a console exporter lets agents inspect structured traces without external infrastructure. For production, swap in an OTLP exporter to send data to Jaeger, Honeycomb, Grafana, etc.

## Console Exporter (Development)

The simplest setup — traces print to stdout as structured JSON. Good for development and for agents debugging runtime behavior.

```typescript
import * as NodeSdk from "@effect/opentelemetry/NodeSdk"
import { ConsoleSpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"

// Create the tracing layer
const TracingLive = NodeSdk.layer(() => ({
  resource: {
    serviceName: "my-cli"
  },
  spanProcessor: new SimpleSpanProcessor(new ConsoleSpanExporter())
}))

// Use Effect.withSpan to create spans
const program = pipe(
  Effect.log("Processing item"),
  Effect.withSpan("process-item"),
  Effect.withSpan("main")
)

// Provide the tracing layer at the edge
pipe(
  program,
  Effect.provide(TracingLive),
  Effect.runFork
)
```

### Required packages

```bash
bun add effect @effect/opentelemetry @opentelemetry/sdk-trace-base @opentelemetry/sdk-trace-node
```

## OTLP Exporter (Production / Jaeger / Grafana)

Effect includes a lightweight OTLP module that sends traces, logs, and metrics over HTTP — no heavy SDK dependencies needed.

```typescript
import * as Otlp from "@effect/opentelemetry/Otlp"
import * as OtlpSerialization from "@effect/opentelemetry/OtlpSerialization"
import { FetchHttpClient } from "@effect/platform"
import * as Layer from "effect/Layer"

// Send to a local Jaeger/Grafana Tempo/Honeycomb endpoint
const TracingLive = Otlp.layerJson({
  baseUrl: "http://localhost:4318",
  resource: {
    serviceName: "my-cli",
    serviceVersion: "1.0.0"
  }
}).pipe(
  Layer.provide(FetchHttpClient.layer)
)
```

### Required packages (OTLP)

```bash
bun add effect @effect/opentelemetry @effect/platform
```

## Adding Spans to Your Code

Effect.withSpan wraps any Effect in a trace span:

```typescript
const fetchUser = (id: string) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService
    return yield* db.query("SELECT * FROM users WHERE id = ?", [id])
  }).pipe(
    Effect.withSpan("fetchUser", { attributes: { userId: id } })
  )

const processRequest = (userId: string) =>
  Effect.gen(function* () {
    const user = yield* fetchUser(userId)
    const result = yield* transformUser(user)
    return result
  }).pipe(
    Effect.withSpan("processRequest")
  )
```

This produces a trace tree:
```
processRequest
└── fetchUser (userId: "123")
```

## Logging with Span Context

Effect.log automatically carries span context — logs are correlated with their parent span:

```typescript
const program = Effect.gen(function* () {
  yield* Effect.log("Starting processing")
  const data = yield* fetchData()
  yield* Effect.log("Fetched data", { count: data.length })
  const result = yield* transformData(data)
  yield* Effect.logWarning("Slow transform detected")
  return result
}).pipe(
  Effect.withSpan("pipeline")
)
```

With the OTLP exporter, these logs appear in your observability backend with full trace context.

## Integrating with Service Layers

Add the tracing layer to your app's layer composition:

```typescript
import { Layer } from "effect"

// Compose all layers
const AppContext = Layer.mergeAll(
  ConfigLive,
  DatabaseLive,
  TracingLive
)

// Provide once at the edge
Effect.runFork(
  program.pipe(Effect.provide(AppContext))
)
```

For CLI apps using `Effect.runMain`:

```typescript
import { Effect } from "effect"

const main = program.pipe(
  Effect.provide(AppContext)
)

Effect.runMain(main)
```

## Reading Trace Output (for Agents)

With the console exporter, spans print as JSON to stdout. Key fields:

- `name` — the span name from `Effect.withSpan`
- `traceId` / `spanId` — identifiers for correlation
- `parentId` — links to parent span (shows the call tree)
- `duration` — how long the span took (in microseconds)
- `status` — `OK`, `ERROR`, or `UNSET`
- `attributes` — custom data attached via `Effect.withSpan`
- `events` — logs emitted within the span

Agents can grep stdout for specific span names or trace IDs to understand program behavior without stepping through code.
