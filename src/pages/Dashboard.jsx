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
  X,
  ExternalLink,
} from 'lucide-react';

import api from '../services/api';
import { useAuth } from '../context/AuthContext';

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

const accentThemes = [
  { name: 'Indigo', primary: 'indigo', class: 'indigo' },
  { name: 'Emerald', primary: 'emerald', class: 'emerald' },
  { name: 'Rose', primary: 'rose', class: 'rose' },
  { name: 'Amber', primary: 'amber', class: 'amber' },
];

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [completionRate, setCompletionRate] = useState({ percent: 0, filled: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [greeting, setGreeting] = useState('');

  const [updates, setUpdates] = useState([]);
  const [allStyles, setAllStyles] = useState([]);
  const [loadingUpdates, setLoadingUpdates] = useState(true);
  const [allHistoryForStats, setAllHistoryForStats] = useState([]);

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

  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem('accentColor') || 'indigo';
  });

  const [showColorPicker, setShowColorPicker] = useState(false);

  const [modal, setModal] = useState({
    open: false,
    title: '',
    filterType: '',
    entries: [],
  });

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('accentColor', accentColor);
  }, [accentColor]);

  const userRole = user?.role?.toLowerCase();

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

        const fullHistory = [];
        allEntries.forEach(entry => {
          if (entry.history && Array.isArray(entry.history)) {
            entry.history.forEach(h => {
              const dateStr = h.changedAt || h.date;
              if (!dateStr) return;

              fullHistory.push({
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

        fullHistory.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        setAllHistoryForStats(fullHistory);
        setUpdates(fullHistory);

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
  const closeModal = () => {
    setModal({ open: false, title: '', filterType: '', entries: [] });
  };

  const filterEntriesByType = (type, entries) => {
    if (!entries || entries.length === 0) return [];

    switch (type) {
      case 'pending-labdip':
        return entries.filter(e =>
          e.labdipPlannedStatus &&
          e.labdipPlannedStatus.toLowerCase().includes('pending')
        );
      case 'pending-photo':
        return entries.filter(e =>
          e.photoSamplePlannedStatus &&
          e.photoSamplePlannedStatus.toLowerCase().includes('pending')
        );
      case 'pending-fpt':
        return entries.filter(e =>
          e.plannedFPTStatus &&
          e.plannedFPTStatus.toLowerCase().includes('pending')
        );
      case 'pending-gpt':
        return entries.filter(e =>
          e.plannedGPTStatus &&
          e.plannedGPTStatus.toLowerCase().includes('pending')
        );
      case 'pending-gsm':
        return entries.filter(e =>
          e.gsmColorLotsPlannedStatus &&
          e.gsmColorLotsPlannedStatus.toLowerCase().includes('pending')
        );
      case 'approved':
        return entries.filter(e =>
          e.approvalStatus &&
          e.approvalStatus.toLowerCase().includes('approved')
        );
      case 'delayed':
        return entries.filter(e => {
          if (e.delayed !== undefined) return e.delayed === true;
          const today = new Date();
          const fptDate = e.plannedFPT ? new Date(e.plannedFPT) : null;
          const gptDate = e.plannedGPT ? new Date(e.plannedGPT) : null;
          const isOverdue = (date) => date && date < today;
          const notApproved = !e.approvalStatus?.toLowerCase().includes('approved');
          return (isOverdue(fptDate) || isOverdue(gptDate)) && notApproved;
        });
      case 'urgent':
        return entries.filter(e =>
          e.priority &&
          e.priority.toLowerCase().includes('urgent')
        );
      default:
        return [];
    }
  };

  const daysSince = (dateString) => {
    if (!dateString) return null;
    const now = new Date();
    const date = new Date(dateString);
    const diffTime = Math.abs(now - date);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const filteredUpdates = useMemo(() => {
    return updates.filter(update => {
      if (filters.styleNo && !update.styleNo?.toLowerCase().includes(filters.styleNo.toLowerCase())) return false;
      if (filters.activity && update.activityName !== filters.activity) return false;
      if (filters.user && update.updatedBy !== filters.user) return false;

      const updateDate = new Date(update.updatedAt).setHours(0, 0, 0, 0);
      if (filters.startDate) {
        const start = new Date(filters.startDate).setHours(0, 0, 0, 0);
        if (updateDate < start) return false;
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate).setHours(23, 59, 59, 999);
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
      allHistoryForStats
        .filter(u => new Date(u.updatedAt) >= sevenDaysAgo)
        .map(u => u.styleNo)
    );

    const allStyleNos = [...new Set(
      allStyles
        .map(entry => entry.styleNo)
        .filter(Boolean)
    )];

    return allStyleNos.filter(styleNo => !updatedStyleNos.has(styleNo));
  }, [allHistoryForStats, allStyles]);

  const resetFilters = () => {
    setFilters({ styleNo: '', activity: '', user: '', startDate: '', endDate: '' });
  };

  const handleRowClick = (styleNo) => {
    navigate(`/style/${styleNo}/history`);
  };

  const getStatusClass = (status) => {
    const lower = status?.toLowerCase() || '';
    if (lower.includes('approved') || lower.includes('completed'))
      return 'bg-green-50 border-l-4 border-green-500';
    if (lower.includes('pending'))
      return 'bg-yellow-50 border-l-4 border-yellow-500';
    if (lower.includes('delayed') || lower.includes('reject'))
      return 'bg-red-50 border-l-4 border-red-500';
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

  const getAccentClasses = (type = 'bg') => {
    const accents = {
      indigo: { bg: 'bg-indigo-600', bgLight: 'bg-indigo-50', text: 'text-indigo-700', ring: 'ring-indigo-500' },
      emerald: { bg: 'bg-emerald-600', bgLight: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-500' },
      rose: { bg: 'bg-rose-600', bgLight: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-500' },
      amber: { bg: 'bg-amber-600', bgLight: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-500' },
    };
    return accents[accentColor] || accents.indigo;
  };

  const NavItem = ({ icon: Icon, label, path, active, openInNewTab = true }) => {
    const accent = getAccentClasses();
    return (
      <a
        href={path}
        target={openInNewTab ? '_blank' : '_self'}
        rel="noopener noreferrer"
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
          active
            ? `${darkMode ? 'bg-indigo-500/10' : accent.bgLight} ${accent.text} shadow-sm`
            : darkMode
            ? 'text-gray-400 hover:bg-white/5 hover:text-white'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        <Icon size={20} />
        <span className="flex-1">{label}</span>
        {active && <div className={`w-1.5 h-1.5 rounded-full ${accent.bg}`}></div>}
      </a>
    );
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-6 h-6 border-2 ${getAccentClasses().bg} border-t-transparent rounded-full animate-spin`}></div>
          <span className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Connection Error</h3>
          <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className={`px-6 py-3 ${getAccentClasses().bg} text-white rounded-xl hover:opacity-90 transition font-medium shadow-md`}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const cards = [
    { id: 'pending-labdip', title: 'Labdip Pending', value: stats?.pendingLabdip || 0, icon: Clock3, color: 'orange' },
    { id: 'pending-photo', title: 'Photo Sample Pending', value: stats?.pendingPhotoSample || 0, icon: Camera, color: 'blue' },
    { id: 'pending-fpt', title: 'FPT Pending', value: stats?.pendingFPT || 0, icon: TrendingUp, color: 'pink' },
    { id: 'pending-gpt', title: 'GPT Pending', value: stats?.pendingGPT || 0, icon: TrendingUp, color: 'purple' },
    { id: 'pending-gsm', title: 'GSM/Color Pending', value: stats?.pendingGSM || 0, icon: Palette, color: 'emerald' },
    { id: 'approved', title: 'Total Approved', value: stats?.totalApproved || 0, icon: CheckCircle2, color: 'green' },
    { id: 'delayed', title: 'Delayed', value: stats?.delayedEntries || 0, icon: AlertTriangle, color: 'red' },
    { id: 'urgent', title: 'Urgent Priority', value: stats?.urgentCount || 0, icon: AlertCircle, color: 'red' },
  ];

  const getCardIconStyles = (color) => {
    const map = {
      orange: 'bg-orange-100 text-orange-600',
      blue: 'bg-blue-100 text-blue-600',
      pink: 'bg-pink-100 text-pink-600',
      purple: 'bg-purple-100 text-purple-600',
      emerald: 'bg-emerald-100 text-emerald-600',
      green: 'bg-green-100 text-green-600',
      red: 'bg-red-100 text-red-600',
    };
    return map[color] || map.blue;
  };

  const accent = getAccentClasses();

  const getStatusFieldForFilter = (filterType, entry) => {
    switch (filterType) {
      case 'pending-labdip': return entry.labdipPlannedStatus || '-';
      case 'pending-photo': return entry.photoSamplePlannedStatus || '-';
      case 'pending-fpt': return entry.plannedFPTStatus || '-';
      case 'pending-gpt': return entry.plannedGPTStatus || '-';
      case 'pending-gsm': return entry.gsmColorLotsPlannedStatus || '-';
      case 'approved': return entry.approvalStatus || '-';
      case 'delayed': return entry.delayed ? 'Delayed' : (entry.plannedFPT || entry.plannedGPT) ? 'Overdue' : '-';
      case 'urgent': return entry.priority || '-';
      default: return '-';
    }
  };

  return (
    <div className={`flex h-screen w-full overflow-hidden ${darkMode ? 'bg-[#0f172a] text-white' : 'bg-gray-50 text-slate-900'}`}>
      {/* ---------- SIDEBAR ---------- */}
      <aside className={`w-[260px] h-full flex flex-col justify-between border-r shrink-0 transition-colors ${
        darkMode ? 'bg-[#0f172a] border-gray-800' : 'bg-white border-gray-200'
      }`}>
        <div>
          <div className="p-6 border-b border-transparent">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${accent.bg} flex items-center justify-center shadow-md`}>
                <Grid size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">PMA</h1>
                <p className={`text-[11px] font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Dashboard</p>
              </div>
            </div>
          </div>

          <nav className="px-3 mt-4 space-y-1">
            <NavItem icon={LayoutDashboard} label="Dashboard" path="/dashboard" active={true} openInNewTab={false} />
            <NavItem icon={Database} label="All Entries" path="/tracker" active={false} />
            {user?.role === 'admin' && <NavItem icon={Users} label="Users" path="/users" active={false} />}
          </nav>
        </div>

        <div className="p-4">
          <div className={`p-4 rounded-2xl mb-3 border ${
            darkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${accent.bg} text-white flex items-center justify-center font-bold text-lg`}>
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div>
                <p className="font-bold text-sm">{user?.name || 'Admin'}</p>
                <p className={`text-xs capitalize ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {user?.role || 'Admin'}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition shadow-sm"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* ---------- MAIN CONTENT ---------- */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className={`px-6 md:px-8 py-5 flex items-center justify-between shrink-0 border-b ${
          darkMode ? 'border-gray-800' : 'border-gray-200'
        }`}>
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              {greeting}, {user?.name?.split(' ')[0] || 'Admin'}!
            </h2>
            <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Welcome back. Here's your production overview.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Color theme picker */}
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                  darkMode
                    ? 'bg-gray-800 hover:bg-gray-700'
                    : 'bg-white border border-gray-200 hover:bg-gray-50 shadow-sm'
                }`}
                title="Change accent color"
              >
                <Palette size={18} className={darkMode ? 'text-gray-300' : 'text-gray-600'} />
              </button>
              {showColorPicker && (
                <div className={`absolute right-0 mt-2 p-3 rounded-xl border shadow-lg z-20 w-40 ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold">Accent</span>
                    <button onClick={() => setShowColorPicker(false)}>
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    {accentThemes.map((theme) => (
                      <button
                        key={theme.class}
                        onClick={() => {
                          setAccentColor(theme.primary);
                          setShowColorPicker(false);
                        }}
                        className={`w-8 h-8 rounded-full bg-${theme.primary}-500 hover:ring-2 ring-offset-2 transition ${
                          accentColor === theme.primary ? 'ring-2 ring-offset-2' : ''
                        }`}
                        title={theme.name}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                darkMode
                  ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm'
              }`}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className={`px-4 py-2 rounded-xl text-sm border ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'
            }`}>
              <span className={`block text-[10px] uppercase font-bold ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
                Today
              </span>
              <span className="font-bold">{getTodayDate()}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 px-6 md:px-8 py-6 overflow-y-auto">
          {/* STAT CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {cards.map((card) => (
              <div
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                className={`group cursor-pointer rounded-2xl p-5 transition-all duration-200 border ${
                  darkMode
                    ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'
                    : 'bg-white border-gray-100 shadow-sm hover:shadow-md'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className={`p-2 rounded-xl ${getCardIconStyles(card.color)}`}>
                    <card.icon size={18} />
                  </div>
                  <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {card.title}
                  </span>
                </div>
                <h3 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {card.value}
                </h3>
                <div className={`mt-2 text-xs flex items-center gap-1 ${
                  darkMode ? 'text-gray-500' : 'text-gray-400'
                } group-hover:${accent.text} transition-colors`}>
                  <span>View details</span>
                  <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>

          {/* INSIGHT CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
            <div className={`rounded-2xl p-5 border ${
              darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100 shadow-sm'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-blue-100">
                  <CalendarDays size={18} className="text-blue-600" />
                </div>
                <h3 className="font-bold text-sm">Quick Insight</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Total styles</span>
                  <span className="font-bold">{stats?.totalStyles || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Total Approved</span>
                  <span className="font-bold text-green-600">{stats?.totalApproved || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Delayed entries</span>
                  <span className="font-bold text-red-600">{stats?.delayedEntries || 0}</span>
                </div>
              </div>
            </div>
            <div className={`rounded-2xl p-5 border ${
              darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100 shadow-sm'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <PieChart size={18} className="text-emerald-600" />
                </div>
                <h3 className="font-bold text-sm">Plan Date Fill Rate</h3>
              </div>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-3xl font-bold">{completionRate.percent}%</span>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  complete
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full"
                  style={{ width: `${completionRate.percent}%` }}
                ></div>
              </div>
              <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {completionRate.filled} of {completionRate.total} FPT/GPT dates filled
              </p>
            </div>
          </div>

          {/* UPDATES TABLE (Admin/PMA only) */}
          {(userRole === 'admin' || userRole === 'pma') && (
            <>
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${darkMode ? 'bg-indigo-500/10' : accent.bgLight}`}>
                      <History size={20} className={accent.text} />
                    </div>
                    <h2 className="text-xl font-bold">Change History</h2>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {filteredUpdates.length} of {updates.length} changes
                      {filteredUpdates.length !== updates.length && ' (filtered)'}
                    </span>
                  </div>
                  {filters.styleNo || filters.activity || filters.user || filters.startDate || filters.endDate ? (
                    <button
                      onClick={resetFilters}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 transition"
                    >
                      <RotateCcw size={12} /> Clear filters
                    </button>
                  ) : null}
                </div>

                {/* FILTERS */}
                <div className={`p-4 rounded-2xl mb-5 border ${
                  darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200 shadow-sm'
                }`}>
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[160px]">
                      <label className="block text-xs font-semibold uppercase mb-1.5 text-gray-500">Style No</label>
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search..."
                          value={filters.styleNo}
                          onChange={(e) => setFilters({ ...filters, styleNo: e.target.value })}
                          className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-sm border focus:ring-2 ${accent.ring} focus:border-transparent outline-none transition ${
                            darkMode
                              ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 placeholder-gray-400'
                          }`}
                        />
                      </div>
                    </div>
                    <div className="flex-1 min-w-[160px]">
                      <label className="block text-xs font-semibold uppercase mb-1.5 text-gray-500">Activity</label>
                      <select
                        value={filters.activity}
                        onChange={(e) => setFilters({ ...filters, activity: e.target.value })}
                        className={`w-full px-3 py-2.5 rounded-xl text-sm border focus:ring-2 ${accent.ring} focus:border-transparent outline-none transition ${
                          darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'
                        }`}
                      >
                        <option value="">All Activities</option>
                        {distinctActivities.map((act) => (
                          <option key={act} value={act}>{act}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 min-w-[160px]">
                      <label className="block text-xs font-semibold uppercase mb-1.5 text-gray-500">User</label>
                      <select
                        value={filters.user}
                        onChange={(e) => setFilters({ ...filters, user: e.target.value })}
                        className={`w-full px-3 py-2.5 rounded-xl text-sm border focus:ring-2 ${accent.ring} focus:border-transparent outline-none transition ${
                          darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'
                        }`}
                      >
                        <option value="">All Users</option>
                        {distinctUsers.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-xs font-semibold uppercase mb-1.5 text-gray-500">From</label>
                      <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        className={`w-full px-3 py-2.5 rounded-xl text-sm border focus:ring-2 ${accent.ring} focus:border-transparent outline-none transition ${
                          darkMode
                            ? 'bg-gray-800 border-gray-600 text-white [color-scheme:dark]'
                            : 'bg-white border-gray-300'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-xs font-semibold uppercase mb-1.5 text-gray-500">To</label>
                      <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        className={`w-full px-3 py-2.5 rounded-xl text-sm border focus:ring-2 ${accent.ring} focus:border-transparent outline-none transition ${
                          darkMode
                            ? 'bg-gray-800 border-gray-600 text-white [color-scheme:dark]'
                            : 'bg-white border-gray-300'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* TABLE – FIXED TEXT VISIBILITY */}
                <div className={`rounded-2xl border overflow-hidden shadow-sm ${
                  darkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className={`${
                        darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-600'
                      }`}>
                        <tr>
                          <th className="px-4 py-3.5 text-left font-semibold whitespace-nowrap">Style No</th>
                          <th className="px-4 py-3.5 text-left font-semibold whitespace-nowrap">CAT No</th>
                          <th className="px-4 py-3.5 text-left font-semibold whitespace-nowrap">Activity</th>
                          <th className="px-4 py-3.5 text-left font-semibold whitespace-nowrap">Previous</th>
                          <th className="px-4 py-3.5 text-left font-semibold whitespace-nowrap">New Status</th>
                          <th className="px-4 py-3.5 text-left font-semibold whitespace-nowrap">Updated By</th>
                          <th className="px-4 py-3.5 text-left font-semibold whitespace-nowrap">Updated At</th>
                          <th className="px-4 py-3.5 text-left font-semibold whitespace-nowrap">Days Ago</th>
                          <th className="px-4 py-3.5 text-left font-semibold whitespace-nowrap">Last Update</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {filteredUpdates.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                              <div className="flex flex-col items-center gap-2">
                                <Search size={20} className="opacity-50" />
                                <span>No changes match your filters</span>
                              </div>
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

                            const getBadgeClass = (status) => {
                              const s = status?.toLowerCase() || '';
                              if (s.includes('approved') || s.includes('completed'))
                                return 'bg-green-100 text-green-800';
                              if (s.includes('pending'))
                                return 'bg-yellow-100 text-yellow-800';
                              if (s.includes('delayed') || s.includes('reject'))
                                return 'bg-red-100 text-red-800';
                              return 'bg-gray-100 text-gray-800';
                            };

                            return (
                              <tr
                                key={idx}
                                onClick={() => handleRowClick(update.styleNo)}
                                className={`cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${statusClass} ${
                                  darkMode ? 'text-white' : 'text-gray-900'
                                }`}
                              >
                                <td className={`px-4 py-3 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {update.styleNo}
                                </td>
                                <td className={`px-4 py-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {update.catNo || '-'}
                                </td>
                                <td className={`px-4 py-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {update.activityName}
                                </td>
                                <td className={`px-4 py-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {update.previousStatus || '-'}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeClass(update.newStatus)}`}>
                                    {update.newStatus}
                                  </span>
                                </td>
                                <td className={`px-4 py-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {update.updatedBy}
                                </td>
                                <td className={`px-4 py-3 whitespace-nowrap ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {new Date(update.updatedAt).toLocaleDateString('en-GB', {
                                    day: '2-digit', month: 'short', year: 'numeric',
                                  })}{' '}
                                  {new Date(update.updatedAt).toLocaleTimeString('en-US', {
                                    hour: '2-digit', minute: '2-digit', hour12: true,
                                  })}
                                </td>
                                <td className={`px-4 py-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {daysSinceThisUpdate != null ? `${daysSinceThisUpdate}d` : '-'}
                                </td>
                                <td className={`px-4 py-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {daysSinceStyleUpdate != null ? `${daysSinceStyleUpdate}d` : '-'}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className={`px-4 py-2 border-t text-xs font-medium flex items-center justify-between ${
                    darkMode ? 'bg-gray-800/70 text-gray-400 border-gray-700' : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}>
                    <span>Showing {filteredUpdates.length} of {updates.length} changes</span>
                    <span className="opacity-60">Click any row to view style history</span>
                  </div>
                </div>
              </div>

              {/* WIDGETS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                <div className={`rounded-2xl p-5 border ${
                  darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200 shadow-sm'
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <History size={18} className="text-blue-600" />
                    </div>
                    <h3 className="font-bold text-base">Recently Updated</h3>
                  </div>
                  {recentlyUpdatedStyles.length === 0 ? (
                    <p className="text-sm text-gray-500">No recent updates found.</p>
                  ) : (
                    <ul className="space-y-3">
                      {recentlyUpdatedStyles.map((style, i) => (
                        <li key={i} className="flex justify-between items-center text-sm">
                          <div>
                            <span className="font-semibold">{style.styleNo}</span>
                            <span className={`ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              ({activityNameMap[style.activity] || style.activity})
                            </span>
                          </div>
                          <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{daysSince(style.lastUpdate)}d ago</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    onClick={() => navigate('/tracker')}
                    className={`mt-3 text-xs font-medium ${accent.text} hover:underline flex items-center gap-1`}
                  >
                    View all entries <ChevronRight size={14} />
                  </button>
                </div>

                <div className={`rounded-2xl p-5 border ${
                  darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200 shadow-sm'
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-red-100">
                      <AlertCircle size={18} className="text-red-600" />
                    </div>
                    <h3 className="font-bold text-base">No Updates (7 days)</h3>
                  </div>
                  {stylesNoUpdate7Days.length === 0 ? (
                    <p className="text-sm text-gray-500">All styles have recent updates. 🎉</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                      {stylesNoUpdate7Days.map((styleNo, i) => (
                        <span
                          key={i}
                          onClick={() => handleRowClick(styleNo)}
                          className="cursor-pointer px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition"
                        >
                          {styleNo}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    {stylesNoUpdate7Days.length} style(s) may need attention.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* ---------- MODAL POPUP ---------- */}
      {modal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className={`w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl border overflow-hidden flex flex-col ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`px-6 py-4 flex items-center justify-between border-b ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${darkMode ? 'bg-indigo-500/10' : accent.bgLight}`}>
                  <Database size={18} className={accent.text} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{modal.title}</h3>
                  <p className="text-xs text-gray-500">{modal.entries.length} styles found</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                  darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body – Table */}
            <div className="flex-1 overflow-y-auto p-4">
              {modal.entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <Search size={32} className="mb-3 opacity-50" />
                  <p className="text-sm">No styles match this category</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className={`${
                    darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-600'
                  }`}>
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Style No</th>
                      <th className="px-4 py-3 text-left font-semibold">CAT No</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {modal.entries.map((entry, i) => {
                      const statusValue = getStatusFieldForFilter(modal.filterType, entry);
                      return (
                        <tr key={i} className={`hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          <td className="px-4 py-3 font-medium">{entry.styleNo || '-'}</td>
                          <td className={`px-4 py-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{entry.catNo || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              statusValue.toLowerCase().includes('pending') ? 'bg-yellow-100 text-yellow-800' :
                              statusValue.toLowerCase().includes('approved') ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {statusValue}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleRowClick(entry.styleNo)}
                              className={`text-xs font-medium ${accent.text} hover:underline flex items-center gap-1`}
                            >
                              <ExternalLink size={12} /> View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`px-6 py-3 border-t flex justify-between items-center ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <span className="text-xs text-gray-500">
                {modal.entries.length} {modal.entries.length === 1 ? 'style' : 'styles'} in this category
              </span>
              <button
                onClick={() => {
                  closeModal();
                  navigate(`/tracker?filter=${modal.filterType}`);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-medium text-white ${accent.bg} hover:opacity-90 transition shadow-sm`}
              >
                View All in Tracker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Chat */}
      <AIChat />
    </div>
  );
};

export default Dashboard;