# Dev Workflow

A [Claude Code](https://claude.com/product/claude-code) plugin that guides an agent through a structured **Research → Design → Implement** workflow for feature and app development, persisting state to `.ai-workspace/<id>/` so context survives across sessions and commands.

## Why

Long-running feature work spans many Claude Code sessions. Without a persisted plan, each new session has to rediscover the codebase, re-litigate design decisions, and guess how far along implementation got. This plugin externalizes that state to disk so any session — today, tomorrow, or after a crash — can pick up exactly where the last one left off.

## Commands

### `/research <id> <prompt>`

Investigates a feature or task before any design work happens. If it's run inside an existing codebase, it delegates to the `codebase-locator` and `codebase-analyzer` sub-agents to find and explain relevant files without flooding the main context. If there's no relevant codebase (a greenfield task), it switches to web research for current best practices, libraries, and pitfalls. It asks 3-5 clarifying questions before starting and writes everything to `.ai-workspace/<id>/research.md`.

### `/design <id> [prompt]`

Turns completed research into a design doc and an ordered, atomic task checklist. Requires `research.md` to be marked complete first. Asks whether you already have an approach in mind or want one proposed, validates either against the research findings, and writes `.ai-workspace/<id>/design.md` plus an initialized `.ai-workspace/<id>/implementation-log.md`.

### `/implement <id> [focus note]`

Executes the design checklist one task at a time: implement → test → pause for your approval → commit → advance. Requires `design.md` to be marked complete first. If a task turns out not to be viable as designed, it pauses and proposes an amendment to `design.md` rather than silently deviating. Once every task is checked off, it runs a final validation pass — diffing the implementation against the design doc and running the full test suite — before marking the workspace complete.

All three read and write state through files, not conversation memory, so any command can be run in a fresh session and resume correctly.

## The `<id>` convention

Every unit of work gets a short kebab-case id (e.g. `checkout-v2`), which becomes its folder under `.ai-workspace/`:

```
.ai-workspace/
└── checkout-v2/
    ├── research.md            # findings, sources, resolved questions
    ├── design.md               # design doc + task checklist
    └── implementation-log.md   # structured per-task state, commit refs
```

Each file's frontmatter carries a status flag (`research: in-progress|complete`, `design: in-progress|complete`) so a later command can verify the prior phase actually finished before it proceeds.

`implementation-log.md` additionally tracks `current_task`, `current_task_status` (`pending`, `in-progress`, `pending-tests`, `tests-failed`, `pending-approval`, or `complete`), and `last_commit` in its frontmatter, plus one section per task. This is the resumability mechanism: `/implement` reads this file first, not the chat history, to know exactly where to pick back up.

**Commit `.ai-workspace/` to git.** It's valuable project history — a record of what was researched, decided, and built, and why — not scratch output.

### Duplicate IDs

If you run `/research <id>` and `.ai-workspace/<id>/` already exists, the command won't silently overwrite it. It shows you the existing folder's status and asks you to either pick a new/disambiguated id or explicitly confirm an overwrite.

### Rollback

There's no dedicated rollback command. Because `/implement` commits after each approved task, an approved-and-committed task that later proves wrong can be undone with a normal `git revert <sha>` — the per-task commit is already a clean revert point.

## The `codebase-locator` / `codebase-analyzer` split

`/research` delegates codebase exploration to two narrow sub-agents instead of reading files directly in the main conversation:

- **`codebase-locator`** (`Read`, `Grep`, `Glob`) finds relevant files and returns a flat list with one-line relevance notes — no explanation.
- **`codebase-analyzer`** (`Read`, `Grep`, `Glob`) takes that list and explains what each file does, its conventions, and how it'd need to change.

Splitting search from explanation keeps the main context window clean on large codebases: the (potentially large) intermediate output of searching never has to enter the main conversation, only the final summary does.

## The pre-commit reminder hook

`hooks/hooks.json` registers a `PreToolUse` hook on the `Bash` tool (`hooks/pre-commit-checklist.js`, a dependency-free Node script). It only does anything when *both* of these are true:

1. The command being run is a `git commit`.
2. The current directory contains an `.ai-workspace/` folder.

When both hold, it checks whether any id under `.ai-workspace/` has a task sitting in an unresolved state (`in-progress`, `pending-tests`, `tests-failed`, or `pending-approval`) and, if so, attaches a warning — visible to both Claude and you — rather than blocking the commit. This is a safety net, not a gate: the actual approve-then-commit sequencing is enforced by `/implement`'s own instructions, and outside a `.ai-workspace/`-enabled project this hook never fires at all.

## Installation

Copy this repo's contents into your project's `.claude/commands/`, `.claude/agents/`, and `.claude/hooks/` directories (matching the folder layout above), or install it as a proper plugin — see the [plugins documentation](https://code.claude.com/docs/en/plugins) for how to add it via a marketplace or a local path.

## Repo layout

```
dev-workflow-plugin/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   ├── research.md
│   ├── design.md
│   └── implement.md
├── agents/
│   ├── codebase-locator.md
│   └── codebase-analyzer.md
├── hooks/
│   ├── hooks.json
│   └── pre-commit-checklist.js
└── README.md
```

## License

MIT — see [LICENSE](LICENSE).
