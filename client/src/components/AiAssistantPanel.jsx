import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles, Send, Bot, Copy, Check, ArrowRight, FilePlus, RotateCcw, Cpu, X,
  PencilRuler, MessageSquare, Layers, AlertTriangle, KeyRound, ChevronDown, Trash2
} from 'lucide-react';
import api from '../services/api';
import '../styles/rail.css';

const MODEL_STORAGE_KEY = 'pc-ai-model';

const QUICK_ANSWER = [
  { label: 'Explain this file', prompt: 'Explain what this file does, top to bottom', action: 'explain' },
  { label: 'Find the bugs', prompt: 'Find and fix the bugs in this code', action: 'fix' },
  { label: 'Optimize', prompt: 'Refactor this for modern best practices', action: 'optimize' },
  { label: 'Build a page', prompt: 'Create a responsive dark-mode landing page with HTML, CSS and JS', action: 'chat' },
  { label: 'React component', prompt: 'Create an interactive React component with state and buttons', action: 'chat' },
  { label: 'Debounce helper', prompt: 'Write debounce and throttle helpers', action: 'chat' }
];

const QUICK_EDIT = [
  { label: 'Build a landing page', prompt: 'Build a complete, responsive landing page in index.html, styles.css and app.js for this project' },
  { label: 'Make it responsive', prompt: 'Make every page in this project responsive on phones and tablets without changing the content' },
  { label: 'Add dark mode', prompt: 'Add a working light/dark theme toggle to this project, remembering the choice in localStorage' },
  { label: 'Improve the design', prompt: 'Restyle this project with a calm, professional design: consistent spacing, one accent colour and readable type' },
  { label: 'Fix layout bugs', prompt: 'Review the HTML and CSS, then fix overflowing, misaligned and overlapping elements' },
  { label: 'Add a contact form', prompt: 'Add a contact form with labels, client-side validation and an accessible success message' }
];

const stamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const describeSource = (model) => {
  if (!model?.configured) return 'no key';
  return model.source === 'saved' ? 'key added here' : `key from ${model.keyEnv}`;
};

const AiAssistantPanel = ({
  activeCode = '',
  activeFilePath = null,
  language = 'plaintext',
  filesMap = {},
  onApplyCodeToEditor,
  onCreateFileFromAi,
  onApplyProjectOps,
  onClose
}) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState('edit');
  const [copiedId, setCopiedId] = useState(null);
  const [appliedId, setAppliedId] = useState(null);
  const [engine, setEngine] = useState(null);
  const [models, setModels] = useState([]);
  const [modelId, setModelId] = useState(() => {
    try {
      return localStorage.getItem(MODEL_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [showKeys, setShowKeys] = useState(false);
  const [keyDrafts, setKeyDrafts] = useState({});
  const [keyBusy, setKeyBusy] = useState('');
  const [keyError, setKeyError] = useState('');
  const [keyNotice, setKeyNotice] = useState('');
  const endRef = useRef(null);

  const refreshStatus = useCallback(
    () => api.get('/ai/status')
      .then((response) => setEngine(response.data))
      .catch(() => setEngine({ kind: 'local', label: 'Offline engine' })),
    []
  );

  const applyModelList = useCallback((list) => {
    setModels(list);
    setModelId((current) => {
      if (current && list.some((model) => model.id === current && model.configured)) return current;
      const firstConfigured = list.find((model) => model.configured);
      if (firstConfigured) return firstConfigured.id;
      return current && list.some((model) => model.id === current) ? current : (list[0]?.id || '');
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    refreshStatus();

    api.get('/ai/models')
      .then((response) => { if (!cancelled) applyModelList(response.data?.models || []); })
      .catch(() => { if (!cancelled) setModels([]); });

    return () => { cancelled = true; };
  }, [refreshStatus, applyModelList]);

  useEffect(() => {
    try {
      if (modelId) localStorage.setItem(MODEL_STORAGE_KEY, modelId);
    } catch {
      /* storage can be blocked; the picker still works for this session */
    }
  }, [modelId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, busy]);

  const selectedModel = useMemo(
    () => models.find((model) => model.id === modelId) || null,
    [models, modelId]
  );

  const configuredModels = useMemo(() => models.filter((model) => model.configured), [models]);
  const isModel = engine?.kind === 'model' || configuredModels.length > 0;
  const canSend = Boolean(input.trim()) && !busy;

  const saveKey = useCallback(async (providerId) => {
    const value = (keyDrafts[providerId] || '').trim();
    if (!value) {
      setKeyError('Paste a key first.');
      return;
    }
    setKeyBusy(providerId);
    setKeyError('');
    setKeyNotice('');
    try {
      const response = await api.post('/ai/keys', { provider: providerId, key: value });
      applyModelList(response.data?.models || []);
      setModelId(providerId);
      setKeyDrafts((drafts) => ({ ...drafts, [providerId]: '' }));
      setKeyNotice('Key saved. That provider is now the active model.');
      refreshStatus();
    } catch (error) {
      setKeyError(error.response?.data?.message || 'The server refused that key.');
    } finally {
      setKeyBusy('');
    }
  }, [keyDrafts, applyModelList, refreshStatus]);

  const removeKey = useCallback(async (providerId) => {
    setKeyBusy(providerId);
    setKeyError('');
    setKeyNotice('');
    try {
      const response = await api.delete(`/ai/keys/${providerId}`);
      applyModelList(response.data?.models || []);
      setKeyNotice('Saved key removed. The server environment variable, if any, is used again.');
      refreshStatus();
    } catch (error) {
      setKeyError(error.response?.data?.message || 'The server could not remove that key.');
    } finally {
      setKeyBusy('');
    }
  }, [applyModelList, refreshStatus]);

  const history = useCallback(
    () => messages.slice(-8).map((message) => ({ sender: message.role === 'user' ? 'user' : 'ai', text: message.text })),
    [messages]
  );

  const sendToChat = useCallback(async (text, action) => {
    const response = await api.post('/ai/chat', {
      prompt: text,
      code: activeCode,
      filePath: activeFilePath || '',
      language,
      action,
      modelId,
      history: history()
    });
    const data = response.data || {};
    return {
      text: data.reply || 'No reply returned.',
      code: data.codeSnippet || '',
      fileName: data.suggestedFileName || '',
      outLanguage: data.suggestedLanguage || language,
      explanation: data.explanation || '',
      note: data.fallbackNote || '',
      engine: data.engine || 'local'
    };
  }, [activeCode, activeFilePath, language, modelId, history]);

  const sendToAgent = useCallback(async (text) => {
    const files = {};
    Object.entries(filesMap || {}).forEach(([path, file]) => {
      if (file && typeof file.content === 'string') files[path] = { path, content: file.content };
    });

    const response = await api.post('/ai/agent', {
      prompt: text,
      files,
      activeFilePath: activeFilePath || '',
      modelId,
      history: history()
    });
    const data = response.data || {};
    return {
      text: data.reply || 'The assistant returned nothing usable.',
      operations: Array.isArray(data.operations) ? data.operations : [],
      note: data.note || '',
      engine: data.engine || 'local'
    };
  }, [filesMap, activeFilePath, modelId, history]);

  const ask = useCallback(async (promptText, action = 'chat') => {
    const text = (promptText ?? input).trim();
    if (!text || busy) return;

    setMessages((prev) => [...prev, { id: `u${Date.now()}`, role: 'user', text, at: stamp() }]);
    setInput('');
    setBusy(true);

    try {
      const answer = mode === 'edit' ? await sendToAgent(text) : await sendToChat(text, action);
      setMessages((prev) => [
        ...prev,
        {
          id: `a${Date.now()}`,
          role: 'ai',
          mode,
          ...answer,
          at: stamp()
        }
      ]);
    } catch (error) {
      const status = error.response?.status;
      setMessages((prev) => [
        ...prev,
        {
          id: `e${Date.now()}`,
          role: 'ai',
          text: status === 429
            ? error.response.data.message
            : 'The assistant did not answer — the server is unreachable. The editor and sync still work without it.',
          at: stamp(),
          engine: 'error'
        }
      ]);
    } finally {
      setBusy(false);
    }
  }, [input, busy, mode, sendToAgent, sendToChat]);

  const copy = async (code, id) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setMessages((prev) => [...prev, { id: `c${Date.now()}`, role: 'ai', text: 'Clipboard access was refused by the browser — select the code and copy it manually.', at: stamp() }]);
    }
  };

  const apply = (message) => {
    onApplyCodeToEditor?.(message.code, message.outLanguage);
    setAppliedId(message.id);
    setTimeout(() => setAppliedId(null), 1800);
  };

  const asFile = (message) => {
    const fallbackExtension = { python: 'py', html: 'html', css: 'css', markdown: 'md', json: 'json', typescript: 'ts', javascript: 'js' }[message.outLanguage] || 'txt';
    onCreateFileFromAi?.(message.fileName || `assistant.${fallbackExtension}`, message.code, message.outLanguage);
  };

  const applyOperations = (message) => {
    const count = onApplyProjectOps?.(message.operations) ?? 0;
    if (!count) return;
    setAppliedId(message.id);
    setMessages((prev) => prev.map((item) => (
      item.id === message.id ? { ...item, applied: true } : item
    )));
  };

  const quick = mode === 'edit' ? QUICK_EDIT : QUICK_ANSWER;
  const activeName = selectedModel ? `${selectedModel.vendor} · ${selectedModel.model}` : 'no model selected';

  return (
    <div className="ai-panel">
      <div className="ai-head">
        <div className="ai-title">
          <span className="ai-mark"><Sparkles size={13} /></span>
          <div>
            <strong>Assistant</strong>
            <small title={activeName}>{activeName}</small>
          </div>
        </div>
        <div className="ai-head-tools">
          <span
            className={`ai-engine ${isModel ? 'is-model' : ''}`}
            title={isModel ? `Keys ready: ${configuredModels.map((model) => model.vendor).join(', ')}` : 'No API key yet. Add one under API keys.'}
          >
            <Cpu size={10} /> {isModel ? `${configuredModels.length} ready` : 'offline'}
          </span>
          <button type="button" className="ai-mini" onClick={() => setMessages([])} title="Clear the conversation" aria-label="Clear conversation">
            <RotateCcw size={13} />
          </button>
          {onClose && (
            <button type="button" className="ai-mini" onClick={onClose} aria-label="Close assistant">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="ai-modes" role="tablist" aria-label="Assistant mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'answer'}
          className={mode === 'answer' ? 'is-on' : ''}
          onClick={() => setMode('answer')}
        >
          <MessageSquare size={12} /> Answer
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'edit'}
          className={mode === 'edit' ? 'is-on' : ''}
          onClick={() => setMode('edit')}
        >
          <PencilRuler size={12} /> Edit project
        </button>
      </div>

      <div className="ai-model">
        <Layers size={11} />
        <select
          value={modelId}
          onChange={(event) => setModelId(event.target.value)}
          aria-label="AI model"
          title="Pick the provider that answers. Add a key for any of them below."
        >
          {!models.length && <option value="">checking models…</option>}
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label}{model.free ? ' · free' : ''}{model.configured ? '' : ' · no key'}
            </option>
          ))}
        </select>
        <span className={`ai-model-dot ${selectedModel?.configured ? 'is-ok' : ''}`} title={selectedModel ? describeSource(selectedModel) : 'No model yet'} />
      </div>

      {models.length > 0 && selectedModel && !selectedModel.configured && (
        <p className="ai-hint">
          <AlertTriangle size={11} /> No key for {selectedModel.vendor} yet — add {selectedModel.keyEnv} under API keys, or pick a ready model above.
        </p>
      )}

      <button
        type="button"
        className={`ai-keys-toggle ${showKeys ? 'is-open' : ''}`}
        onClick={() => { setShowKeys((value) => !value); setKeyError(''); setKeyNotice(''); }}
        aria-expanded={showKeys}
      >
        <KeyRound size={11} />
        <span>API keys</span>
        <span className="ai-keys-count">{configuredModels.length}/{models.length || 9}</span>
        <ChevronDown size={12} className="ai-keys-chevron" />
      </button>

      {showKeys && (
        <div className="ai-keys">
          <p className="ai-keys-note">
            Paste a key for any provider. It is stored on this server only and never sent back to the browser.
          </p>

          {models.map((model) => (
            <div className="ai-key-row" key={model.id}>
              <div className="ai-key-meta">
                <strong>{model.vendor}</strong>
                <span>{model.model}</span>
                {model.signupUrl && (
                  <a
                    className="ai-key-link"
                    href={model.signupUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    title={`Create a ${model.vendor} key`}
                  >
                    get key ↗
                  </a>
                )}
                <em className={model.configured ? 'is-ok' : ''}>{describeSource(model)}</em>
              </div>
              <div className="ai-key-form">
                <input
                  type="password"
                  autoComplete="off"
                  spellCheck="false"
                  placeholder={model.keyEnv}
                  value={keyDrafts[model.id] || ''}
                  onChange={(event) => setKeyDrafts((drafts) => ({ ...drafts, [model.id]: event.target.value }))}
                  onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); saveKey(model.id); } }}
                  aria-label={`${model.vendor} API key`}
                />
                <button
                  type="button"
                  className="ai-key-save"
                  onClick={() => saveKey(model.id)}
                  disabled={keyBusy === model.id}
                >
                  {keyBusy === model.id ? '…' : 'Save'}
                </button>
                {model.source === 'saved' && (
                  <button
                    type="button"
                    className="ai-key-clear"
                    onClick={() => removeKey(model.id)}
                    disabled={keyBusy === model.id}
                    title="Remove the saved key"
                    aria-label={`Remove saved ${model.vendor} key`}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {keyError && <p className="ai-key-err">{keyError}</p>}
          {keyNotice && <p className="ai-key-ok">{keyNotice}</p>}
          <p className="ai-keys-note is-foot">
            Free tiers: Groq, Google Gemini, Cerebras, OpenRouter, Mistral, Together and GitHub Models. OpenAI and Anthropic are paid.
          </p>
        </div>
      )}

      <div className="ai-pills">
        {quick.map((item) => (
          <button
            key={item.label}
            type="button"
            className="ai-pill"
            disabled={busy}
            onClick={() => ask(item.prompt, item.action || 'chat')}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="ai-feed">
        {messages.length === 0 && (
          <div className="ai-empty">
            <Bot size={22} />
            <strong>{mode === 'edit' ? 'Describe the change, and it edits the room' : 'Ask about the code that is open'}</strong>
            <span>
              {mode === 'edit'
                ? 'The whole project is sent to the model you picked, and the files it rewrites are applied to this room for everyone — you confirm before anything changes.'
                : isModel
                  ? `${activeName} answers here, and it sees the file you are editing.`
                  : 'No provider has a key yet. Open API keys above and paste any free key — the assistant starts working immediately.'}
            </span>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`ai-msg ${message.role === 'user' ? 'is-user' : ''}`}>
            <div className="cp-meta">
              {message.role === 'user' ? <b>You</b> : <><Bot size={11} style={{ color: 'var(--brand-text)' }} /><b>Assistant</b></>}
              {message.engine && message.engine !== 'error' && <span>{message.engine === 'local' ? 'offline' : message.engine}</span>}
              <span>{message.at}</span>
            </div>

            <div className="ai-bubble">
              <div className="ai-reply">{message.text}</div>

              {message.explanation && <div className="ai-explain">{message.explanation}</div>}
              {message.note && <div className="ai-note">{message.note}</div>}

              {message.operations?.length > 0 && (
                <div className="ai-ops">
                  <div className="ai-ops-head">
                    {message.operations.length} file{message.operations.length === 1 ? '' : 's'} to change
                  </div>
                  <ul>
                    {message.operations.map((operation) => (
                      <li key={`${operation.type}-${operation.path}`}>
                        <span className={`ai-op-tag is-${operation.type}`}>{operation.type}</span>
                        <code>{operation.path}</code>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className={`ai-act ${message.applied ? 'is-done' : 'is-primary'}`}
                    onClick={() => applyOperations(message)}
                    disabled={message.applied}
                  >
                    {message.applied ? <><Check size={13} /> Applied to the room</> : <><ArrowRight size={13} /> Apply to room</>}
                  </button>
                </div>
              )}

              {message.code && (
                <div className="ai-code">
                  <div className="ai-code-head">
                    <span className="ai-code-name">{message.fileName || `${message.outLanguage || 'code'}`}</span>
                    <button type="button" className="ai-mini" onClick={() => copy(message.code, message.id)} aria-label="Copy code">
                      {copiedId === message.id ? <Check size={13} style={{ color: 'var(--ok)' }} /> : <Copy size={13} />}
                    </button>
                  </div>
                  <pre><code>{message.code}</code></pre>
                  <div className="ai-code-actions">
                    <button type="button" className={`ai-act ${appliedId === message.id ? 'is-done' : 'is-primary'}`} onClick={() => apply(message)} disabled={!activeFilePath}>
                      {appliedId === message.id ? <><Check size={13} /> Replaced</> : <><ArrowRight size={13} /> Replace open file</>}
                    </button>
                    <button type="button" className="ai-act" onClick={() => asFile(message)}>
                      <FilePlus size={13} /> New file
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {busy && (
          <div className="ai-thinking">
            <i /><i /><i />
            <span style={{ marginLeft: 4 }}>{mode === 'edit' ? 'rewriting the project…' : 'reading your buffer…'}</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form className="ai-compose" onSubmit={(event) => { event.preventDefault(); ask(); }}>
        <input
          className="ai-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={mode === 'edit' ? 'e.g. add a pricing section to index.html' : activeFilePath ? 'Ask, debug or describe what to build' : 'Describe something to build'}
          disabled={busy}
          maxLength={4000}
          aria-label="Message the assistant"
        />
        <button type="submit" className="ai-send" disabled={!canSend} aria-label="Send to assistant">
          <Send size={14} />
        </button>
      </form>
    </div>
  );
};

export default AiAssistantPanel;
