import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AIChat from '../components/AIChat';
import {
  LayoutDashboard,
  Users,
  LogOut,
  TrendingUp,
  AlertTriangle,
  Clock3,
  Moon,
  Sun,
  Grid,
  Database,
  CheckCircle2,
  PieChart,
  CalendarDays,
  Camera,
  Palette,
  AlertCircle,
  History,
  Search,
  RotateCcw,
  ChevronRight,
} from 'lucide-react';

import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// Friendly display names for history fields
const activityNameMap = {
  labdipPlannedDate: 'Labdip (Planned Date)',
  labdipPlannedStatus: 'Labdip (Status)',
  photoSamplePlannedDate: 'Photo Sample (Planned Date)',
  photoSamplePlannedStatus: 'Photo Sample (Status)',
  plannedFPT: 'FPT (Planned Date)',
  plannedFPTStatus: 'FPT (Status)',
  plannedGPT: 'GPT (Planned Date)',
  plannedGPTStatus: 'GPT (Status)',
  gsmColorLotsPlanned: 'GSM/Color (Planned Date)',
  gsmColorLotsPlannedStatus: 'GSM/Color (Status)',
  factoryFOB: 'Factory FOB',
  vendorPhotoShootDate: 'PhotoShoot Date',
  remark: 'Remark',
  approvalStatus: 'Approval Status',
  pendingStatus: 'Pending Status',
  buyerApproval: 'Buyer Approval',
  priority: 'Priority',
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ---- Existing state ----
  const [stats, setStats] = useState(null);
  const [completionRate, setCompletionRate] = useState({ percent: 0, filled: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [greeting, setGreeting] = useState('');

  // ---- Latest Updates state ----
  const [updates, setUpdates] = useState([]);
  const [allStyles, setAllStyles] = useState([]);
  const [loadingUpdates, setLoadingUpdates] = useState(true);

  const [filters, setFilters] = useState({
    styleNo: '',
    activity: '',
    user: '',
    startDate: '',
    endDate: '',
  });

  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : false;
  });

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // ---- Role check ----
  const userRole = user?.role?.toLowerCase();

  // ---- Data fetching ----
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning ☀️');
    else if (hour < 18) setGreeting('Good Afternoon 🌤️');
    else setGreeting('Good Evening 🌙');

    const fetchData = async () => {
      try {
        const [statsResponse, entriesResponse] = await Promise.all([
          api.get('/dashboard'),
          api.get('/tracker'),
        ]);

        const allEntries = entriesResponse.data || [];
        setStats(statsResponse.data);
        setAllStyles(allEntries);

        // ---- Build updates from embedded history ----
        const allHistory = [];
        allEntries.forEach(entry => {
          if (entry.history && Array.isArray(entry.history)) {
            entry.history.forEach(h => {
              const dateStr = h.changedAt || h.date;
              if (!dateStr) return;

              allHistory.push({
                styleNo: entry.styleNo || '?',
                catNo: entry.catNo || '',
                activityName: h.field,
                previousStatus: h.oldValue ?? '',
                newStatus: h.newValue ?? '',
                updatedBy: h.changedBy?.name || 'N/A',
                updatedAt: dateStr,
              });
            });
          }
        });

        // Sort newest first & limit to 50
        allHistory.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        setUpdates(allHistory.slice(0, 50));

        // Completion rate (same as before)
        let filledDates = 0;
        const totalDateFields = allEntries.length * 2;
        allEntries.forEach(entry => {
          if (entry.plannedFPT) filledDates++;
          if (entry.plannedGPT) filledDates++;
        });
        const percent = totalDateFields === 0 ? 0 : Math.round((filledDates / totalDateFields) * 100);
        setCompletionRate({ percent, filled: filledDates, total: totalDateFields });

      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard data. Please check your connection.");
      } finally {
        setLoading(false);
        setLoadingUpdates(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getTodayDate = () => {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${d}/${m}/${y}`;
  };

  const handleCardClick = (filterType) => {
    navigate(`/tracker?filter=${filterType}`);
  };

  const daysSince = (dateString) => {
    if (!dateString) return null;
    const now = new Date();
    const date = new Date(dateString);
    const diffTime = Math.abs(now - date);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // ---- Computed values ----
  const filteredUpdates = useMemo(() => {
    return updates.filter(update => {
      if (filters.styleNo && !update.styleNo?.toLowerCase().includes(filters.styleNo.toLowerCase())) return false;
      if (filters.activity && update.activityName !== filters.activity) return false;
      if (filters.user && update.updatedBy !== filters.user) return false;

      const updateDate = new Date(update.updatedAt).setHours(0,0,0,0);
      if (filters.startDate) {
        const start = new Date(filters.startDate).setHours(0,0,0,0);
        if (updateDate < start) return false;
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate).setHours(23,59,59,999);
        if (updateDate > end) return false;
      }
      return true;
    });
  }, [updates, filters]);

  const styleLatestUpdateMap = useMemo(() => {
    const map = {};
    updates.forEach(u => {
      const style = u.styleNo;
      if (!map[style] || new Date(u.updatedAt) > new Date(map[style])) {
        map[style] = u.updatedAt;
      }
    });
    return map;
  }, [updates]);

  const recentlyUpdatedStyles = useMemo(() => {
    const styleMap = {};
    updates.forEach(u => {
      const style = u.styleNo;
      if (!styleMap[style] || new Date(u.updatedAt) > new Date(styleMap[style].lastUpdate)) {
        styleMap[style] = {
          styleNo: style,
          lastUpdate: u.updatedAt,
          activity: u.activityName,
        };
      }
    });
    return Object.values(styleMap)
      .sort((a, b) => new Date(b.lastUpdate) - new Date(a.lastUpdate))
      .slice(0, 5);
  }, [updates]);

  const stylesNoUpdate7Days = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const updatedStyleNos = new Set(
      updates
        .filter(u => new Date(u.updatedAt) >= sevenDaysAgo)
        .map(u => u.styleNo)
    );

    const allStyleNos = [...new Set(
      allStyles
        .map(entry => entry.styleNo)
        .filter(Boolean)
    )];

    return allStyleNos.filter(styleNo => !updatedStyleNos.has(styleNo));
  }, [updates, allStyles]);

  const resetFilters = () => {
    setFilters({ styleNo: '', activity: '', user: '', startDate: '', endDate: '' });
  };

  const handleRowClick = (styleNo) => {
    navigate(`/style/${styleNo}/history`);
  };

  const getStatusClass = (status) => {
    const lower = status?.toLowerCase() || '';
    if (lower.includes('approved') || lower.includes('completed'))
      return 'bg-green-100 dark:bg-green-900/30 border-l-4 border-green-500';
    if (lower.includes('pending'))
      return 'bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500';
    if (lower.includes('delayed') || lower.includes('reject'))
      return 'bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500';
    return '';
  };

  const distinctActivities = useMemo(
    () => [...new Set(updates.map(u => u.activityName).filter(Boolean))],
    [updates]
  );
  const distinctUsers = useMemo(
    () => [...new Set(updates.map(u => u.updatedBy).filter(Boolean))],
    [updates]
  );

  const NavItem = ({ icon: Icon, label, path, active }) => (
    <button
      onClick={() => navigate(path)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
        active
          ? 'bg-[#0080ff] text-white shadow-md'
          : darkMode
          ? 'text-gray-400 hover:bg-white/5 hover:text-white'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <Icon size={20} />
      {label}
    </button>
  );

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          darkMode ? 'bg-[#0f172a] text-white' : 'bg-[#f4f7fb] text-slate-900'
        }`}
      >
        <div className="text-xl font-semibold animate-pulse">Loading Dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          darkMode ? 'bg-[#0f172a]' : 'bg-[#f4f7fb]'
        }`}
      >
        <div className="text-center">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <div className="text-xl text-red-500 font-semibold mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-[#0080ff] text-white rounded-xl hover:bg-blue-600 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getCardStyles = (cardId, colorHint) => {
    const baseDark = darkMode;
    const colorMap = {
      orange: { bg: 'from-orange-500/20 to-orange-800/30', border: 'border-orange-500/30', text: 'text-orange-300' },
      blue: { bg: 'from-blue-500/20 to-blue-800/30', border: 'border-blue-500/30', text: 'text-blue-300' },
      pink: { bg: 'from-pink-500/20 to-pink-800/30', border: 'border-pink-500/30', text: 'text-pink-300' },
      purple: { bg: 'from-purple-500/20 to-purple-800/30', border: 'border-purple-500/30', text: 'text-purple-300' },
      emerald: { bg: 'from-emerald-500/20 to-emerald-800/30', border: 'border-emerald-500/30', text: 'text-emerald-300' },
      green: { bg: 'from-green-500/20 to-green-800/30', border: 'border-green-500/30', text: 'text-green-300' },
      red: { bg: 'from-red-500/20 to-red-800/30', border: 'border-red-500/30', text: 'text-red-300' },
    };
    const lightMap = {
      orange: { bg: 'from-orange-50 to-orange-100', border: 'border-orange-200', text: 'text-orange-700' },
      blue: { bg: 'from-blue-50 to-blue-100', border: 'border-blue-200', text: 'text-blue-700' },
      pink: { bg: 'from-pink-50 to-pink-100', border: 'border-pink-200', text: 'text-pink-700' },
      purple: { bg: 'from-purple-50 to-purple-100', border: 'border-purple-200', text: 'text-purple-700' },
      emerald: { bg: 'from-emerald-50 to-emerald-100', border: 'border-emerald-200', text: 'text-emerald-700' },
      green: { bg: 'from-green-50 to-green-100', border: 'border-green-200', text: 'text-green-700' },
      red: { bg: 'from-red-50 to-red-100', border: 'border-red-200', text: 'text-red-700' },
    };
    const style = baseDark ? colorMap[colorHint] : lightMap[colorHint];
    return style || (baseDark ? colorMap.blue : lightMap.blue);
  };

  const cards = [
    { id: 'pending-labdip', title: 'Labdip Pending', value: stats?.pendingLabdip || 0, icon: <Clock3 size={22} />, color: 'orange' },
    { id: 'pending-photo', title: 'Photo Sample Pending', value: stats?.pendingPhotoSample || 0, icon: <Camera size={22} />, color: 'blue' },
    { id: 'pending-fpt', title: 'FPT Pending', value: stats?.pendingFPT || 0, icon: <TrendingUp size={22} />, color: 'pink' },
    { id: 'pending-gpt', title: 'GPT Pending', value: stats?.pendingGPT || 0, icon: <TrendingUp size={22} />, color: 'purple' },
    { id: 'pending-gsm', title: 'GSM/Color Pending', value: stats?.pendingGSM || 0, icon: <Palette size={22} />, color: 'emerald' },
    { id: 'approved', title: 'Total Approved', value: stats?.totalApproved || 0, icon: <CheckCircle2 size={22} />, color: 'green' },
    { id: 'delayed', title: 'Delayed', value: stats?.delayedEntries || 0, icon: <AlertTriangle size={22} />, color: 'red' },
    { id: 'urgent', title: 'Urgent Priority', value: stats?.urgentCount || 0, icon: <AlertCircle size={22} />, color: 'red' },
  ];

  return (
    <div className={`flex h-screen w-full overflow-hidden ${darkMode ? 'bg-[#0f172a] text-white' : 'bg-[#f4f7fb] text-slate-900'}`}>
      {/* SIDEBAR */}
      <aside
        className={`w-[260px] h-full flex flex-col justify-between border-r shrink-0 transition-all ${
          darkMode ? 'bg-[#1e293b] border-gray-800' : 'bg-white border-gray-200 shadow-sm'
        }`}
      >
        <div>
          <div className="p-6 pb-8 border-b border-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00a2ff] flex items-center justify-center shadow-md text-white">
                <Grid size={20} />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight leading-none">PMA</h1>
                <p className={`text-[11px] font-medium mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Dashboard Panel
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 flex flex-col gap-2 mt-4">
            <NavItem icon={LayoutDashboard} label="Dashboard" path="/dashboard" active={true} />
            <NavItem icon={Database} label="All Entries" path="/tracker" active={false} />
            {user?.role === 'admin' && <NavItem icon={Users} label="Users" path="/users" active={false} />}
          </div>
        </div>

        <div className="p-4">
          <div
            className={`p-4 rounded-2xl mb-3 border ${
              darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0080ff] text-white flex items-center justify-center font-bold text-lg">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">{user?.name || 'Admin'}</p>
                <p className={`text-xs capitalize ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {user?.role || 'Admin'}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all font-bold bg-[#f14646] text-white hover:bg-red-600 shadow-sm"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header
          className={`px-4 md:px-8 py-4 md:py-6 flex justify-between items-start shrink-0 border-b ${
            darkMode ? 'border-gray-800' : 'border-gray-200'
          }`}
        >
          <div>
            <h2 className="text-2xl font-extrabold flex items-center gap-2 capitalize">
              {greeting}, {user?.name?.split(' ')[0] || 'Admin'}!
            </h2>
            <p className={`mt-1 text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Welcome back. Here's your production overview.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                darkMode
                  ? 'bg-[#0080ff] text-white'
                  : 'bg-[#00a2ff] text-white hover:bg-blue-500'
              }`}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div
              className={`px-4 py-2 rounded-xl flex flex-col shadow-sm border ${
                darkMode ? 'bg-[#1e293b] border-gray-700' : 'bg-white border-gray-100'
              }`}
            >
              <span className={`text-[9px] font-bold uppercase ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
                Today's Date
              </span>
              <span className="font-extrabold text-xs">{getTodayDate()}</span>
            </div>
          </div>
        </header>

        {/* Scrollable content area */}
        <div className="flex-1 px-4 md:px-8 py-6 overflow-y-auto">
          
          {/* 1. Stat Cards (always visible) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
            {cards.map((card, idx) => {
              const styles = getCardStyles(card.id, card.color);
              return (
                <div
                  key={idx}
                  onClick={() => handleCardClick(card.id)}
                  className={`relative group cursor-pointer rounded-2xl p-6 bg-gradient-to-br ${styles.bg} border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${styles.border}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p
                        className={`text-sm font-semibold tracking-wide ${
                          darkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}
                      >
                        {card.title}
                      </p>
                      <h2 className="text-4xl font-black mt-2 tracking-tight">{card.value}</h2>
                    </div>
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-white/20 backdrop-blur-sm border ${styles.border} ${styles.text}`}
                    >
                      {card.icon}
                    </div>
                  </div>
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-xs">
                      →
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2. Quick Insights (always visible) */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              className={`rounded-2xl p-5 border ${
                darkMode ? 'bg-[#1e293b]/70 border-gray-800' : 'bg-white border-gray-100 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <CalendarDays size={20} className={darkMode ? 'text-cyan-400' : 'text-blue-500'} />
                <h3 className="font-bold text-sm">Quick Insight</h3>
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Total styles: <span className="font-bold">{stats?.totalStyles || 0}</span>
                <br />
                Total Approved (any activity):{' '}
                <span className="font-bold text-green-500">{stats?.totalApproved || 0}</span>
                <br />
                Delayed entries: <span className="font-bold text-red-500">{stats?.delayedEntries || 0}</span>
              </p>
            </div>
            <div
              className={`rounded-2xl p-5 border ${
                darkMode ? 'bg-[#1e293b]/70 border-gray-800' : 'bg-white border-gray-100 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <PieChart size={20} className={darkMode ? 'text-emerald-400' : 'text-emerald-600'} />
                <h3 className="font-bold text-sm">Plan Date Fill Rate</h3>
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                FPT+GPT dates filled: <span className="font-bold">{completionRate.percent}%</span>
                <br />
                ({completionRate.filled}/{completionRate.total} fields)
              </p>
            </div>
          </div>

          {/* 3. Latest Updates Section – ONLY for admin & pma */}
          {(userRole === 'admin' || userRole === 'pma') && (
            <>
              {/* Latest Updates Table */}
              <div className="mt-10 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <History size={24} className="text-[#0080ff]" />
                    <h2 className="text-2xl font-extrabold">Latest Updates</h2>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Showing {filteredUpdates.length} of {updates.length} recent changes
                  </span>
                </div>

                {/* Filters */}
                <div
                  className={`p-4 rounded-2xl mb-4 border ${
                    darkMode ? 'bg-[#1e293b] border-gray-700' : 'bg-white border-gray-200 shadow-sm'
                  }`}
                >
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[150px]">
                      <label className="text-xs font-semibold uppercase mb-1 block text-gray-500 dark:text-gray-400">
                        Style No
                      </label>
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search..."
                          value={filters.styleNo}
                          onChange={(e) => setFilters({ ...filters, styleNo: e.target.value })}
                          className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm border ${
                            darkMode
                              ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300'
                          }`}
                        />
                      </div>
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <label className="text-xs font-semibold uppercase mb-1 block text-gray-500 dark:text-gray-400">
                        Activity
                      </label>
                      <select
                        value={filters.activity}
                        onChange={(e) => setFilters({ ...filters, activity: e.target.value })}
                        className={`w-full px-3 py-2 rounded-lg text-sm border ${
                          darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'
                        }`}
                      >
                        <option value="">All Activities</option>
                        {distinctActivities.map((act) => (
                          <option key={act} value={act}>
                            {act}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <label className="text-xs font-semibold uppercase mb-1 block text-gray-500 dark:text-gray-400">
                        User
                      </label>
                      <select
                        value={filters.user}
                        onChange={(e) => setFilters({ ...filters, user: e.target.value })}
                        className={`w-full px-3 py-2 rounded-lg text-sm border ${
                          darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'
                        }`}
                      >
                        <option value="">All Users</option>
                        {distinctUsers.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <label className="text-xs font-semibold uppercase mb-1 block text-gray-500 dark:text-gray-400">
                        From
                      </label>
                      <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        className={`w-full px-3 py-2 rounded-lg text-sm border ${
                          darkMode
                            ? 'bg-gray-800 border-gray-600 text-white [&::-webkit-calendar-picker-indicator]:invert'
                            : 'bg-white border-gray-300'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <label className="text-xs font-semibold uppercase mb-1 block text-gray-500 dark:text-gray-400">
                        To
                      </label>
                      <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        className={`w-full px-3 py-2 rounded-lg text-sm border ${
                          darkMode
                            ? 'bg-gray-800 border-gray-600 text-white [&::-webkit-calendar-picker-indicator]:invert'
                            : 'bg-white border-gray-300'
                        }`}
                      />
                    </div>
                    <button
                      onClick={resetFilters}
                      className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                    >
                      <RotateCcw size={14} /> Reset
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div
                  className={`rounded-2xl border overflow-hidden shadow-sm ${
                    darkMode ? 'bg-[#1e293b] border-gray-700' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead
                        className={`${
                          darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-600'
                        }`}
                      >
                        <tr>
                          <th className="p-3 text-left font-semibold">Style No</th>
                          <th className="p-3 text-left font-semibold">CAT No</th>
                          <th className="p-3 text-left font-semibold">Activity</th>
                          <th className="p-3 text-left font-semibold">Previous Status</th>
                          <th className="p-3 text-left font-semibold">New Status</th>
                          <th className="p-3 text-left font-semibold">Updated By</th>
                          <th className="p-3 text-left font-semibold">Updated At</th>
                          <th className="p-3 text-left font-semibold">Days Since Update</th>
                          <th className="p-3 text-left font-semibold">Days Since Last Style Update</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredUpdates.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="p-6 text-center text-gray-500 dark:text-gray-400">
                              No updates match the current filters.
                            </td>
                          </tr>
                        ) : (
                          filteredUpdates.map((update, idx) => {
                            const styleLatestDate = styleLatestUpdateMap[update.styleNo];
                            const daysSinceStyleUpdate = styleLatestDate
                              ? daysSince(styleLatestDate)
                              : null;
                            const daysSinceThisUpdate = daysSince(update.updatedAt);
                            const statusClass = getStatusClass(update.newStatus);
                            return (
                              <tr
                                key={idx}
                                onClick={() => handleRowClick(update.styleNo)}
                                className={`cursor-pointer transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 ${statusClass}`}
                              >
                                <td className="p-3 font-medium">{update.styleNo}</td>
                                <td className="p-3">{update.catNo || '-'}</td>
                                <td className="p-3">{update.activityName}</td>
                                <td className="p-3 text-gray-500 dark:text-gray-400">
                                  {update.previousStatus || '-'}
                                </td>
                                <td className="p-3 font-semibold">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-bold ${
                                      update.newStatus?.toLowerCase().includes('approved') ||
                                      update.newStatus?.toLowerCase().includes('completed')
                                        ? 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300'
                                        : update.newStatus?.toLowerCase().includes('pending')
                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300'
                                        : update.newStatus?.toLowerCase().includes('delayed')
                                        ? 'bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300'
                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                    }`}
                                  >
                                    {update.newStatus}
                                  </span>
                                </td>
                                <td className="p-3">{update.updatedBy}</td>
                                <td className="p-3 whitespace-nowrap">
                                  {new Date(update.updatedAt).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}{' '}
                                  {new Date(update.updatedAt).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true,
                                  })}
                                </td>
                                <td className="p-3">
                                  {daysSinceThisUpdate != null ? `${daysSinceThisUpdate} day(s)` : '-'}
                                </td>
                                <td className="p-3">
                                  {daysSinceStyleUpdate != null
                                    ? `${daysSinceStyleUpdate} day(s)`
                                    : '-'}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Widgets Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Recently Updated Styles Widget */}
                <div
                  className={`rounded-2xl p-5 border ${
                    darkMode ? 'bg-[#1e293b] border-gray-700' : 'bg-white border-gray-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <History size={20} className="text-blue-500" />
                    <h3 className="font-bold text-base">Recently Updated Styles</h3>
                  </div>
                  <ul className="space-y-3">
                    {recentlyUpdatedStyles.length === 0 ? (
                      <li className="text-sm text-gray-500">No recent updates found.</li>
                    ) : (
                      recentlyUpdatedStyles.map((style, i) => (
                        <li key={i} className="flex justify-between items-center text-sm">
                          <div>
                            <span className="font-semibold">{style.styleNo}</span>
                            <span className="text-gray-500 dark:text-gray-400 ml-2">
                              ({activityNameMap[style.activity] || style.activity})
                            </span>
                          </div>
                          <span className="text-gray-500 dark:text-gray-400">
                            {daysSince(style.lastUpdate)}d ago
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                  <button
                    onClick={() => navigate('/tracker')}
                    className="mt-3 text-xs font-medium text-[#0080ff] hover:underline flex items-center gap-1"
                  >
                    View all entries <ChevronRight size={14} />
                  </button>
                </div>

                {/* Styles With No Update In Last 7 Days Widget */}
                <div
                  className={`rounded-2xl p-5 border ${
                    darkMode ? 'bg-[#1e293b] border-gray-700' : 'bg-white border-gray-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle size={20} className="text-red-500" />
                    <h3 className="font-bold text-base">No Updates in Last 7 Days</h3>
                  </div>
                  {stylesNoUpdate7Days.length === 0 ? (
                    <p className="text-sm text-gray-500">All styles have recent updates. Good job!</p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto">
                      <div className="flex flex-wrap gap-2">
                        {stylesNoUpdate7Days.map((styleNo, i) => (
                          <span
                            key={i}
                            onClick={() => handleRowClick(styleNo)}
                            className="cursor-pointer px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 transition"
                          >
                            {styleNo}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {stylesNoUpdate7Days.length} style(s) may need attention.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <AIChat />
    </div>
  );
};

export default Dashboard;