import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
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
  ArrowRight
} from 'lucide-react';

import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [recentEntries, setRecentEntries] = useState([]);
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
        setRecentEntries(allEntries.slice(0, 5));

        let filledDates = 0;
        let totalDateFields = allEntries.length * 2;
        
        allEntries.forEach(entry => {
          if (entry.plannedFPT) filledDates++;
          if (entry.plannedGPT) filledDates++;
        });

        const percent = totalDateFields === 0 ? 0 : Math.round((filledDates / totalDateFields) * 100);
        setCompletionRate({ percent, filled: filledDates, total: totalDateFields });

      } catch (err) {
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${d}/${m}/${y}`;
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

  const actionBodyTemplate = () => (
    <button onClick={() => navigate('/tracker')} className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`} title="Go to entry">
      <ArrowRight size={16} />
    </button>
  );

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

  const cards = [
    {
      id: 'all',
      title: 'Total Styles',
      value: stats.totalStyles,
      icon: <Package size={20} />,
      colors: darkMode ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-600 border-blue-100'
    },
    {
      id: 'pending-gpt',
      title: 'Pending GPT',
      value: stats.pendingGPT,
      icon: <Clock3 size={20} />,
      colors: darkMode ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-orange-50 text-orange-600 border-orange-100'
    },
    {
      id: 'pending-fpt',
      title: 'Pending FPT',
      value: stats.pendingFPT,
      icon: <TrendingUp size={20} />,
      colors: darkMode ? 'bg-pink-500/20 text-pink-400 border-pink-500/30' : 'bg-pink-50 text-pink-600 border-pink-100'
    },
    {
      id: 'approved',
      title: 'Approved',
      value: stats.approvedCount,
      icon: <CheckCircle2 size={20} />,
      colors: darkMode ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-green-50 text-green-600 border-green-100'
    },
    {
      id: 'delayed',
      title: 'Delayed',
      value: stats.delayedEntries,
      icon: <AlertTriangle size={20} />,
      colors: darkMode ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-red-50 text-red-600 border-red-100'
    },
    {
      id: 'hold',
      title: 'On Hold',
      value: stats.holdCount,
      icon: <Clock3 size={20} />,
      colors: darkMode ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-yellow-50 text-yellow-600 border-yellow-100'
    },
    {
      id: 'urgent',
      title: 'Urgent',
      value: stats.urgentCount,
      icon: <AlertTriangle size={20} />,
      colors: darkMode ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-purple-50 text-purple-600 border-purple-100'
    },
    {
      id: 'health',
      title: 'Plan Dates Filled',
      value: `${completionRate.percent}%`,
      subtitle: `${completionRate.filled}/${completionRate.total} Fields`,
      icon: <CheckCircle2 size={20} />,
      colors: darkMode ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
    },
  ];

  return (
    <div className={`flex h-screen w-full transition-all duration-300 overflow-hidden relative ${darkMode ? 'bg-[#0f172a] text-white' : 'bg-[#f4f7fb] text-slate-900'}`}>
      
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
      <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
        <header className="px-8 py-8 flex justify-between items-start shrink-0">
          <div>
            <h2 className="text-3xl font-extrabold flex items-center gap-2 capitalize">
              {greeting}, {user?.name?.split(' ')[0] || 'Admin'}!
            </h2>
            <p className={`mt-2 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Monitor your production entries, vendors, and tracking updates.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={() => setDarkMode(!darkMode)} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm ${darkMode ? 'bg-[#0080ff] text-white' : 'bg-[#00a2ff] text-white hover:bg-blue-500'}`}>
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <div className={`px-5 py-2.5 rounded-2xl flex flex-col shadow-sm border ${darkMode ? 'bg-[#1e293b] border-gray-700' : 'bg-white border-gray-100'}`}>
              <span className={`text-[10px] font-bold uppercase ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>Today's Date</span>
              <span className="font-extrabold text-sm">{getTodayDate()}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 px-8 pb-8 overflow-y-auto flex flex-col">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-5 mb-6">
            {cards.map((card, idx) => (
              <div 
                key={idx} 
                onClick={() => handleCardClick(card.id)}
                className={`rounded-2xl p-5 border shadow-sm cursor-pointer hover:-translate-y-1 hover:shadow-md transition-all duration-200 ${darkMode ? 'bg-[#1e293b] hover:bg-[#27354b] border-gray-800' : 'bg-white hover:bg-gray-50 border-gray-100'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{card.title}</p>
                    <h2 className="text-3xl font-extrabold mt-1">{card.value}</h2>
                    {card.subtitle && <p className={`text-[11px] font-bold mt-1 uppercase tracking-wide ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{card.subtitle}</p>}
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${card.colors}`}>
                    {card.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={`transition-all rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col border ${darkMode ? 'bg-[#1e293b] border-gray-800' : 'bg-white border-gray-100'}`}>
            <div className={`flex justify-between items-center p-5 border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
              <div>
                <h2 className="text-lg font-bold">Recent Entries</h2>
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Latest production updates</p>
              </div>
              <button onClick={() => navigate('/tracker')} className="bg-[#0080ff] hover:bg-blue-600 px-5 py-2 rounded-xl font-semibold shadow-sm transition-all text-white text-sm">
                View All Entries
              </button>
            </div>

            <div className="flex-1">
              <DataTable value={recentEntries} responsiveLayout="scroll" className={`p-datatable-lg border-none ${darkMode ? 'custom-dark-table' : ''}`} emptyMessage="No recent entries found.">
                <Column field="styleNo" header="Style No." className="font-semibold" />
                <Column field="factoryFOB" header="FOB Date" body={(rowData) => formatDate(rowData.factoryFOB)} />
                <Column field="plannedFPT" header="FPT Planned" body={(rowData) => formatDate(rowData.plannedFPT)} />
                <Column field="plannedGPT" header="GPT Planned" body={(rowData) => formatDate(rowData.plannedGPT)} />
                <Column header="Actions" body={actionBodyTemplate} style={{ width: '80px', textAlign: 'center' }} />
              </DataTable>
            </div>
          </div>
          
        </div>
      </main>

      <AIChat />

    </div>
  );
};

export default Dashboard;