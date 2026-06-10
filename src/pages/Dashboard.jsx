import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AIChat from '../components/AIChat';
import {
  LayoutDashboard,
  Users,
  LogOut,
  TrendingUp,
  AlertTriangle,
  Clock3,
  Package,
  Moon,
  Sun,
  Grid,
  Database,
  CheckCircle2,
  PieChart,
  CalendarDays,
  Camera,
  Palette,
  AlertCircle
} from 'lucide-react';

import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [completionRate, setCompletionRate] = useState({ percent: 0, filled: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [greeting, setGreeting] = useState('');

  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : false;
  });

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

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

        let filledDates = 0;
        let totalDateFields = allEntries.length * 2;
        
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

  const NavItem = ({ icon: Icon, label, path, active }) => (
    <button 
      onClick={() => navigate(path)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
        active 
          ? 'bg-[#0080ff] text-white shadow-md' 
          : (darkMode ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900')
      }`}
    >
      <Icon size={20} />
      {label}
    </button>
  );

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-[#0f172a] text-white' : 'bg-[#f4f7fb] text-slate-900'}`}>
        <div className="text-xl font-semibold animate-pulse">Loading Dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-[#0f172a]' : 'bg-[#f4f7fb]'}`}>
        <div className="text-center">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <div className="text-xl text-red-500 font-semibold mb-4">{error}</div>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-[#0080ff] text-white rounded-xl hover:bg-blue-600 transition">Retry</button>
        </div>
      </div>
    );
  }

  // Define card color schemes based on card type
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
      <aside className={`w-[260px] h-full flex flex-col justify-between border-r shrink-0 transition-all ${darkMode ? 'bg-[#1e293b] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div>
          <div className="p-6 pb-8 border-b border-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00a2ff] flex items-center justify-center shadow-md text-white">
                <Grid size={20} />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight leading-none">PMA</h1>
                <p className={`text-[11px] font-medium mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Dashboard Panel</p>
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
          <div className={`p-4 rounded-2xl mb-3 border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-[#0080ff] text-white flex items-center justify-center font-bold text-lg">
                 {user?.name?.charAt(0).toUpperCase() || 'A'}
               </div>
               <div>
                 <p className="font-bold text-sm leading-tight">{user?.name || 'Admin'}</p>
                 <p className={`text-xs capitalize ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user?.role || 'Admin'}</p>
               </div>
             </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all font-bold bg-[#f14646] text-white hover:bg-red-600 shadow-sm">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className={`px-4 md:px-8 py-4 md:py-6 flex justify-between items-start shrink-0 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
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
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${darkMode ? 'bg-[#0080ff] text-white' : 'bg-[#00a2ff] text-white hover:bg-blue-500'}`}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            
            <div className={`px-4 py-2 rounded-xl flex flex-col shadow-sm border ${darkMode ? 'bg-[#1e293b] border-gray-700' : 'bg-white border-gray-100'}`}>
              <span className={`text-[9px] font-bold uppercase ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>Today's Date</span>
              <span className="font-extrabold text-xs">{getTodayDate()}</span>
            </div>
          </div>
        </header>

        {/* Scrollable cards section */}
        <div className="flex-1 px-4 md:px-8 py-6 overflow-y-auto">
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
                      <p className={`text-sm font-semibold tracking-wide ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{card.title}</p>
                      <h2 className="text-4xl font-black mt-2 tracking-tight">{card.value}</h2>
                    </div>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-white/20 backdrop-blur-sm border ${styles.border} ${styles.text}`}>
                      {card.icon}
                    </div>
                  </div>
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-xs">→</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick insights section - optional */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`rounded-2xl p-5 border ${darkMode ? 'bg-[#1e293b]/70 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
              <div className="flex items-center gap-3 mb-3">
                <CalendarDays size={20} className={darkMode ? 'text-cyan-400' : 'text-blue-500'} />
                <h3 className="font-bold text-sm">Quick Insight</h3>
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Total styles: <span className="font-bold">{stats?.totalStyles || 0}</span><br />
                Total Approved (any activity): <span className="font-bold text-green-500">{stats?.totalApproved || 0}</span><br />
                Delayed entries: <span className="font-bold text-red-500">{stats?.delayedEntries || 0}</span>
              </p>
            </div>
            <div className={`rounded-2xl p-5 border ${darkMode ? 'bg-[#1e293b]/70 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
              <div className="flex items-center gap-3 mb-3">
                <PieChart size={20} className={darkMode ? 'text-emerald-400' : 'text-emerald-600'} />
                <h3 className="font-bold text-sm">Plan Date Fill Rate</h3>
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                FPT+GPT dates filled: <span className="font-bold">{completionRate.percent}%</span><br />
                ({completionRate.filled}/{completionRate.total} fields)
              </p>
            </div>
          </div>
        </div>
      </main>

      <AIChat />
    </div>
  );
};

export default Dashboard;