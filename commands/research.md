---
description: Research a codebase or best-practice path for a feature/task before design
argument-hint: [id] [prompt]
allowed-tools: Read, Grep, Glob, WebSearch, WebFetch, Bash(git *), Agent
---

## Instructions

You are running the `/research` command of the Research → Design → Implement workflow. Your job is to produce a thorough, well-grounded `research.md` before any design work happens.

**Arguments**: `$ARGUMENTS` holds everything typed after the command. The first whitespace-separated token is the `<id>` for this unit of work; everything after it is the `<prompt>` describing what to research.

### Steps

1. **Parse arguments.** Split `$ARGUMENTS` into `<id>` (first token) and `<prompt>` (the rest). If there's no first token, stop and ask the user to provide an id — do not guess or invent one. The id should be a short kebab-case slug (e.g. `checkout-v2`). Use this parsed `<id>` everywhere below.

2. **Duplicate ID check.** Check whether `.ai-workspace/<id>/` already exists.
   - If it exists, read `research.md`, `design.md`, and `implementation-log.md` frontmatter inside it (whichever are present) and summarize status to the user, e.g.: "ID `checkout-v2` already has research: complete, design: complete, implementation: 3/7 tasks done."
   - Ask the user to choose between:
     - **Create a unique ID** — suggest a disambiguated variant (e.g. `checkout-v2-2`) or let them supply a new one.
     - **Overwrite** — confirm explicitly ("This will replace existing research.md — proceed?") before deleting/replacing content.
   - Do not create or modify any files until the user has made this choice.

3. **Create the workspace.** Create `.ai-workspace/<id>/` (fresh, or per the user's overwrite choice).

4. **Clarify scope first.** Ask the user 3-5 targeted research questions to narrow scope (e.g. constraints, target users, non-goals, integration points, performance/security requirements relevant to the prompt). Wait for the user's answers before proceeding — do not skip ahead.

5. **Detect codebase presence.** Check whether you're running inside a git repo and/or whether relevant source directories exist for this prompt.
   - **If a codebase exists**: delegate to the `codebase-locator` agent (via the Agent tool) to find relevant files, modules, and existing patterns. Then delegate to the `codebase-analyzer` agent with the locator's output to read those files and summarize what they do, their conventions, and integration points. Do not read the whole codebase yourself in the main context — that's what these two sub-agents are for.
   - **If no codebase exists** (greenfield): switch to external research mode. Use WebSearch/WebFetch to find current best practices, the most-supported/most-maintained libraries or frameworks for the requested feature type, and common pitfalls.

6. **Use installed skills.** Before falling back to generic web research, check whether any installed Skills are relevant to this prompt (framework-specific skills, security-review, etc.) and invoke them if so.

7. **Answer each clarifying question explicitly** in your output — don't just fold the answers in silently.

8. **Write `.ai-workspace/<id>/research.md`** with:
   - YAML frontmatter: `id`, `research: in-progress` (set to `complete` once finished), `created`, `prompt`.
   - Scope questions & the user's answers.
   - Sub-agent findings (file paths, patterns, conventions, integration points) *or* best-practice findings (sources, library choices, trade-offs) depending on which mode was used.
   - Open risks/unknowns that design should account for.

9. **Mark complete.** Set `research: complete` in the frontmatter and tell the user the workspace is ready for `/design <id>`.

### Notes

- Never silently overwrite an existing `.ai-workspace/<id>/` — the duplicate ID handling above is mandatory, not optional.
- Keep the main context clean: delegate file-reading-heavy work on real codebases to the sub-agents rather than doing it inline.
- If the user's prompt is ambiguous about whether this is a greenfield or existing-codebase task, the git-repo/source-directory check in step 5 is the tiebreaker, but you can still ask if genuinely unclear.
