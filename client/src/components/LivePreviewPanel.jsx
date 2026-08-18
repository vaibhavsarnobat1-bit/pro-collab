import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  RefreshCw,
  ExternalLink,
  Smartphone,
  Tablet,
  Monitor,
  Terminal,
  Play,
  Sparkles,
  Layers,
  X,
  AlertCircle
} from 'lucide-react';

const LivePreviewPanel = ({
  activeFileContent = '',
  activeFilePath = 'index.html',
  filesMap = {},
  onClose
}) => {
  const [viewport, setViewport] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'
  const [compiledHtml, setCompiledHtml] = useState('');
  const [logs, setLogs] = useState([]);
  const [showConsole, setShowConsole] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const iframeRef = useRef(null);

  // Compile HTML/CSS/JS bundle
  const compilePreview = () => {
    // 1. If active file is already full HTML document
    if (activeFileContent.trim().toLowerCase().startsWith('<!doctype') || activeFileContent.includes('<html') || activeFileContent.includes('<body')) {
      return activeFileContent;
    }

    // 2. Check if project has an index.html or styles.css in filesMap
    let htmlSnippet = activeFileContent;
    let cssSnippet = '';
    let jsSnippet = '';

    // Extract css from filesMap if available
    Object.values(filesMap).forEach((f) => {
      if (f.path.endsWith('.css')) cssSnippet += `\n${f.content}`;
      if (f.path.endsWith('.js') && f.path !== activeFilePath) jsSnippet += `\n${f.content}`;
    });

    if (activeFilePath.endsWith('.css')) {
      cssSnippet = activeFileContent;
      htmlSnippet = `
        <div style="padding: 30px; text-align: center; font-family: sans-serif;">
          <h2>🎨 CSS Preview Mode</h2>
          <p style="color: #94a3b8; margin: 12px 0;">Editing: <code>${activeFilePath}</code></p>
          <button class="btn" style="padding: 10px 20px; border-radius: 8px; cursor: pointer;">Sample Styled Button</button>
        </div>
      `;
    }

    // Capture iframe console logs via injected script
    const consoleCaptureScript = `
      <script>
        (function() {
          const originalLog = console.log;
          const originalError = console.error;
          const originalWarn = console.warn;

          console.log = function(...args) {
            window.parent.postMessage({ type: 'PREVIEW_LOG', level: 'log', message: args.join(' ') }, '*');
            originalLog.apply(console, args);
          };
          console.error = function(...args) {
            window.parent.postMessage({ type: 'PREVIEW_LOG', level: 'error', message: args.join(' ') }, '*');
            originalError.apply(console, args);
          };
          console.warn = function(...args) {
            window.parent.postMessage({ type: 'PREVIEW_LOG', level: 'warn', message: args.join(' ') }, '*');
            originalWarn.apply(console, args);
          };
          window.onerror = function(msg, url, line) {
            window.parent.postMessage({ type: 'PREVIEW_LOG', level: 'error', message: msg + ' (line ' + line + ')' }, '*');
          };
        })();
      </script>
    `;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Pro-Collab Live Web Preview</title>
        ${consoleCaptureScript}
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 16px;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: #090d16;
            color: #f8fafc;
            min-height: 100vh;
          }
          ${cssSnippet}
        </style>
      </head>
      <body>
        <div id="root">
          ${htmlSnippet}
        </div>
        <script>
          try {
            ${jsSnippet}
          } catch(err) {
            console.error(err);
          }
        </script>
      </body>
      </html>
    `;
  };

  // Debounced auto-compilation as user types
  useEffect(() => {
    const timer = setTimeout(() => {
      const html = compilePreview();
      setCompiledHtml(html);
    }, 250);

    return () => clearTimeout(timer);
  }, [activeFileContent, activeFilePath, filesMap]);

  // Listen for console logs from the iframe
  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data && e.data.type === 'PREVIEW_LOG') {
        setLogs((prev) => [
          ...prev.slice(-40),
          {
            id: 'log_' + Date.now() + Math.random(),
            level: e.data.level,
            message: e.data.message,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          }
        ]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleRefresh = () => {
    setIsReloading(true);
    const html = compilePreview();
    setCompiledHtml(html);
    setTimeout(() => setIsReloading(false), 300);
  };

  const handleOpenInNewWindow = () => {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(compiledHtml);
      newWindow.document.close();
    }
  };

  const getViewportWidth = () => {
    switch (viewport) {
      case 'mobile':
        return '375px';
      case 'tablet':
        return '768px';
      default:
        return '100%';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
      
      {/* Mock Browser Top Navigation Bar */}
      <div className="bg-[#111620] px-3.5 py-2.5 border-b border-white/[0.08] flex items-center justify-between gap-2 flex-wrap">
        
        {/* Left: Indicator & Viewport Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>LIVE WEB RUN</span>
          </div>

          <div className="flex items-center gap-0.5 bg-[#080b11] p-1 rounded-lg border border-white/[0.08]">
            <button
              onClick={() => setViewport('desktop')}
              className={`p-1 rounded text-xs transition-colors ${
                viewport === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Desktop View (100%)"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport('tablet')}
              className={`p-1 rounded text-xs transition-colors ${
                viewport === 'tablet' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Tablet View (768px)"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport('mobile')}
              className={`p-1 rounded text-xs transition-colors ${
                viewport === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Mobile View (375px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center Mock URL Bar */}
        <div className="flex-1 min-w-[140px] max-w-[320px] bg-[#080b11] border border-white/[0.08] rounded-lg px-2.5 py-1 flex items-center gap-2 text-[11px] text-slate-400 font-mono">
          <Globe className="w-3 h-3 text-indigo-400 shrink-0" />
          <span className="truncate text-slate-300">http://localhost:3000/preview</span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowConsole(!showConsole)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
              showConsole
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Toggle Console Log Output"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Console</span>
            {logs.length > 0 && (
              <span className="px-1 py-0.2 rounded-full bg-indigo-600 text-white text-[9px]">
                {logs.length}
              </span>
            )}
          </button>

          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Reload Preview"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          <button
            onClick={handleOpenInNewWindow}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Open in Full Browser Tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
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

      {/* Main Preview Screen Container */}
      <div className="flex-1 bg-[#050811] flex flex-col items-center justify-center p-2 overflow-hidden relative">
        <div
          className="h-full bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-300 flex flex-col border border-white/10"
          style={{ width: getViewportWidth(), maxWidth: '100%' }}
        >
          <iframe
            ref={iframeRef}
            srcDoc={compiledHtml}
            title="Live Web Preview"
            sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
            className="w-full h-full border-none bg-white"
          />
        </div>
      </div>

      {/* Embedded Preview Console Logs Drawer */}
      {showConsole && (
        <div className="h-40 bg-[#0a0d14] border-t border-white/[0.08] flex flex-col overflow-hidden animate-slide-up">
          <div className="px-3.5 py-1.5 bg-[#0f1420] border-b border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold text-slate-300">Live Console Output</span>
            </div>
            <button
              onClick={() => setLogs([])}
              className="text-[10px] text-slate-500 hover:text-white transition-colors"
            >
              Clear Logs
            </button>
          </div>

          <div className="flex-1 p-2 overflow-y-auto font-mono text-[11px] space-y-1">
            {logs.length === 0 ? (
              <div className="text-slate-600 text-center py-4">No console logs or errors</div>
            ) : (
              logs.map((l) => (
                <div
                  key={l.id}
                  className={`flex items-start gap-2 px-2 py-0.5 rounded ${
                    l.level === 'error'
                      ? 'bg-rose-500/10 text-rose-300'
                      : l.level === 'warn'
                      ? 'bg-amber-500/10 text-amber-300'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="text-slate-500 text-[10px] shrink-0">{l.time}</span>
                  <span className="break-all">{l.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default LivePreviewPanel;
