import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import {
  Users,
  Shield,
  Trash2,
  UserPlus,
  LayoutDashboard,
  LogOut,
  Sun,
  Moon,
  Grid,
  Database
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const UserManagement = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useRef(null);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : false;
  });

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const [newUser, setNewUser] = useState({
    name: '', email: '', password: '', role: 'vendor',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return; 
    if (user.role !== 'admin') {
      navigate('/dashboard');
    } else {
      fetchUsers();
    }
  }, [user, navigate]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/users');
      setUsers(data);
    } catch (error) {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Failed to load users', life: 3000 });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.current.show({ severity: 'warn', summary: 'Validation', detail: 'Please fill in all fields.', life: 3000 });
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/register', newUser);
      toast.current.show({ severity: 'success', summary: 'Success', detail: 'User created successfully', life: 2000 });
      setShowCreate(false);
      setNewUser({ name: '', email: '', password: '', role: 'vendor' });
      fetchUsers();
    } catch (error) {
      toast.current.show({ severity: 'error', summary: 'Error', detail: error.response?.data?.message || 'Failed to create user', life: 3000 });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (rowData) => {
    if (window.confirm(`Are you sure you want to delete ${rowData.name}?`)) {
      try {
        await api.delete(`/auth/users/${rowData._id}`);
        toast.current.show({ severity: 'success', summary: 'Deleted', detail: 'User has been removed', life: 2000 });
        fetchUsers();
      } catch (error) {
        toast.current.show({ severity: 'error', summary: 'Error', detail: 'Failed to delete user', life: 3000 });
      }
    }
  };

  const getTodayDate = () => {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${d}/${m}/${y}`;
  };

  const actionBodyTemplate = (rowData) => (
    <button
      onClick={() => handleDelete(rowData)}
      disabled={rowData._id === user._id}
      title={rowData._id === user._id ? "Cannot delete yourself" : "Delete User"}
      className="w-10 h-10 rounded-xl bg-red-50 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Trash2 size={18} />
    </button>
  );

  const roleBodyTemplate = (rowData) => {
    let badgeClass = '';
    let roleName = '';
    if (rowData.role === 'admin') {
      badgeClass = darkMode ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-700';
      roleName = 'Admin';
    } else if (rowData.role === 'pma') {
      badgeClass = darkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700';
      roleName = 'PMA';
    } else {
      badgeClass = darkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700';
      roleName = 'Vendor';
    }
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold ${badgeClass}`}>
        <Shield size={14} /> {roleName}
      </div>
    );
  };

  const NavItem = ({ icon: Icon, label, path, active }) => (
    <button onClick={() => navigate(path)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${active ? 'bg-[#0080ff] text-white shadow-md' : (darkMode ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900')}`}>
      <Icon size={20} /> {label}
    </button>
  );

  return (
    <div className={`flex h-screen w-full transition-all duration-300 overflow-hidden ${darkMode ? 'bg-[#0f172a] text-white' : 'bg-[#f4f7fb] text-slate-900'}`}>
      <Toast ref={toast} />

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
            <NavItem icon={LayoutDashboard} label="Dashboard" path="/dashboard" active={false} />
            <NavItem icon={Database} label="All Entries" path="/tracker" active={false} />
            {user?.role === 'admin' && <NavItem icon={Users} label="Users" path="/users" active={true} />}
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
          <button onClick={() => { logout(); navigate('/login'); }} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all font-bold bg-[#f14646] text-white hover:bg-red-600 shadow-sm">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
        <header className="px-8 py-8 flex justify-between items-start shrink-0">
          <div>
            <h2 className="text-3xl font-extrabold flex items-center gap-2">
              User Access 👥
            </h2>
            <p className={`mt-2 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Manage system permissions, PMAs, and vendors.
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
            <div className={`rounded-2xl p-5 border shadow-sm ${darkMode ? 'bg-[#1e293b] border-gray-800' : 'bg-white border-gray-100'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Users</p>
                  <h2 className="text-3xl font-extrabold mt-1">{users.length}</h2>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"><Users size={20} /></div>
              </div>
            </div>
            <div className={`rounded-2xl p-5 border shadow-sm ${darkMode ? 'bg-[#1e293b] border-gray-800' : 'bg-white border-gray-100'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Admin</p>
                  <h2 className="text-3xl font-extrabold mt-1">{users.filter((u) => u.role === 'admin').length}</h2>
                </div>
                <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center"><Shield size={20} /></div>
              </div>
            </div>
            <div className={`rounded-2xl p-5 border shadow-sm ${darkMode ? 'bg-[#1e293b] border-gray-800' : 'bg-white border-gray-100'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>PMA</p>
                  <h2 className="text-3xl font-extrabold mt-1">{users.filter((u) => u.role === 'pma').length}</h2>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center"><Shield size={20} /></div>
              </div>
            </div>
            <div className={`rounded-2xl p-5 border shadow-sm ${darkMode ? 'bg-[#1e293b] border-gray-800' : 'bg-white border-gray-100'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Vendors</p>
                  <h2 className="text-3xl font-extrabold mt-1">{users.filter((u) => u.role === 'vendor').length}</h2>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><Users size={20} /></div>
              </div>
            </div>
          </div>

          <div className={`transition-all rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col border ${darkMode ? 'bg-[#1e293b] border-gray-800' : 'bg-white border-gray-100'}`}>
            <div className={`flex justify-between items-center p-5 border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
              <h2 className="text-lg font-bold">All Registered Users</h2>
              <button onClick={() => setShowCreate(true)} className="bg-[#0080ff] hover:bg-blue-600 px-4 py-2 rounded-xl font-semibold flex items-center gap-2 shadow-sm transition-all text-white text-sm">
                <UserPlus size={16} /> Add New User
              </button>
            </div>

            <div className="flex-1">
              <DataTable value={users} paginator rows={10} loading={loading} responsiveLayout="scroll" className={`p-datatable-lg border-none ${darkMode ? 'custom-dark-table' : ''}`} emptyMessage="No users found.">
                <Column field="name" header="Name" sortable />
                <Column field="email" header="Email" sortable />
                <Column field="role" header="Role" body={roleBodyTemplate} sortable />
                <Column header="Action" body={actionBodyTemplate} style={{ width: '100px', textAlign: 'center' }} />
              </DataTable>
            </div>
          </div>
        </div>
      </main>

      <Dialog visible={showCreate} onHide={() => setShowCreate(false)} header="Create New User" style={{ width: '400px' }} className={darkMode ? 'dark-dialog' : ''} modal>
        <div className="flex flex-col gap-4 mt-2">
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>Full Name</label>
            <InputText value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className={`w-full ${darkMode ? 'bg-white/5 border-white/10 text-white' : ''}`} placeholder="e.g. John Doe" />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>Email Address</label>
            <InputText type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className={`w-full ${darkMode ? 'bg-white/5 border-white/10 text-white' : ''}`} placeholder="vendor@company.com" />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>Password</label>
            <InputText type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className={`w-full ${darkMode ? 'bg-white/5 border-white/10 text-white' : ''}`} placeholder="Create a password" />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>Assign Role</label>
            <Dropdown value={newUser.role} options={[{ label: 'Vendor', value: 'vendor' }, { label: 'PMA', value: 'pma' }, { label: 'Admin', value: 'admin' }]} onChange={(e) => setNewUser({ ...newUser, role: e.value })} className={`w-full ${darkMode ? 'bg-white/5 border-white/10 text-white' : ''}`} />
          </div>
          <button onClick={handleCreate} disabled={submitting} className="w-full mt-4 bg-[#0080ff] hover:bg-blue-600 disabled:opacity-50 text-white py-3 rounded-xl font-bold shadow-sm transition-all flex justify-center items-center gap-2">
            {submitting ? 'Creating...' : <><UserPlus size={18} /> Create User</>}
          </button>
        </div>
      </Dialog>
    </div>
  );
};

export default UserManagement;