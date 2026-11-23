import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import WorkspacePage from './pages/WorkspacePage';
import ProfilePage from './pages/ProfilePage';
import PageTransition from './components/PageTransition';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="boot-screen">
        <div className="boot-spinner" />
        <p>Restoring your session…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/workspace" replace />;

  return children;
};

const LazyAdmin = React.lazy(() => import('./pages/AdminDashboard'));

const AppRoutes = () => {
  const location = useLocation();
  // Login and signup render their own brand header and hide the navbar.
  const chromeless = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <div className="app-shell">
      <Navbar />
      <main className={`app-main ${chromeless ? 'is-chromeless' : ''}`}>
        <PageTransition>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

            {/* Guest rooms are deliberately public — no account, no redirect. */}
            <Route path="/demo" element={<WorkspacePage guestMode />} />
            <Route path="/demo/:roomId" element={<WorkspacePage guestMode />} />

            <Route path="/workspace" element={<ProtectedRoute><WorkspacePage /></ProtectedRoute>} />
            <Route path="/workspace/:roomId" element={<ProtectedRoute><WorkspacePage /></ProtectedRoute>} />
            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute adminOnly>
                  <Suspense fallback={<div className="boot-screen"><div className="boot-spinner" /><p>Loading console…</p></div>}>
                    <LazyAdmin />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PageTransition>
      </main>

      <style>{`
        .app-shell { min-height: 100vh; display: flex; flex-direction: column; background: transparent; position: relative; }
        .app-main { flex: 1; position: relative; z-index: 1; padding-top: 62px; }
        .app-main.is-chromeless { padding-top: 0; }
        .boot-screen {
          min-height: 70vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;
          color: var(--ink-faint); font-size: 13px;
        }
        .boot-spinner {
          width: 34px; height: 34px; border-radius: 50%;
          border: 3px solid var(--brand-soft); border-top-color: var(--brand);
          animation: spin 0.8s linear infinite;
        }
      `}</style>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <NotificationProvider>
            <Router basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <AppRoutes />
            </Router>
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
