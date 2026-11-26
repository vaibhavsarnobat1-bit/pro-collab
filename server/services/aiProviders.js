/**
 * aiProviders — one small registry for every model the assistant can use.
 *
 * Seven providers with real free tiers are listed first, so a project can run
 * the assistant per-model without a card on file. OpenAI and Anthropic are
 * included as paid options. Keys come only from the server environment; the
 * browser never sees them and never needs to.
 *
 * Every provider is OpenAI-compatible except Gemini and Anthropic, which get
 * their own request shape in callModel().
 */

const { getSavedKey } = require('./aiKeyStore');

/** Public origin of this app, used by providers that ask for a referer. */
const appOrigin = () =>
  String(process.env.CLIENT_URL || process.env.APP_ORIGIN || 'http://localhost:3000').replace(/\/$/, '');

const PROVIDERS = [
  {
    id: 'groq',
    label: 'Groq · GPT-OSS 120B',
    vendor: 'Groq',
    model: 'openai/gpt-oss-120b',
    baseUrl: 'https://api.groq.com/openai/v1',
    keyEnv: 'GROQ_API_KEY',
    signupUrl: 'https://console.groq.com/keys',
    free: true,
    note: 'Very fast free tier, good default for code edits'
  },
  {
    id: 'gemini',
    label: 'Google · Gemini 2.0 Flash',
    vendor: 'Google',
    model: 'gemini-2.0-flash',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    keyEnv: 'GEMINI_API_KEY',
    signupUrl: 'https://aistudio.google.com/app/apikey',
    keyEnvFallbacks: ['GOOGLE_API_KEY'],
    format: 'gemini',
    free: true,
    note: 'Free tier with a large context window'
  },
  {
    id: 'cerebras',
    label: 'Cerebras · Llama 3.3 70B',
    vendor: 'Cerebras',
    model: 'llama-3.3-70b',
    baseUrl: 'https://api.cerebras.ai/v1',
    keyEnv: 'CEREBRAS_API_KEY',
    signupUrl: 'https://cloud.cerebras.ai/',
    free: true,
    note: 'Fastest token throughput on the free tier'
  },
  {
    id: 'openrouter',
    label: 'OpenRouter · Nemotron 3 Ultra (free)',
    vendor: 'OpenRouter',
    model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyEnv: 'OPENROUTER_API_KEY',
    signupUrl: 'https://openrouter.ai/keys',
    // OpenRouter asks for an app referer and title on every request so usage
    // can be attributed in its dashboard.
    extraHeaders: () => ({
      'HTTP-Referer': appOrigin(),
      'X-Title': 'Pro-Collab'
    }),
    free: true,
    note: 'One key reaches many models, ":free" variants cost nothing'
  },
  {
    id: 'mistral',
    label: 'Mistral · Small 3',
    vendor: 'Mistral',
    model: 'mistral-small-latest',
    baseUrl: 'https://api.mistral.ai/v1',
    keyEnv: 'MISTRAL_API_KEY',
    signupUrl: 'https://console.mistral.ai/api-keys',
    free: true,
    note: 'Free experimentation tier, strong at short instructions'
  },
  {
    id: 'together',
    label: 'Together · Llama 3.3 70B Turbo',
    vendor: 'Together AI',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
    baseUrl: 'https://api.together.xyz/v1',
    keyEnv: 'TOGETHER_API_KEY',
    signupUrl: 'https://api.together.ai/settings/api-keys',
    free: true,
    note: 'Free serverless endpoint for open models'
  },
  {
    id: 'github',
    label: 'GitHub Models · GPT-4o mini',
    vendor: 'GitHub',
    model: 'gpt-4o-mini',
    baseUrl: 'https://models.github.ai/inference',
    keyEnv: 'GITHUB_MODELS_TOKEN',
    signupUrl: 'https://github.com/settings/tokens',
    keyEnvFallbacks: ['GITHUB_TOKEN'],
    free: true,
    note: 'Included with a GitHub account, rate-limited but no billing'
  },
  {
    id: 'openai',
    label: 'OpenAI · GPT-4o mini',
    vendor: 'OpenAI',
    model: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
    keyEnv: 'OPENAI_API_KEY',
    signupUrl: 'https://platform.openai.com/api-keys',
    free: false,
    note: 'Paid, most predictable structured output'
  },
  {
    id: 'anthropic',
    label: 'Anthropic · Claude 3.5 Haiku',
    vendor: 'Anthropic',
    model: 'claude-3-5-haiku-latest',
    baseUrl: 'https://api.anthropic.com',
    keyEnv: 'ANTHROPIC_API_KEY',
    signupUrl: 'https://console.anthropic.com/settings/keys',
    format: 'anthropic',
    free: false,
    note: 'Paid, careful at long refactors'
  }
];

const keyFor = (provider) => {
  // A key saved from the assistant panel wins, so pasting one takes effect
  // without editing server/.env and restarting.
  const saved = getSavedKey(provider.id);
  if (saved) return saved;

  const names = [provider.keyEnv, ...(provider.keyEnvFallbacks || [])];
  for (const name of names) {
    const value = process.env[name];
    if (value && String(value).trim()) return String(value).trim();
  }
  return '';
};

/** Public, safe view of the registry — never includes a key value. */
const listModels = () =>
  PROVIDERS.map((provider) => ({
    id: provider.id,
    label: provider.label,
    vendor: provider.vendor,
    model: process.env[`AI_MODEL_${provider.id.toUpperCase()}`] || provider.model,
    free: provider.free,
    note: provider.note,
    keyEnv: provider.keyEnv,
    // Where the visitor creates that key, so the panel can link straight to it.
    signupUrl: provider.signupUrl || '',
    configured: Boolean(keyFor(provider)),
    // Where the key came from — never the key itself.
    source: getSavedKey(provider.id) ? 'saved' : (keyFor(provider) ? 'env' : 'none')
  }));

/** Model overrides the operator can set without editing code. */
const withOverrides = (provider) => {
  const suffix = provider.id.toUpperCase();
  return {
    ...provider,
    model: process.env[`AI_MODEL_${suffix}`] || provider.model,
    baseUrl: process.env[`AI_BASE_URL_${suffix}`] || provider.baseUrl,
    key: keyFor(provider)
  };
};

/**
 * Resolve the provider to use. An explicit id wins when its key exists;
 * otherwise the first configured free provider is used, then the first
 * configured provider of any kind.
 */
const resolveProvider = (requestedId = '') => {
  const wanted = String(requestedId || '').trim().toLowerCase();
  const configured = PROVIDERS.map(withOverrides).filter((provider) => provider.key);

  if (wanted) {
    const exact = configured.find((provider) => provider.id === wanted);
    if (exact) return exact;
    const byModel = configured.find((provider) => provider.model.toLowerCase() === wanted);
    if (byModel) return byModel;
  }

  return configured.find((provider) => provider.free) || configured[0] || null;
};

const readGeminiText = (data) =>
  (data?.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || '')
    .join('')
    .trim();

const readOpenAiText = (data) => {
  const message = data?.choices?.[0]?.message;
  if (!message) return '';
  if (typeof message.content === 'string') return message.content.trim();
  if (Array.isArray(message.content)) {
    return message.content.map((part) => part?.text || '').join('').trim();
  }
  return '';
};

const readAnthropicText = (data) =>
  (data?.content || [])
    .map((part) => part.text || '')
    .join('')
    .trim();

const errorSummary = async (response) => {
  const body = await response.text().catch(() => '');
  return `${response.status} ${response.statusText || ''} ${body}`.replace(/\s+/g, ' ').slice(0, 320);
};

/**
 * Call one provider and return plain text.
 * @param {object} options
 * @param {object} options.provider  entry from resolveProvider()
 * @param {string} options.system    system / instruction prompt
 * @param {string} options.prompt    user payload
 * @param {AbortSignal} options.signal
 */
async function callModel({ provider, system, prompt, temperature = 0.2, maxTokens = 2200, signal }) {
  if (!provider?.key) {
    throw Object.assign(new Error('no API key configured'), { code: 'no_key' });
  }

  const baseUrl = String(provider.baseUrl || '').replace(/\/$/, '');
  const model = provider.model;

  if (provider.format === 'gemini') {
    const response = await fetch(
      `${baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(provider.key)}`,
      {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature, maxOutputTokens: maxTokens }
        })
      }
    );
    if (!response.ok) throw new Error(await errorSummary(response));
    const text = readGeminiText(await response.json());
    if (!text) throw new Error('empty completion');
    return text;
  }

  if (provider.format === 'anthropic') {
    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': provider.key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!response.ok) throw new Error(await errorSummary(response));
    const text = readAnthropicText(await response.json());
    if (!text) throw new Error('empty completion');
    return text;
  }

  // OpenRouter and friends want attribution headers; plain OpenAI-compatible
  // endpoints ignore them.
  const extraHeaders = typeof provider.extraHeaders === 'function'
    ? provider.extraHeaders()
    : (provider.extraHeaders || {});

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.key}`,
      ...extraHeaders
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ]
    })
  });
  if (!response.ok) throw new Error(await errorSummary(response));
  const text = readOpenAiText(await response.json());
  if (!text) throw new Error('empty completion');
  return text;
}

module.exports = {
  PROVIDERS,
  listModels,
  resolveProvider,
  callModel,
  isConfigured: (id) => Boolean(resolveProvider(id))
};
