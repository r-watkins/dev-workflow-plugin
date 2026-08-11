---
description: Create a design doc and task checklist for a researched feature
argument-hint: [id] [prompt]
allowed-tools: Read, Write, Grep, Glob
---

## Instructions

You are running the `/design` command of the Research → Design → Implement workflow. Your job is to turn completed research into a concrete design doc and an atomic, ordered task checklist that `/implement` can execute one task at a time.

**Arguments**: `$ARGUMENTS` holds everything typed after the command. The first whitespace-separated token is the `<id>`; everything after it is an optional `<prompt>` giving extra direction for this design pass.

### Steps

1. **Parse arguments.** Split `$ARGUMENTS` into `<id>` (first token) and an optional `<prompt>` (the rest). If there's no first token, stop and ask the user for the id — do not guess.

2. **Require research.** Check that `.ai-workspace/<id>/research.md` exists and its frontmatter has `research: complete`. If it's missing or still `in-progress`, stop and tell the user to run `/research <id>` (or let research finish) first — do not proceed on incomplete or absent research.

3. **Read research.md in full** before doing anything else, so the design is grounded in the actual findings (file paths, conventions, best-practice choices, open risks) rather than assumptions.

4. **Ask the user**: "Do you already have a design/approach in mind, or should I propose one?"
   - If they give you their approach: validate it against the research findings and explicitly flag any conflicts (e.g. an assumption the research contradicts, a pattern in the codebase it doesn't follow).
   - If not: propose 1-2 options with trade-offs, grounded in the research, and let the user pick or adjust.

5. **Write `.ai-workspace/<id>/design.md`** containing:
   - YAML frontmatter: `id`, `design: in-progress` (set to `complete` once finalized), `created`.
   - A design summary and the key architecture/approach decisions (and why, referencing research findings).
   - A file/module-level plan (what gets created, what gets touched, and how).
   - An ordered **task checklist** in the form `- [ ] Task N: <description>`, broken into atomic units that are each independently committable and independently testable. Each task should be small enough to implement, test, and review in one `/implement` pass.

6. **Confirm with the user** before finalizing — show the design doc and checklist, and allow edits. Do not mark it complete until the user is satisfied.

7. **Initialize `.ai-workspace/<id>/implementation-log.md`** with:
   ```yaml
   ---
   id: <id>
   current_task: 1
   current_task_status: pending
   last_commit: null
   ---
   ```
   plus one `## Task N: <description>` section per checklist item, each with `status: pending`, `commit: null`, `tests: not-run`, `notes:` (empty).

8. **Mark complete.** Set `design: complete` in `design.md`'s frontmatter and tell the user it's ready for `/implement <id>`.

### Notes

- `design.md` is the living source of truth for what "done" means on this id — keep it internally consistent with `implementation-log.md`'s task list (same tasks, same order, same numbering) since `/implement` will maintain both as it works.
- Don't skip the confirmation step even if the user gave you their own approach verbatim — they still need to see and approve the resulting task breakdown.
