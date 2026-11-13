---
description: Execute the design checklist for a feature, one task at a time with tests, commits, revisions, and final validation
argument-hint: [id] [optional focus note]
allowed-tools: Read, Write, Edit, Bash(git *), Bash(npm *), Bash(pytest *), Agent
---

## Instructions

You are running the `/implement` command of the Research → Design → Implement workflow. Your job is to execute the design checklist for `<id>` one task at a time — implement, test, pause for approval, commit, repeat — and to run a final validation pass once every task is checked off. State lives in `implementation-log.md`, not in this conversation, because sessions may restart mid-run.

**Arguments**: `$ARGUMENTS` holds everything typed after the command. The first whitespace-separated token is the `<id>`; everything after it is an optional focus note (e.g. "skip task 4 for now and come back to it") — treat it as guidance, not a license to skip the resume/state logic below.

### Steps

1. **Parse arguments.** Split `$ARGUMENTS` into `<id>` (first token) and an optional focus note (the rest). If there's no first token, stop and ask the user for the id — do not guess.

2. **Require design.** Check that `.ai-workspace/<id>/design.md` exists and its frontmatter has `design: complete`. If not, stop and tell the user to run `/design <id>` first. Load its task checklist.

3. **Resume check.** Read `.ai-workspace/<id>/implementation-log.md` frontmatter: `current_task`, `current_task_status`, `last_commit`.
   - If `current_task_status` is `in-progress` with no diff/test result recorded yet in that task's log entry, treat it as incomplete and restart that task's implementation from scratch — don't assume partial edits are trustworthy.
   - If `current_task_status` is `pending-tests`, `tests-failed`, or `pending-approval` and there's a recorded diff/test result, **re-present that existing diff and test result to the user** rather than redoing the work — pick up exactly where the prior session left off.
   - Otherwise (`pending` or `complete`), proceed normally to identify the next task.

4. **Identify the next task** using the `current_task` pointer in the log — not just the first unchecked box in `design.md` — so resuming after a skip or revision lands on the right task.

5. **Implement the task.** Make code changes for this task only. Do not cascade into the next task's changes, even if it seems convenient.
   - Follow the Naming convention in Notes below for every variable, parameter, and loop binding you write — including in tests.
   - If the design doc doesn't resolve how to implement some part of this task — a choice between viable approaches, libraries, or edge-case handling — don't guess. Per the Decision policy (see `/research`'s instructions), stop and ask the user, unless `implementation-log.md`'s frontmatter has `autonomy: autonomous`, in which case proceed and record the assumption in that task's log notes. This is separate from the pause-for-approval gate in step 8, which always applies regardless of autonomy mode.

6. **Run tests.** Before pausing for approval, run the project's existing test suite (or the relevant subset for the touched area). If no tests exist for this task's behavior, write minimal tests covering it. Record the result (`passed`/`failed`) in the log entry.
   - If tests fail, iterate autonomously — diagnose and fix — up to a reasonable retry limit (a small handful of attempts) before giving up and surfacing the failure to the user instead of looping indefinitely.

7. **Revise check.** Before presenting the task as done, check whether it can actually still be completed as designed given what you now know (a research assumption turned out wrong, a dependency doesn't support the planned approach, etc.).
   - If it can't: pause, explain the conflict to the user, and propose an amendment to `design.md` (revised task description, or added/removed tasks).
   - On user approval: update `design.md` and its checklist (and `implementation-log.md`'s task sections to match) before continuing implementation. Never let `design.md` silently drift out of sync with what's actually being built.

8. **Pause for review after every task**, regardless of test outcome. Present a diff/summary and the test results, and wait for explicit user approval before committing.
   - **On approval**: check off the item in `design.md` (`- [x]`), update `implementation-log.md` for this task (`status: complete`, `commit: <sha>`, `tests: passed`, brief notes), commit with message `[<id>] <task description>`, advance `current_task` in the frontmatter to the next task, set `current_task_status: pending`.
   - **On rejection / changes requested**: iterate on the same task. Do not check it off, do not advance `current_task`, do not commit, until the user approves.
   - Update `implementation-log.md`'s `current_task_status` at each sub-step (`in-progress` while coding, `pending-tests` while running tests, `tests-failed` if they fail and retries are exhausted, `pending-approval` once you're presenting the diff) so a fresh session can resume at the right sub-step.

9. **Final validation** — runs automatically, as the last step, once every checklist item in `design.md` is checked off (don't wait for a separate command):
   - Re-read `research.md` and `design.md` in full.
   - Diff what was actually implemented against `design.md`'s stated architecture/approach — flag deviations, skipped edge cases, or research risks that were never addressed.
   - Run the *full* test suite (not just per-task subsets) to confirm nothing regressed across tasks.
   - Present a validation summary: deviations found, full test suite result, unaddressed research risks.
   - If deviations are found, offer the user a choice: accept them as intentional (update `design.md` to match reality) or open follow-up tasks in `design.md`/the log to reconcile them.
   - Mark `implementation: complete` in `implementation-log.md`'s frontmatter once the user is satisfied with the validation summary.

### Notes

- `implementation-log.md` frontmatter is the durable source of truth. Read and write it on every state transition — never rely on conversation history to know what task you're on, since this command may be invoked in a fresh session.
- `last_commit` plus `design.md`'s checked-off items are the fallback reconstruction path if the log itself is ever corrupted or out of sync — trust `git log` over the log file if they disagree.
- Never skip the pause-for-approval step, even for trivial tasks or when a focus note asks you to move fast — approval gates the commit, not the implementation speed. This holds even when `autonomy: autonomous` is set — autonomy covers open-ended judgment calls during implementation, not the approval/commit gate.
- Naming convention: never use single-letter variable names (`i`, `e`, `x`, `n`, `p`, etc.), including loop counters, lambda parameters, and catch bindings. Use descriptive names that are balanced — clear enough to convey what the value holds, but no longer than necessary. Prefer whole words over abbreviations (`error` not `err`, `index` not `idx`, `response` not `res`, `user` not `usr`). Where the language or an established ecosystem convention requires a specific name (e.g. `self`, `cls`, `_` for a deliberately unused binding, or a framework-mandated parameter name), follow that instead. When editing existing code, match the surrounding style for pre-existing names, but apply this convention to anything you add. Pass this rule along when delegating code-writing to any subagent.
- Decision policy (see `/research`'s instructions for the full statement): default to asking the user at any fork rather than guessing, unless `autonomy: autonomous` is set in the log's frontmatter — the user can grant or revoke this verbally at any point; update the frontmatter to match.
