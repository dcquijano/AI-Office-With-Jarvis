import fs from 'node:fs/promises';
import path from 'node:path';

function slugify(text) {
  return String(text || 'task')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'task';
}

function buildBriefingMarkdown(mission) {
  const usage = mission.tokenUsage || {
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalTokens: 0,
    budgetTokens: 8192,
    budgetPercent: 0,
    source: 'estimated'
  };

  const lines = [
    `# ${mission.finalResponse?.headline || 'J.A.R.V.I.S. Mission Briefing'}`,
    '',
    `- **Mission ID:** \`${mission.id}\``,
    `- **Status:** ${mission.status}`,
    `- **Mode:** ${mission.mode} (${mission.plannerModel || 'local'})`,
    `- **Created:** ${mission.createdAt}`,
    `- **Completed:** ${mission.completedAt || ''}`,
    '',
    '## Token Usage & Budget Percentage',
    '',
    `- **Total Tokens:** ${usage.totalTokens} (${usage.source})`,
    `- **Prompt / Completion:** ${usage.totalPromptTokens} / ${usage.totalCompletionTokens}`,
    `- **Budget Utilization:** ${usage.budgetPercent}% of ${usage.budgetTokens} token budget`,
    '',
    '| Task # | Specialist | Title | Tokens | Share % | Budget % |',
    '|---|---|---|---|---|---|'
  ];

  for (const t of mission.tasks) {
    const tu = t.tokenUsage || { totalTokens: 0, sharePercent: 0, budgetPercent: 0 };
    lines.push(
      `| #${t.id} | ${t.selection?.agentName || t.agentId} | ${t.title} | ${tu.totalTokens} | ${tu.sharePercent}% | ${tu.budgetPercent}% |`
    );
  }

  lines.push('', '## Executive Summary', '', mission.finalResponse?.summary || 'No summary generated.');

  if (Array.isArray(mission.finalResponse?.guidedNextSteps) && mission.finalResponse.guidedNextSteps.length > 0) {
    lines.push('', '## Guided Next Steps', '');
    for (const step of mission.finalResponse.guidedNextSteps) {
      lines.push(`- ${step}`);
    }
  }

  return lines.join('\n') + '\n';
}

function buildTaskMarkdown(mission, task) {
  const tu = task.tokenUsage || { promptTokens: 0, completionTokens: 0, totalTokens: 0, sharePercent: 0, budgetPercent: 0, source: 'estimated' };
  const lines = [
    `# Task #${task.id}: ${task.title}`,
    '',
    `- **Mission:** \`${mission.id}\``,
    `- **Specialist:** ${task.selection?.agentName || task.agentId} (${task.selection?.role || task.task})`,
    `- **Model Profile:** ${task.selection?.model || 'default'}`,
    `- **Confidence:** ${Math.round((task.selection?.confidence || 0) * 100)}%`,
    `- **Duration:** ${task.durationMs || 0}ms`,
    `- **Tokens:** ${tu.totalTokens} (${tu.promptTokens} prompt + ${tu.completionTokens} completion, ${tu.sharePercent}% of mission, ${tu.budgetPercent}% of budget, ${tu.source})`,
    '',
    '## Instruction',
    '',
    task.instruction,
    '',
    '## Summary',
    '',
    task.output?.summary || 'Completed.',
    '',
    '## Deliverables',
    ''
  ];

  for (const item of task.output?.deliverables || []) {
    lines.push(`- ${item}`);
  }

  return lines.join('\n') + '\n';
}

/**
 * Persist completed mission briefing, full JSON, and per-specialist task files to disk.
 * @param {object} mission
 * @param {string} missionsRootDir
 */
export async function saveMissionArtifacts(mission, missionsRootDir) {
  if (!missionsRootDir) return null;

  const safeMissionId = path.basename(mission.id);
  const missionDir = path.resolve(missionsRootDir, safeMissionId);
  const tasksDir = path.join(missionDir, 'tasks');

  await fs.mkdir(tasksDir, { recursive: true });

  const savedFiles = [];

  await fs.writeFile(path.join(missionDir, 'briefing.md'), buildBriefingMarkdown(mission), 'utf8');
  savedFiles.push('briefing.md');

  for (const task of mission.tasks) {
    const filename = `${task.id}-${task.agentId}-${slugify(task.title)}.md`;
    const relPath = `tasks/${filename}`;
    await fs.writeFile(path.join(tasksDir, filename), buildTaskMarkdown(mission, task), 'utf8');
    savedFiles.push(relPath);
  }

  await fs.writeFile(path.join(missionDir, 'mission.json'), JSON.stringify(mission, null, 2), 'utf8');
  savedFiles.push('mission.json');

  return {
    folder: missionDir,
    relativeFolder: `missions/${safeMissionId}`,
    savedFiles
  };
}

/**
 * Safely read a saved mission deliverable file with path-traversal protection.
 * @param {string} missionId
 * @param {string} relFile
 * @param {string} missionsRootDir
 */
export async function readMissionArtifact(missionId, relFile, missionsRootDir) {
  if (!missionsRootDir) return null;
  const safeId = path.basename(missionId);
  const missionDir = path.resolve(missionsRootDir, safeId);
  const resolved = path.resolve(missionDir, String(relFile || '').replace(/^\/+/, ''));

  if (!resolved.startsWith(missionDir + path.sep)) {
    const err = new Error('Invalid artifact file path.');
    err.statusCode = 400;
    throw err;
  }

  const content = await fs.readFile(resolved, 'utf8');
  return { file: relFile, content };
}
