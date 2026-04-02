# How to Build an Effect CLI

This is a reference template for CLI tools. For conventions that apply to all app types, see the patterns docs (`docs/patterns/`). This template shows CLI-specific wiring.

A template for building CLI tools with Effect + Bun + yargs. This describes the project structure, service patterns, and entry point setup that an agent should follow when creating a new CLI app.

## Project Structure

Create the app in `apps/<name>/`:

```
apps/<name>/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # Entry point (yargs setup, Effect.runMain)
│   ├── services.ts       # Context.Tag service definitions
│   ├── layers.ts         # Layer implementations
│   ├── errors.ts         # Data.TaggedError definitions
│   └── commands/
│       ├── hello.ts      # One file per command (or command group)
│       └── ...
```

## package.json

```json
{
  "name": "@otter/<name>",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "bin": {
    "<name>": "src/index.ts"
  },
  "scripts": {
    "dev": "bun run src/index.ts",
    "build": "bun build src/index.ts --outdir dist --target bun",
    "lint": "oxlint src/",
    "format": "oxfmt --write src/",
    "typecheck": "tsgo --noEmit",
    "test": "bun test"
  },
  "dependencies": {
    "effect": "^3.14.0",
    "@effect/platform": "^0.78.0",
    "@effect/platform-bun": "^0.56.0",
    "yargs": "^17.7.2"
  },
  "devDependencies": {
    "@types/yargs": "^17.0.33"
  }
}
```

**Note:** Check for the latest Effect versions before creating the package.json. The versions above are examples.

## tsconfig.json (app-level)

Extends the root config, adds build settings:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "noEmit": false,
    "declaration": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

## Services (services.ts)

Define services as Context.Tag — one per external dependency or configuration source:

```typescript
import { Context } from "effect";

/**
 * Application configuration resolved at startup.
 */
export class AppConfig extends Context.Tag("AppConfig")<
  AppConfig,
  {
    readonly configDir: string;
    readonly projectRoot: string;
    readonly verbose: boolean;
  }
>() {}
```

Keep services minimal — just the shape of the dependency. Implementation goes in layers.

## Errors (errors.ts)

All errors extend Data.TaggedError with descriptive messages:

```typescript
import { Data } from "effect";

export class ConfigNotFoundError extends Data.TaggedError("ConfigNotFoundError")<{
  readonly path: string;
  readonly suggestion?: string;
}> {
  get message(): string {
    const base = `Config not found at ${this.path}`;
    return this.suggestion ? `${base}\n  Suggestion: ${this.suggestion}` : base;
  }
}

export class CommandError extends Data.TaggedError("CommandError")<{
  readonly command: string;
  readonly reason: string;
}> {
  get message(): string {
    return `Command '${this.command}' failed: ${this.reason}`;
  }
}
```

## Layers (layers.ts)

Create live implementations of services:

```typescript
import { BunContext, BunFileSystem } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { AppConfig } from "./services";

export const AppConfigLive = Layer.effect(
  AppConfig,
  Effect.gen(function* () {
    const fs = yield* BunFileSystem.BunFileSystem;
    // Resolve configuration
    return {
      configDir: "/path/to/config",
      projectRoot: process.cwd(),
      verbose: false,
    };
  }),
);

// Compose all layers for the app
export const AppContext = Layer.mergeAll(AppConfigLive, BunContext.layer);
```

## Commands (commands/\*.ts)

Each command returns an Effect. Commands capture yargs args but don't execute — the entry point runs them:

```typescript
import { Effect } from "effect";
import { AppConfig } from "../services";
import type { CommandError } from "../errors";

export const hello = (args: { name: string }): Effect.Effect<void, CommandError, AppConfig> =>
  Effect.gen(function* () {
    const config = yield* AppConfig;
    yield* Effect.log(`Hello, ${args.name}!`, { configDir: config.configDir });
  }).pipe(Effect.withSpan("hello", { attributes: { name: args.name } }));
```

## Entry Point (index.ts)

Wire yargs to Effect using the async-resume pattern:

```typescript
#!/usr/bin/env bun
import { BunRuntime } from "@effect/platform-bun";
import { Effect, pipe } from "effect";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { hello } from "./commands/hello";
import { AppContext } from "./layers";

type CommandEffect = Effect.Effect<void, unknown, never>;

const parseArgs = (): Effect.Effect<CommandEffect> =>
  Effect.async<CommandEffect>((resume) => {
    let selectedCommand: CommandEffect | null = null;

    const cli = yargs(hideBin(process.argv))
      .scriptName("<name>")
      .command(
        "hello <name>",
        "Say hello",
        (yargs) =>
          yargs.positional("name", {
            type: "string",
            demandOption: true,
          }),
        (argv) => {
          // Capture the Effect with layers provided — don't execute yet
          selectedCommand = hello({ name: argv.name! }).pipe(Effect.provide(AppContext));
        },
      )
      .demandCommand(1, "Please specify a command")
      .strict()
      .help();

    const parseResult = cli.parse();

    const finalize = (): void => {
      if (selectedCommand !== null) {
        resume(Effect.succeed(selectedCommand));
      }
    };

    if (parseResult instanceof Promise) {
      parseResult.then(finalize).catch((error) => {
        resume(Effect.fail(error instanceof Error ? error : new Error(String(error))));
      });
    } else {
      finalize();
    }
  });

// Main program
const main = pipe(
  parseArgs(),
  Effect.flatMap((command) => command),
  Effect.catchAllCause((cause) =>
    Effect.gen(function* () {
      yield* Effect.logError("Command failed", cause);
      process.exit(1);
    }),
  ),
);

BunRuntime.runMain(main);
```

## Adding Observability

To add tracing to your CLI, see `docs/patterns/observability.md`. The key steps:

1. Add `@effect/opentelemetry` and `@opentelemetry/sdk-trace-base` dependencies
2. Create an env-var-gated `TracingLive` layer:
   ```typescript
   const TracingLive = process.env["EFFECT_TRACE"]
     ? NodeSdk.layer(() => ({
         resource: { serviceName: "my-cli" },
         spanProcessor: new SimpleSpanProcessor(new ConsoleSpanExporter()),
       }))
     : Layer.empty;
   ```
3. Add `TracingLive` to your `AppContext` layer composition
4. Use `Effect.withSpan` in your commands
5. Run with `EFFECT_TRACE=1 bun run dev` to see traces

## Checklist

When building a new CLI app:

- [ ] Create `apps/<name>/` with the structure above
- [ ] Define services in `services.ts` for each external dependency
- [ ] Define tagged errors in `errors.ts`
- [ ] Create layers in `layers.ts` with proper dependency composition
- [ ] One file per command in `commands/`
- [ ] Wire yargs in `index.ts` using the async-resume pattern
- [ ] Boundary convention: I/O in `*.adapter.ts` files, pure Effect everywhere else (see `docs/patterns/boundaries.md`)
- [ ] Add `Effect.withSpan` to commands and adapter exports for observability
- [ ] Run `ast-grep scan` to catch Effect anti-patterns
- [ ] Run `bun run typecheck` from root
