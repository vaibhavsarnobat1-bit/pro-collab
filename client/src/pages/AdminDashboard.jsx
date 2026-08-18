import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ScrollReveal from '../components/ScrollReveal';
import ParticleBackground from '../components/ParticleBackground';
import { ShieldCheck, Users, Monitor, Video, Server, Trash2, RefreshCw, AlertTriangle, Activity, UserPlus, Search, Filter, MoreVertical, Edit3, LogOut as LogOutIcon } from 'lucide-react';

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

  const fetchAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/admin/dashboard');
      setStats(response.data.stats);
      setUsersList(response.data.users || []);
      setRoomsList(response.data.rooms || []);
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
      setError(err.response?.data?.message || 'Access denied or server error while loading dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleDeleteUser = async (userId, username) => {
    if (username === 'admin') {
      alert('The primary root admin user cannot be deleted.');
      return;
    }
    setShowDeleteConfirm({ userId, username });
  };

  const confirmDelete = async () => {
    if (!showDeleteConfirm) return;
    
    setDeletingId(showDeleteConfirm.userId);
    try {
      await api.delete(`/admin/users/${showDeleteConfirm.userId}`);
      setUsersList(usersList.filter(u => u.id !== showDeleteConfirm.userId));
      if (stats) {
        setStats({ ...stats, totalUsers: Math.max(0, stats.totalUsers - 1) });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setDeletingId(null);
      setShowDeleteConfirm(null);
    }
  };

  const filteredUsers = usersList.filter(u => {
    const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090d16] pt-16">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-400">Loading Admin Control Center...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080c14] p-4 lg:p-8 pt-20">
      
      {/* Particle Background */}
      <ParticleBackground 
        particleCount={20} 
        color="rgba(139, 92, 246, 0.15)" 
        size={{ min: 1, max: 3 }}
        speed={0.1}
        connectDistance={80}
        className="-z-20"
      />

      {/* Floating Orbs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-gradient-to-br from-purple-500/10 to-indigo-500/5 rounded-full blur-[200px] animate-blob" style={{ animationDuration: '25s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] bg-gradient-to-bl from-indigo-500/10 to-teal-500/5 rounded-full blur-[200px] animate-blob" style={{ animationDuration: '30s', animationDelay: '-5s' }} />
      </div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Header Section */}
        <ScrollReveal direction="down" delay={100}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a0d14]/90 backdrop-blur-2xl p-6 lg:p-8 rounded-3xl border border-white/10 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/15 rounded-full blur-[150px] pointer-events-none" />
            
            <div className="flex items-center gap-4 relative z-10">
              <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/30 text-purple-400">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-white tracking-tight">Admin Control Portal</h1>
                  <span className="px-3 py-0.5 text-[10px] font-extrabold bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/40 tracking-widest uppercase">
                    SYSTEM OVERSEER
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Real-time overview of users, active rooms, and WebRTC streaming nodes</p>
              </div>
            </div>

            <button
              onClick={fetchAdminData}
              className="btn-webild-secondary text-xs py-2.5 px-4 flex items-center gap-2 self-start md:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Metrics</span>
            </button>
          </div>
        </ScrollReveal>

        {error && (
          <ScrollReveal direction="up" delay={150}>
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          </ScrollReveal>
        )}

        {/* Stats Grid Cards */}
        <ScrollReveal direction="up" delay={200}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: Total Registered Users */}
            <div className="webild-card p-6 webild-card-hover">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Users</span>
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/30">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-white gradient-text">{stats?.totalUsers || 0}</span>
                <span className="text-xs text-slate-400 block mt-1">Registered workspace accounts</span>
              </div>
            </div>

            {/* Card 2: Active Collaboration Rooms */}
            <div className="webild-card p-6 webild-card-hover">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Rooms</span>
                <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/30">
                  <Monitor className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-white gradient-text">{stats?.activeRooms || 0}</span>
                <span className="text-xs text-cyan-400 block mt-1">Live document sessions</span>
              </div>
            </div>

            {/* Card 3: Active Video Calls */}
            <div className="webild-card p-6 webild-card-hover">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Video Calls</span>
                <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/30">
                  <Video className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-white gradient-text">{stats?.activeCalls || 0}</span>
                <span className="text-xs text-purple-400 block mt-1">WebRTC video streams</span>
              </div>
            </div>

            {/* Card 4: System Health */}
            <div className="webild-card p-6 webild-card-hover">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">System Status</span>
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/30">
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-extrabold text-emerald-400">{stats?.systemStatus || 'Healthy'}</span>
                <span className="text-xs text-slate-400 block mt-1">Node & Socket.io Online</span>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Users Table & Active Rooms Panel */}
        <ScrollReveal direction="up" delay={300}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Registered Users List Table */}
            <div className="lg:col-span-2 webild-card p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-400" />
                    <span>Registered Users Directory</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Manage user access and administrative roles</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 text-xs font-bold bg-white/5 text-slate-300 rounded-full border border-white/10">
                    {filteredUsers.length} / {usersList.length} Total
                  </span>
                </div>
              </div>

              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search users..."
                    className="w-full bg-slate-950/80 border border-white/15 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="bg-slate-950 border border-white/15 focus:border-indigo-500 rounded-xl pl-10 pr-8 py-2.5 text-xs text-white outline-none cursor-pointer appearance-none"
                  >
                    <option value="all">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Joined Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-200 flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-md">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <span>{u.username}</span>
                          {u.username === 'admin' && (
                            <span className="px-2 py-0.5 text-[9px] font-extrabold bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/40">ROOT</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            u.role === 'admin'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                              : 'bg-white/5 text-slate-400 border border-white/10'
                          }`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {u.username !== 'admin' && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.username)}
                                disabled={deletingId === u.id}
                                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-colors"
                                title="Delete User Account"
                              >
                                {deletingId === u.id ? (
                                  <div className="w-4 h-4 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredUsers.length === 0 && usersList.length > 0 && (
                <div className="text-center py-8 text-slate-500">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No users match your search criteria</p>
                </div>
              )}
            </div>

            {/* Active Rooms Monitor Side Panel */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 h-fit">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-teal-400" />
                  <span>Live Collaboration Rooms</span>
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-teal-500/20 text-teal-300 rounded border border-teal-500/30">
                  {roomsList.length} Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-6">Real-time room occupancy and editor sockets</p>

              {roomsList.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/50 rounded-xl border border-slate-800/80">
                  <Monitor className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                  <span className="text-xs text-slate-400 block font-medium">No active rooms at the moment</span>
                  <span className="text-[11px] text-slate-500 mt-1 block">Rooms show up when users open workspace sessions</span>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {roomsList.map((room) => (
                    <div key={room.roomId} className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between hover:border-teal-500/50 transition-colors animate-slide-right">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
                          <Monitor className="w-4 h-4 text-teal-400" />
                        </div>
                        <div>
                          <span className="font-mono text-xs text-indigo-300 font-bold block">Room: {room.roomId}</span>
                          <span className="text-[11px] text-slate-400 mt-0.5 block">
                            Active Users: {room.userCount}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping" />
                        <span className="text-[10px] text-teal-400 font-mono">LIVE</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </ScrollReveal>

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={() => setShowDeleteConfirm(null)}>
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Delete User</h3>
                <p className="text-xs text-slate-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 mb-6">
              Are you sure you want to permanently delete <strong className="text-white">{showDeleteConfirm.username}</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors border border-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deletingId === showDeleteConfirm.userId}
                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                {deletingId === showDeleteConfirm.userId ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
          25% { transform: translate(3%, -5%) scale(1.1) rotate(90deg); }
          50% { transform: translate(-5%, 3%) scale(0.9) rotate(180deg); }
          75% { transform: translate(2%, 4%) scale(1.05) rotate(270deg); }
        }
        .animate-blob { animation: blob ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default AdminDashboard;