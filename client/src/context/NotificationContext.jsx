import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, Users, MessageSquare, X } from 'lucide-react';

const NotificationContext = createContext({
  notify: () => {},
  enableOsNotifications: async () => false,
  osStatus: 'unsupported',
});

let idCounter = 0;

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [osStatus, setOsStatus] = useState(() => {
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission;
  });
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const notify = useCallback((message, { title, type = 'info', icon: IconName = null, timeout = 4200, silent = false } = {}) => {
    if (typeof message !== 'string' || !message) return;
    const id = ++idCounter;
    setToasts((list) => {
      const next = [...list, { id, message, title, type, IconName }];
      return next.length > 4 ? next.slice(-4) : next;
    });
    timers.current[id] = setTimeout(() => dismiss(id), timeout);

    if (!silent && typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
      try {
        const n = new Notification(title || 'ProCollab', { body: message, tag: `pc-${id}`, icon: '/favicon.svg' });
        n.onclick = () => { window.focus(); n.close(); };
      } catch (e) { /* some browsers restrict constructor notifications */ }
    }
  }, [dismiss]);

  const enableOsNotifications = useCallback(async () => {
    if (typeof Notification === 'undefined') return false;
    try {
      const result = await Notification.requestPermission();
      setOsStatus(result);
      return result === 'granted';
    } catch (e) {
      return false;
    }
  }, []);

  useEffect(() => {
    const t = timers.current;
    return () => Object.values(t).forEach(clearTimeout);
  }, []);

  return (
    <NotificationContext.Provider value={{ notify, enableOsNotifications, osStatus }}>
      {children}
      <div className="pc-toast-stack">
        {toasts.map((t) => {
          const Icon = t.IconName || (t.type === 'success' ? CheckCircle2 : t.type === 'error' ? AlertCircle : Info);
          return (
            <div key={t.id} className={`pc-toast pc-toast-${t.type}`} role="status">
              <span className="pc-toast-icon"><Icon size={16} /></span>
              <div className="pc-toast-body">
                {t.title && <strong className="pc-toast-title">{t.title}</strong>}
                <span className="pc-toast-text">{t.message}</span>
              </div>
              <button className="pc-toast-x" onClick={() => dismiss(t.id)} aria-label="Dismiss"><X size={13} /></button>
            </div>
          );
        })}
      </div>
      <style>{`
        .pc-toast-stack {
          position: fixed; bottom: 20px; right: 20px; z-index: 300;
          display: flex; flex-direction: column; gap: 10px;
          max-width: min(360px, calc(100vw - 32px));
        }
        .pc-toast {
          display: flex; align-items: flex-start; gap: 10px;
          background: var(--elev);
          border: 1px solid var(--line-strong);
          border-radius: 14px;
          padding: 12px 14px;
          box-shadow: var(--shadow);
          animation: pcToastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes pcToastIn { from { opacity: 0; transform: translateY(14px) scale(0.96); } to { opacity: 1; transform: none; } }
        .pc-toast-icon { flex-shrink: 0; margin-top: 1px; }
        .pc-toast-info .pc-toast-icon { color: var(--cyan); }
        .pc-toast-success .pc-toast-icon { color: var(--ok); }
        .pc-toast-error .pc-toast-icon { color: var(--bad); }
        .pc-toast-event .pc-toast-icon { color: var(--brand-text); }
        .pc-toast-body { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .pc-toast-title { font-size: 12.5px; font-weight: 700; color: var(--ink); }
        .pc-toast-text { font-size: 12.5px; color: var(--ink-soft); line-height: 1.45; }
        .pc-toast-x { background: none; border: none; color: var(--ink-faint); cursor: pointer; padding: 2px; border-radius: 6px; display: flex; }
        .pc-toast-x:hover { color: var(--ink); background: var(--brand-soft); }
      `}</style>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
export { Users as NotifUsersIcon, MessageSquare as NotifChatIcon };
