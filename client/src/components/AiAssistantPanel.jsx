import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  Bot,
  User,
  Copy,
  Check,
  ArrowRight,
  FilePlus,
  Play,
  RotateCcw,
  Code2,
  Bug,
  HelpCircle,
  FileCode,
  Layers,
  X
} from 'lucide-react';
import api from '../services/api';

const QUICK_PROMPTS = [
  { label: '✨ Fix Bugs', prompt: 'Find and fix all bugs and optimize this code', action: 'fix' },
  { label: '🌐 Generate Web Page', prompt: 'Create a modern dark-mode responsive HTML/CSS/JS web page with animations', action: 'chat' },
  { label: '🎨 React Component', prompt: 'Create an interactive React component with state, buttons, and modern styling', action: 'chat' },
  { label: '📝 Explain Code', prompt: 'Explain how this code works step-by-step in simple terms', action: 'explain' },
  { label: '⚡ Optimize', prompt: 'Refactor this code to follow modern best practices and clean architecture', action: 'chat' }
];

const AiAssistantPanel = ({
  activeFileContent = '',
  activeFilePath = 'index.js',
  activeLanguage = 'javascript',
  onApplyCodeToEditor,
  onCreateFileFromAi,
  onClose
}) => {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Hello! I'm your **Pro-Collab AI Coding Assistant** (like Antigravity). I can write code, build entire web pages, fix bugs, and refactor functions.\n\nTell me what you'd like to build, or click a quick action below!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState(null);
  const [appliedId, setAppliedId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendPrompt = async (promptToSend, action = 'chat') => {
    const text = promptToSend || inputText.trim();
    if (!text || isLoading) return;

    const userMessage = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await api.post('/ai/chat', {
        prompt: text,
        code: activeFileContent,
        filePath: activeFilePath,
        language: activeLanguage,
        action: action
      });

      const aiMessage = {
        id: 'ai_' + Date.now(),
        sender: 'ai',
        text: response.data.reply || 'Generated code for your prompt:',
        codeSnippet: response.data.codeSnippet || '',
        suggestedFileName: response.data.suggestedFileName || '',
        suggestedLanguage: response.data.suggestedLanguage || activeLanguage,
        explanation: response.data.explanation || '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error('AI Request Error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          sender: 'ai',
          text: '⚠️ Could not generate AI response. Please make sure the server is running.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleApply = (code, id) => {
    if (onApplyCodeToEditor) {
      onApplyCodeToEditor(code);
      setAppliedId(id);
      setTimeout(() => setAppliedId(null), 2000);
    }
  };

  const handleCreateFile = (code, suggestedName, lang) => {
    const filename = suggestedName || `generated_${Date.now().toString(36).slice(-4)}.${lang === 'python' ? 'py' : lang === 'html' ? 'html' : lang === 'css' ? 'css' : 'js'}`;
    if (onCreateFileFromAi) {
      onCreateFileFromAi(filename, code, lang);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
      
      {/* Header */}
      <div className="bg-[#111620] px-4 py-3 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white tracking-wide">ANTIGRAVITY AI</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <span className="text-[10px] text-slate-400 block -mt-0.5 truncate max-w-[170px]">
              Active: {activeFilePath}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setMessages([messages[0]])}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors text-[11px] flex items-center gap-1"
            title="Reset Chat"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Prompt Action Pills */}
      <div className="px-3 py-2 bg-indigo-500/[0.03] border-b border-white/[0.06] flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        {QUICK_PROMPTS.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSendPrompt(qp.prompt, qp.action)}
            disabled={isLoading}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-indigo-600/20 hover:border-indigo-500/40 border border-white/[0.08] text-slate-300 hover:text-white text-[11px] font-medium transition-all"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Chat Messages Feed */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 min-h-[220px]">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
            >
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1 font-medium">
                {isUser ? (
                  <>
                    <span>You</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-3 h-3 text-indigo-400" />
                    <span className="font-bold text-indigo-300">Antigravity AI</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[95%] shadow-md break-words ${
                  isUser
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none'
                    : 'bg-[#121620] border border-white/[0.08] text-slate-200 rounded-bl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Generated Code Snippet Block */}
                {msg.codeSnippet && (
                  <div className="mt-2.5 pt-2.5 border-t border-white/[0.08]">
                    <div className="bg-[#080b11] rounded-xl border border-white/[0.1] overflow-hidden">
                      {/* Code Header Bar */}
                      <div className="px-3 py-1.5 bg-[#0e121a] border-b border-white/[0.08] flex items-center justify-between">
                        <span className="text-[10px] font-mono text-indigo-300 font-semibold">
                          {msg.suggestedFileName || `${msg.suggestedLanguage || 'code'}`}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleCopyCode(msg.codeSnippet, msg.id)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white transition-colors"
                            title="Copy code"
                          >
                            {copiedCodeId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Code Content */}
                      <pre className="p-3 text-[11.5px] font-mono text-slate-200 overflow-x-auto max-h-[220px] leading-relaxed select-text">
                        <code>{msg.codeSnippet}</code>
                      </pre>

                      {/* Action Buttons: Apply to Editor & Create File */}
                      <div className="p-2 bg-[#0a0d14] border-t border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
                        <button
                          onClick={() => handleApply(msg.codeSnippet, msg.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] shadow-sm shadow-indigo-600/30 transition-all cursor-pointer"
                        >
                          {appliedId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-300" />
                              <span>Applied to Editor!</span>
                            </>
                          ) : (
                            <>
                              <ArrowRight className="w-3.5 h-3.5" />
                              <span>Apply to Current Editor</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleCreateFile(msg.codeSnippet, msg.suggestedFileName, msg.suggestedLanguage)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/[0.1] text-[11px] font-semibold transition-all cursor-pointer"
                          title="Save as new file in project"
                        >
                          <FilePlus className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Create File</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendPrompt();
        }}
        className="p-3 bg-[#111620] border-t border-white/[0.08] flex items-center gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask AI to write, debug, or build anything..."
          disabled={isLoading}
          className="flex-1 bg-[#080b11] border border-white/[0.1] focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition-all shadow-md shadow-indigo-600/30 shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>

    </div>
  );
};

export default AiAssistantPanel;
