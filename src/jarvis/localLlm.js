/**
 * Probe local OpenAI-compatible runtimes (Ollama & LM Studio) for installed models like Qwen.
 */

const PROBE_TIMEOUT_MS = 1200;

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Detect whether Ollama (port 11434) or LM Studio (port 1234) are running locally.
 */
export async function detectLocalLlms() {
  const [ollamaData, lmStudioData] = await Promise.all([
    fetchWithTimeout('http://127.0.0.1:11434/api/tags'),
    fetchWithTimeout('http://127.0.0.1:1234/v1/models')
  ]);

  const ollamaModels = Array.isArray(ollamaData?.models)
    ? ollamaData.models.map((m) => m.name).filter(Boolean)
    : [];

  const lmStudioModels = Array.isArray(lmStudioData?.data)
    ? lmStudioData.data.map((m) => m.id).filter(Boolean)
    : [];

  return {
    ollama: {
      running: Boolean(ollamaData),
      baseUrl: 'http://127.0.0.1:11434/v1',
      models: ollamaModels
    },
    lmStudio: {
      running: Boolean(lmStudioData),
      baseUrl: 'http://127.0.0.1:1234/v1',
      models: lmStudioModels
    },
    recommendedQwen: {
      provider: 'Ollama',
      installUrl: 'https://ollama.com',
      pullCommand: 'ollama pull qwen2.5:7b',
      baseUrl: 'http://127.0.0.1:11434/v1',
      model: 'qwen2.5:7b'
    }
  };
}
