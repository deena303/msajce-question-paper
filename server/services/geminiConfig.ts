import { GoogleGenAI } from '@google/genai';

type GeminiConfigStatus = 'configured' | 'missing' | 'invalid';

export interface GeminiConfigCheck {
  configured: boolean;
  status: GeminiConfigStatus;
  message: string;
  model?: string;
}

// In-memory cache for live validation to avoid spamming Google's API on frequent health checks
let cachedStatus: GeminiConfigCheck | null = null;
let lastCheckTime = 0;
const CACHE_TTL_MS = 60000; // 1 minute cache

function cleanEnvVal(value: string | undefined): string {
  if (!value) return '';
  let cleaned = value.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

export function getGeminiApiKey(): string {
  return cleanEnvVal(process.env.GEMINI_API_KEY);
}

/**
 * Validates the Gemini API key against Google's API using the @google/genai SDK.
 * Does NOT rely on hardcoded prefixes.
 */
export async function checkGeminiConfigLive(forceRefresh = false): Promise<GeminiConfigCheck> {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    const res: GeminiConfigCheck = {
      configured: false,
      status: 'missing',
      message: 'GEMINI_API_KEY is not configured in the backend environment.'
    };
    cachedStatus = res;
    lastCheckTime = Date.now();
    return res;
  }

  if (!forceRefresh && cachedStatus && (Date.now() - lastCheckTime < CACHE_TTL_MS)) {
    return cachedStatus;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const configuredModel = process.env.GEMINI_MODEL?.trim() || 'gemini-3.6-flash';
    
    // Probe the model or list models to verify the key
    try {
      await ai.models.get({ model: configuredModel });
      const res: GeminiConfigCheck = {
        configured: true,
        status: 'configured',
        message: `Gemini API key verified successfully (model: ${configuredModel}).`,
        model: configuredModel
      };
      cachedStatus = res;
      lastCheckTime = Date.now();
      return res;
    } catch (modelErr: any) {
      const msg = String(modelErr?.message || modelErr || '').toLowerCase();
      const status = modelErr?.status || modelErr?.code;

      // If the specific model is 404 / deprecated, check if the key itself is valid by listing models
      if (status === 404 || msg.includes('not found') || msg.includes('no longer available')) {
        const models = await ai.models.list();
        let firstAvailable = 'gemini-3.6-flash';
        for await (const m of models) {
          if (m.name?.includes('flash') && !m.name?.includes('tts') && !m.name?.includes('image')) {
            firstAvailable = m.name.replace('models/', '');
            break;
          }
        }
        const res: GeminiConfigCheck = {
          configured: true,
          status: 'configured',
          message: `Gemini API key verified (configured model "${configuredModel}" unavailable; using "${firstAvailable}").`,
          model: firstAvailable
        };
        cachedStatus = res;
        lastCheckTime = Date.now();
        return res;
      }
      throw modelErr;
    }
  } catch (err: any) {
    const msg = String(err?.message || err || '');
    const status = err?.status || err?.code;
    let friendlyMessage: string;

    if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid') || status === 400 || status === 401) {
      friendlyMessage = 'Invalid GEMINI_API_KEY: Google Gemini API rejected this key as invalid. Generate a new key in Google AI Studio.';
    } else if (msg.includes('PERMISSION_DENIED') || status === 403) {
      friendlyMessage = 'Gemini API permission denied: The key does not have permissions for the Generative Language API.';
    } else if (status === 429 || msg.includes('RESOURCE_EXHAUSTED')) {
      friendlyMessage = 'Gemini API rate limit or quota exceeded. Please check your Google AI Studio quota.';
    } else {
      friendlyMessage = `Gemini API connection error: ${msg}`;
    }

    const res: GeminiConfigCheck = {
      configured: false,
      status: 'invalid',
      message: friendlyMessage
    };
    cachedStatus = res;
    lastCheckTime = Date.now();
    return res;
  }
}

/**
 * Synchronous configuration check that checks key presence and any recent live verification.
 */
export function checkGeminiConfig(): GeminiConfigCheck {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    return {
      configured: false,
      status: 'missing',
      message: 'GEMINI_API_KEY is not configured in the backend environment.'
    };
  }

  // If a live check was performed and is still fresh, use its result
  if (cachedStatus && (Date.now() - lastCheckTime < CACHE_TTL_MS)) {
    return cachedStatus;
  }

  // Fallback: key is present in environment, assume configured until verified
  return {
    configured: true,
    status: 'configured',
    message: 'Gemini API key is configured in the backend environment.'
  };
}

export function requireGeminiApiKey(): string {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the backend environment variables.');
  }
  return apiKey;
}

export function isGeminiAuthError(error: any): boolean {
  const message = String(error?.message || error || '').toLowerCase();
  const status = error?.status || error?.code || error?.response?.status;

  // 404 is NOT an authentication error (it is model not found or deprecated)
  if (status === 404 || message.includes('not found') || message.includes('no longer available')) {
    return false;
  }

  // 429 or 503 are rate limit/demand errors, not invalid key
  if (status === 429 || status === 503 || message.includes('resource_exhausted') || message.includes('high demand')) {
    return false;
  }

  return (
    status === 401 ||
    status === 403 ||
    message.includes('api_key_invalid') ||
    message.includes('api key not valid') ||
    message.includes('permission denied') ||
    message.includes('unauthorized') ||
    message.includes('forbidden')
  );
}
