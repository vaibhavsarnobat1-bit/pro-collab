import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../styles/admin.css';
import {
  ShieldCheck, Users, Monitor, Video, Activity, Trash2, RefreshCw,
  AlertTriangle, Search, ChevronDown, UserX
} from 'lucide-react';

const REFRESH_MS = 8000;

const uptimeLabel = (seconds) => {
  if (typeof seconds !== 'number' || !isFinite(seconds) || seconds < 0) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d) return `${d}d ${h}h up`;
  if (h) return `${h}h ${m}m up`;
  return `${m}m ${Math.floor(seconds % 60)}s up`;
};

const nameOf = (u) => String(u?.username ?? 'unknown');
const roleOf = (u) => String(u?.role ?? 'user');

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [roomsList, setRoomsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const busyDeleting = useRef(false);

  const fetchAdminData = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await api.get('/admin/dashboard');
      setStats(response.data.stats || null);
      setUsersList(response.data.users || []);
      setRoomsList(response.data.rooms || []);
      setError('');
      setUpdatedAt(new Date());
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reach the admin endpoint. Check that you are signed in with an admin account.');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
    const tick = setInterval(() => {
      // A pending delete means the list is mid-mutation; skip that poll.
      if (!busyDeleting.current && !document.hidden) fetchAdminData();
    }, REFRESH_MS);
    return () => clearInterval(tick);
  }, [fetchAdminData]);

  const handleDeleteUser = (userId, username) => {
    if (username === 'admin') return;
    setShowDeleteConfirm({ userId, username });
  };

  const confirmDelete = async () => {
    if (!showDeleteConfirm || busyDeleting.current) return;
    busyDeleting.current = true;
    setDeletingId(showDeleteConfirm.userId);
    try {
      await api.delete(`/admin/users/${showDeleteConfirm.userId}`);
      setUsersList((list) => list.filter((u) => u.id !== showDeleteConfirm.userId));
      setStats((s) => (s ? { ...s, totalUsers: Math.max(0, (s.totalUsers || 0) - 1) } : s));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
    } finally {
      busyDeleting.current = false;
      setDeletingId(null);
      setShowDeleteConfirm(null);
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = !term || nameOf(u).toLowerCase().includes(term);
    const matchesRole = roleFilter === 'all' || roleOf(u) === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading && !stats) {
    return (
      <div className="admin-console dark-scope">
        <div className="ac-root">
          <div className="ac-loading">
            <span className="ac-spinner" />
            <p>loading control metrics</p>
          </div>
        </div>
      </div>
    );
  }

  const tiles = [
    { k: 'registered users', v: stats?.totalUsers ?? 0, s: 'accounts in this deployment', icon: Users, tone: '' },
    { k: 'rooms with occupants', v: stats?.activeRooms ?? 0, s: 'sockets joined right now', icon: Monitor, tone: 'ac-tone-cyan' },
    { k: 'live calls', v: stats?.activeCalls ?? 0, s: 'rooms with a WebRTC participant', icon: Video, tone: 'ac-tone-violet' },
    { k: 'server status', v: stats?.systemStatus || 'Unknown', s: uptimeLabel(stats?.uptime), icon: Activity, tone: 'ac-tone-ok', ok: true },
  ];

  return (
    <div className="admin-console dark-scope">
      <div className="ac-root">
        <div className="ac-glow" aria-hidden="true" />

        <div className="ac-shell">
          <header className="ac-head">
            <div className="ac-head-id">
              <span className="ac-mark"><ShieldCheck size={26} /></span>
              <div>
                <h1 className="ac-title">
                  Admin control
                  <span className="ac-tag">signed in as {user?.username || 'guest'}</span>
                </h1>
                <p className="ac-sub">
                  Accounts, occupied rooms and call counts, read live from the running server process.
                  Refreshes every {REFRESH_MS / 1000} seconds while this tab is visible.
                </p>
              </div>
            </div>
            <div className="ac-head-right">
              <span className="ac-updated">
                {updatedAt ? `updated ${updatedAt.toLocaleTimeString()}` : 'awaiting first read'}
                <br />
                next poll in {REFRESH_MS / 1000}s
              </span>
              <button className="ac-refresh" onClick={fetchAdminData} disabled={refreshing}>
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                Refresh now
              </button>
            </div>
          </header>

          {error && (
            <div className="ac-error" role="alert">
              <AlertTriangle size={17} />
              <span>{error}</span>
            </div>
          )}

          <div className="ac-tiles">
            {tiles.map((t) => (
              <div className={`ac-tile ${t.tone}`} key={t.k}>
                <div className="ac-tile-top">
                  <span className="ac-tile-k">{t.k}</span>
                  <span className="ac-tile-icon"><t.icon size={16} /></span>
                </div>
                <div className={`ac-tile-v ${t.ok ? 'is-ok' : ''}`}>{t.v}</div>
                <span className="ac-tile-s">{t.s}</span>
              </div>
            ))}
          </div>

          <div className="ac-main">
            <section className="ac-panel">
              <div className="ac-panel-head">
                <div>
                  <h2 className="ac-panel-title"><Users size={17} /> Accounts</h2>
                  <p className="ac-panel-sub">Deleting an account revokes its token on the next request.</p>
                </div>
                <span className="ac-count">{filteredUsers.length} of {usersList.length}</span>
              </div>

              <div className="ac-filters">
                <div className="ac-search">
                  <Search size={14} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filter by username"
                    aria-label="Filter users by username"
                  />
                </div>
                <div className="ac-select">
                  <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filter by role">
                    <option value="all">All roles</option>
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                  </select>
                  <ChevronDown size={14} />
                </div>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="ac-empty">
                  <UserX size={26} />
                  <strong>{usersList.length ? 'No account matches that filter' : 'No accounts yet'}</strong>
                  <span>
                    {usersList.length
                      ? 'Clear the search box or switch the role filter to see everyone.'
                      : 'Sign up from the landing page and the new account appears here on the next poll.'}
                  </span>
                </div>
              ) : (
                <div className="ac-scroll">
                  <table className="ac-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Joined</th>
                        <th className="is-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => {
                        const name = nameOf(u);
                        const role = roleOf(u);
                        const isRoot = name === 'admin';
                        return (
                          <tr key={u.id}>
                            <td>
                              <div className="ac-user">
                                <span className="ac-ava">{name.charAt(0).toUpperCase()}</span>
                                <span className="ac-name">{name}</span>
                                {isRoot && <span className="ac-pill is-admin">root</span>}
                              </div>
                            </td>
                            <td><span className={`ac-pill ${role === 'admin' ? 'is-admin' : ''}`}>{role}</span></td>
                            <td>
                              <span className="ac-date">
                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                              </span>
                            </td>
                            <td className="is-right">
                              {isRoot ? (
                                <span className="ac-date">protected</span>
                              ) : (
                                <button
                                  className="ac-del"
                                  onClick={() => handleDeleteUser(u.id, name)}
                                  disabled={deletingId === u.id}
                                  title={`Delete ${name}`}
                                  aria-label={`Delete ${name}`}
                                >
                                  {deletingId === u.id
                                    ? <span className="ac-spinner is-sm" />
                                    : <Trash2 size={15} />}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <aside className="ac-panel">
              <div className="ac-panel-head">
                <div>
                  <h2 className="ac-panel-title"><Monitor size={17} /> Occupied rooms</h2>
                  <p className="ac-panel-sub">Every room currently holding at least one socket.</p>
                </div>
                <span className="ac-count">{roomsList.length}</span>
              </div>

              {roomsList.length === 0 ? (
                <div className="ac-empty">
                  <Monitor size={26} />
                  <strong>Nothing is live</strong>
                  <span>A room appears here the moment someone joins it, and disappears when the last socket leaves.</span>
                </div>
              ) : (
                <div className="ac-rooms">
                  {roomsList.map((room) => {
                    const occupants = (room.users || []).map((p) => p?.username).filter(Boolean);
                    return (
                      <div className="ac-room" key={room.roomId}>
                        <span className="ac-room-mark"><Monitor size={15} /></span>
                        <div className="ac-room-body">
                          <div className="ac-room-id">{room.roomId}</div>
                          <div className="ac-room-who">
                            {occupants.length ? occupants.join(', ') : `${room.userCount || 0} socket(s)`}
                          </div>
                        </div>
                        <span className="ac-live"><i />{room.userCount || 0}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </aside>
          </div>

          <p className="ac-footnote">
            metrics come from the live socket maps, not a database — they reset when the node process restarts
          </p>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="ac-backdrop" onClick={() => setShowDeleteConfirm(null)}>
          <div
            className="ac-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`Delete ${showDeleteConfirm.username}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ac-dialog-top">
              <span className="ac-dialog-icon"><AlertTriangle size={20} /></span>
              <div>
                <h3>Delete account</h3>
                <p>This cannot be undone</p>
              </div>
            </div>
            <p className="ac-dialog-body">
              Removing <strong>{showDeleteConfirm.username}</strong> deletes the login, their saved snippets and
              their profile history. Rooms they created stay open until the last socket leaves.
            </p>
            <div className="ac-dialog-actions">
              <button className="ac-btn" onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
              <button
                className="ac-btn is-danger"
                onClick={confirmDelete}
                disabled={deletingId === showDeleteConfirm.userId}
              >
                {deletingId === showDeleteConfirm.userId ? <span className="ac-spinner is-sm" /> : <Trash2 size={14} />}
                {deletingId === showDeleteConfirm.userId ? 'Deleting' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
