# docs/

System of record for the repository. AGENTS.md is the map, this directory is the territory.

## Convention

### What goes where

| Location             | Contains                                                                 | Examples                                           |
| -------------------- | ------------------------------------------------------------------------ | -------------------------------------------------- |
| `AGENTS.md`          | Map: apps, commands, pointers into docs/                                 | "For Effect patterns, see docs/patterns/effect.md" |
| `docs/patterns/`     | How we write code in this repo. Conventions, rules, idioms.              | Effect usage, coding style, observability setup    |
| `docs/templates/`    | How to build things. Specs for software components.                      | Effect CLI setup, API service scaffold             |
| `docs/architecture/` | What the system looks like. Domain boundaries, data flow, key decisions. | Service architecture, data models                  |

### docs/ vs skills

**docs/** = what's true about this repo. Facts, conventions, architecture.

**skills** = how to do things. Operational knowledge that helps an agent perform tasks.

Skills live in two places:

- `.claude/skills/` — repo-specific skills, versioned with the code. Techniques that reference this codebase's tools, scripts, or conventions.
- `~/.claude/skills/` — personal skills, portable across repos. General techniques not tied to any codebase.

Overlap rule: if a pattern describes our codebase (our Effect conventions, our ast-grep rules), it belongs in docs/. If it teaches a technique for working on this codebase (how to run codemods here), it belongs in `.claude/skills/`. If it's a general technique (how ast-grep works), it belongs in `~/.claude/skills/`.

### docs/ vs app READMEs

App READMEs answer "how do I get this running." They contain:

- Prerequisites and install steps
- Dev/build/test commands
- Environment setup
- Links to relevant docs/ for patterns and architecture

App READMEs do NOT contain:

- Coding patterns or conventions (-> docs/patterns/)
- Architecture deep-dives (-> docs/architecture/)

### Adding new docs

1. Read this file first to find the right location
2. Add the doc to the appropriate directory
3. Update this index (below)
4. If the doc establishes a pattern that should be mechanically enforced, add or update an ast-grep rule
5. If the doc describes code behavior, bind it with `drift link <doc> <source-file>`

## Index

### patterns/

| Doc                                           | Topic                                                      |
| --------------------------------------------- | ---------------------------------------------------------- |
| [effect.md](patterns/effect.md)               | Effect conventions, service architecture, code smells      |
| [boundaries.md](patterns/boundaries.md)       | Boundary convention: adapters, entry points, interior code |
| [coding-style.md](patterns/coding-style.md)   | TypeScript coding style, early returns, type safety        |
| [data-validation.md](patterns/data-validation.md) | Schema-first validation at boundaries, anti-patterns       |
| [observability.md](patterns/observability.md) | Effect + OpenTelemetry tracing and logging setup           |

### templates/

| Doc                              | Topic                                       |
| -------------------------------- | ------------------------------------------- |
| [cli.md](templates/cli.md)       | How to build an Effect CLI with Bun + yargs |
| [api.md](templates/api.md)       | How to build an Effect HTTP API             |
| [worker.md](templates/worker.md) | How to build an Effect background worker    |

### architecture/

Architecture notes are added as apps and packages are built. This directory starts empty.

## references/

Not part of `docs/` but related: the `references/` directory at the repo root holds shallow clones of upstream libraries (Effect, OpenTelemetry, etc.) for agents to read source code directly. It is gitignored and excluded from linting/formatting. See the References section of `AGENTS.md` for usage.
