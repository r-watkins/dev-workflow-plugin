#!/usr/bin/env node
/**
 * PreToolUse hook (Bash) for the dev-workflow plugin.
 *
 * Scope is intentionally narrow: it only looks at `git commit` invocations,
 * and only does anything at all when the current working directory contains
 * an `.ai-workspace/` folder (i.e. this workflow is actually in use there).
 * In every other repo, on every other command, it's a silent no-op so it
 * never gets in the way of unrelated work.
 *
 * It never blocks the commit — it only attaches a warning (visible to both
 * Claude and the user) when an `/implement` task for this id looks
 * unresolved, so an accidental "commit before approval" doesn't slip by
 * unnoticed. Approval/commit sequencing is still enforced by the /implement
 * command's own instructions; this is a safety-net reminder, not a gate.
 */

const fs = require("fs");
const path = require("path");

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(data));
  });
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (kv) fields[kv[1]] = kv[2].trim();
  }
  return fields;
}

function findUnresolvedTasks(workspaceDir) {
  const unresolved = [];
  let ids;
  try {
    ids = fs.readdirSync(workspaceDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return unresolved;
  }

  const openStatuses = new Set(["in-progress", "pending-tests", "tests-failed", "pending-approval"]);

  for (const id of ids) {
    const logPath = path.join(workspaceDir, id, "implementation-log.md");
    let content;
    try {
      content = fs.readFileSync(logPath, "utf8");
    } catch {
      continue;
    }
    const fm = parseFrontmatter(content);
    if (fm.current_task_status && openStatuses.has(fm.current_task_status)) {
      unresolved.push({ id, task: fm.current_task, status: fm.current_task_status });
    }
  }
  return unresolved;
}

async function main() {
  const raw = await readStdin();
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  if (!input || input.tool_name !== "Bash") process.exit(0);

  const command = (input.tool_input && input.tool_input.command) || "";
  if (!/\bgit\s+commit\b/.test(command)) process.exit(0);

  const cwd = input.cwd || process.cwd();
  const workspaceDir = path.join(cwd, ".ai-workspace");
  if (!fs.existsSync(workspaceDir)) process.exit(0);

  const unresolved = findUnresolvedTasks(workspaceDir);
  if (unresolved.length === 0) process.exit(0);

  const details = unresolved
    .map((u) => `${u.id} (task ${u.task ?? "?"}, status: ${u.status})`)
    .join("; ");

  const output = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason:
        `dev-workflow: unresolved implementation task(s) found before this commit: ${details}. ` +
        "If this commit isn't the approved result of one of those tasks, confirm with the user before proceeding, " +
        "and follow the /implement approval flow (pause for review, then commit) rather than committing directly.",
    },
    systemMessage: `dev-workflow: unresolved task(s) in .ai-workspace: ${details}`,
  };

  process.stdout.write(JSON.stringify(output));
  process.exit(0);
}

main();
