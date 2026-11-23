/**
 * Shared LLM endpoint resolution (cloud or local Ollama/LM Studio) and token usage helpers.
 */

export const DEFAULT_MISSION_BUDGET_TOKENS = 8192;

/**
 * Resolve OpenAI-compatible endpoint config. Localhost endpoints (e.g. Ollama/LM Studio)
 * do not require an API key.
 * @param {object} options
 * @param {string} defaultModel
 */
export function resolveLlmEndpoint(options = {}, defaultModel = 'gpt-4o-mini') {
  if (options.useExternalLlm === false) return null;

  const apiKey = options.apiKey || process.env.OPENAI_API_KEY || '';
  const rawBaseUrl = options.baseUrl || process.env.OPENAI_BASE_URL || '';
  const isLocalHost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(rawBaseUrl);

  if (!apiKey && !isLocalHost) {
    return null;
  }

  return {
    apiKey: apiKey || 'local-llm',
    baseUrl: (rawBaseUrl || 'https://api.openai.com/v1').replace(/\/$/, ''),
    model: options.model || process.env.JARVIS_WORKER_MODEL || defaultModel
  };
}

/**
 * Estimate token count using standard ~4 characters/token heuristic.
 * @param {string} text
 */
export function estimateTokens(text) {
  const str = typeof text === 'string' ? text : JSON.stringify(text ?? '');
  return Math.max(1, Math.ceil(str.length / 4));
}

/**
 * Normalize API usage object or fall back to deterministic estimation.
 * @param {object|null|undefined} rawUsage
 * @param {string} promptText
 * @param {string} outputText
 */
export function measureTokenUsage(rawUsage, promptText, outputText) {
  if (
    rawUsage &&
    Number.isFinite(rawUsage.prompt_tokens) &&
    Number.isFinite(rawUsage.completion_tokens)
  ) {
    const promptTokens = rawUsage.prompt_tokens;
    const completionTokens = rawUsage.completion_tokens;
    const totalTokens = Number.isFinite(rawUsage.total_tokens)
      ? rawUsage.total_tokens
      : promptTokens + completionTokens;
    return { promptTokens, completionTokens, totalTokens, source: 'actual' };
  }

  const promptTokens = estimateTokens(promptText);
  const completionTokens = estimateTokens(outputText);
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    source: 'estimated'
  };
}

/**
 * Aggregate mission-level token totals and assign share % and budget % per task.
 * @param {object} mission
 * @param {number} budgetTokens
 */
export function computeMissionTokenUsage(mission, budgetTokens = DEFAULT_MISSION_BUDGET_TOKENS) {
  const plannerTokens = mission.plannerTokenUsage || {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    source: 'estimated'
  };

  let totalPrompt = plannerTokens.promptTokens;
  let totalCompletion = plannerTokens.completionTokens;
  let totalTokens = plannerTokens.totalTokens;
  const sources = new Set([plannerTokens.source]);

  for (const task of mission.tasks) {
    const tu = task.tokenUsage || {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      source: 'estimated'
    };
    totalPrompt += tu.promptTokens;
    totalCompletion += tu.completionTokens;
    totalTokens += tu.totalTokens;
    sources.add(tu.source);
  }

  const safeTotal = Math.max(1, totalTokens);
  for (const task of mission.tasks) {
    const tu = task.tokenUsage || { promptTokens: 0, completionTokens: 0, totalTokens: 0, source: 'estimated' };
    task.tokenUsage = {
      ...tu,
      sharePercent: Number(((tu.totalTokens / safeTotal) * 100).toFixed(1)),
      budgetPercent: Number(((tu.totalTokens / budgetTokens) * 100).toFixed(1))
    };
  }

  const combinedSource =
    sources.size === 1 ? [...sources][0] : sources.has('actual') ? 'mixed' : 'estimated';

  return {
    totalPromptTokens: totalPrompt,
    totalCompletionTokens: totalCompletion,
    totalTokens,
    budgetTokens,
    budgetPercent: Number(((totalTokens / budgetTokens) * 100).toFixed(1)),
    plannerTokens: plannerTokens.totalTokens,
    plannerPercent: Number(((plannerTokens.totalTokens / safeTotal) * 100).toFixed(1)),
    source: combinedSource
  };
}
