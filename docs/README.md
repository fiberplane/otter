# docs/

System of record for the repository. AGENTS.md is the map, this directory is the territory.

## Convention

### What goes where

| Location                    | Contains                                                                 | Examples                                           |
| --------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------- |
| `AGENTS.md`                 | Map: apps, commands, pointers into docs/                                 | "For Effect patterns, see docs/patterns/effect.md" |
| `docs/patterns/`            | How we write code in this repo. Conventions, rules, idioms.              | Effect usage, coding style, observability setup    |
| `docs/templates/`           | How to build things. Specs for software components.                      | Effect CLI setup, API service scaffold             |
| `docs/architecture/`        | What the system looks like. Domain boundaries, data flow, key decisions. | Service architecture, data models                  |
| `docs/proposals/active/`    | What we are planning to change. Design docs with status and rationale.   | New app scaffolds, orchestration flows             |
| `docs/proposals/completed/` | Proposals that shipped. Kept for historical context.                     | Accepted designs after implementation              |
| `docs/experiments/`         | Feasibility notes and demo evidence that are not yet product decisions.  | Prototype results, spike findings                  |
| `docs/testing/`             | How we validate behavior. Test infrastructure and QA scenarios.          | QA scenario guide, integration test notes          |
| `docs/graveyard/`           | Retired docs for features or decisions that no longer describe the repo. | Removed prototypes, superseded designs             |

### docs/ vs skills

**docs/** = what's true about this repo. Facts, conventions, architecture.

**skills** = how to do things. Operational knowledge that helps an agent perform tasks.

Skills live in two places:

- `.agents/skills/` — repo-specific skills, versioned with the code. Techniques that reference this codebase's tools, scripts, or conventions.
- User-level skills outside the repo — personal skills, portable across repos. General techniques not tied to any codebase.

Overlap rule: if a pattern describes our codebase (our Effect conventions, our ast-grep rules), it belongs in docs/. If it teaches a technique for working on this codebase (how to run codemods here), it belongs in `.agents/skills/`. If it's a general technique (how ast-grep works), it belongs in a user-level skill outside the repo.

### Skill directory layout

`.agents/skills/` is the canonical home for repo-versioned skills. Claude Code looks under `.claude/skills/` instead, so each skill directory under `.agents/skills/` is mirrored as a symlink from `.claude/skills/`:

```
.agents/skills/drift/        # canonical
.claude/skills/drift -> ../../.agents/skills/drift   # symlink for Claude Code
```

Edit the canonical copy under `.agents/skills/`; the symlink keeps Claude Code in sync automatically. This layout means the same skill works under Claude Code and under more standardized agent setups (Codex and others) that read `.agents/skills/` directly, without duplicating files or losing version control on either side.

When adding a new skill, create it under `.agents/skills/<name>/` and then add the symlink:

```bash
ln -s ../../.agents/skills/<name> .claude/skills/<name>
```

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

### Proposals

Proposals are design docs for non-trivial changes. They live in `docs/proposals/active/`
while in progress and move to `docs/proposals/completed/` when shipped.

A proposal contains:

- Problem statement
- Design: what changes, with tables or diagrams where useful
- Phases, if the work is incremental
- Status: draft, accepted, or shipped

Proposals are not specs to follow blindly. They capture decisions and rationale so agents can
understand why the code looks the way it does.

### Experiments

Experiments capture feasibility work, demo notes, and prototype evidence. Keep them separate from
proposals unless the repo has accepted the design. When an experiment turns into a planned change,
write or move the decision into `docs/proposals/active/`.

### Keeping docs current

Docs rot when they describe code that changed. To mitigate:

- Patterns that can be enforced mechanically should have a corresponding ast-grep rule or linter
  check
- When you change code that a doc describes, update the doc in the same PR
- Retire dead docs into `docs/graveyard/` instead of leaving them in active directories

## Index

### patterns/

| Doc                                               | Topic                                                      |
| ------------------------------------------------- | ---------------------------------------------------------- |
| [effect.md](patterns/effect.md)                   | Effect conventions, service architecture, code smells      |
| [boundaries.md](patterns/boundaries.md)           | Boundary convention: adapters, entry points, interior code |
| [coding-style.md](patterns/coding-style.md)       | TypeScript coding style, early returns, type safety        |
| [data-validation.md](patterns/data-validation.md) | Schema-first validation at boundaries, anti-patterns       |
| [observability.md](patterns/observability.md)     | Effect + OpenTelemetry tracing and logging setup           |

### templates/

| Doc                              | Topic                                       |
| -------------------------------- | ------------------------------------------- |
| [cli.md](templates/cli.md)       | How to build an Effect CLI with Bun + yargs |
| [api.md](templates/api.md)       | How to build an Effect HTTP API             |
| [worker.md](templates/worker.md) | How to build an Effect background worker    |

### architecture/

Architecture notes are added as apps and packages are built. This directory starts empty.

### proposals/

- `active/` -- In-progress design docs
- `completed/` -- Shipped designs kept for historical context

### experiments/

Feasibility notes and demo evidence live here until they graduate into proposals or architecture.

### testing/

Validation patterns, test infrastructure notes, and QA scenario indexes live here.

| Doc                    | Topic                                                     |
| ---------------------- | --------------------------------------------------------- |
| [qa.md](testing/qa.md) | When to write prose-first QA scenarios with `packages/qa` |

### graveyard/

Retired docs live here when they are useful historical context but no longer describe active code.

## references/

Not part of `docs/` but related: the `references/` directory at the repo root holds shallow clones of upstream libraries (Effect, OpenTelemetry, etc.) for agents to read source code directly. It is gitignored and excluded from linting/formatting. See the References section of `AGENTS.md` for usage.
