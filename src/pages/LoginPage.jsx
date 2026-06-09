import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Grid, Loader2, Info, CheckCircle } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showContactAdmin, setShowContactAdmin] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setShowContactAdmin(true);

    setTimeout(() => {
      setShowContactAdmin(false);
    }, 5000);
  };

  return (
    <div className="min-h-screen flex bg-white selection:bg-cyan-500 selection:text-white">
      {/* Left Side - Professional Collaborative Panel */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1920&q=80')" }}
      >
        {/* High-End Abstract Blur Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900/90 to-blue-950/80 backdrop-blur-[2px]"></div>

        {/* Content over Image */}
        <div className="relative z-10 p-12 text-white max-w-lg">
          <div className="w-16 h-16 bg-white/10 rounded-3xl backdrop-blur-md flex items-center justify-center mb-8 border border-white/20 shadow-2xl">
            <Grid size={32} className="text-cyan-400" />
          </div>
          
          {/* ✅ UPDATED TEXT HERE */}
          <h1 className="text-5xl font-extrabold tracking-tight mb-6 leading-[1.1]">
            Premier Asia, <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-200">
              Smart workflow.
            </span>
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed font-medium">
            Streamline your garment ERP with smart workflows, manage vendors seamlessly, and hit every deadline with precision.
          </p>
          
          <div className="flex items-center gap-4 mt-12">
            <div className="flex -space-x-3">
              <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-blue-500"></div>
              <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-indigo-500"></div>
              <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-cyan-500"></div>
            </div>
            {/* ✅ UPDATED TRUST BADGE TEXT */}
            <p className="text-sm text-slate-400 font-medium">Trusted by top manufacturers across Asia</p>
          </div>
        </div>
      </div>

      {/* Right Side - Clean Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-slate-50 relative">
        
        <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-xl shadow-slate-100 border border-slate-100">
          
          <div className="text-center mb-10">
            <div className="w-14 h-14 bg-[#0080ff] rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg shadow-blue-500/30">
              <Grid size={28} className="text-white" />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome back</h2>
            <p className="text-slate-500 mt-2 font-medium">Please enter your details to sign in.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl mb-6 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="w-2 h-2 bg-red-600 rounded-full shrink-0 animate-pulse"></div>
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}

          {showContactAdmin && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-2xl mb-6 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <Info size={18} className="text-blue-500 shrink-0" />
              <p className="text-sm font-semibold">Please contact your Admin to reset the password.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div>
              <label className="block text-slate-700 text-sm font-bold mb-2">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="email"
                  placeholder="Example@gmail.com"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900 shadow-sm placeholder:text-slate-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-slate-700 text-sm font-bold">Password</label>
       
                <button 
                  type="button" 
                  onClick={handleForgotPassword}
                  className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors focus:outline-none"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900 shadow-sm placeholder:text-slate-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full mt-8 py-3.5 px-4 rounded-xl text-white font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${
                loading
                  ? 'bg-blue-400 cursor-not-allowed shadow-none'
                  : 'bg-[#0080ff] hover:bg-blue-600 hover:shadow-blue-500/30 active:scale-[0.98]'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In to Dashboard
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Developed by Footer */}
        <div className="absolute bottom-6 left-0 right-0 text-center">
          <p className="text-xs text-slate-400 font-mono flex items-center justify-center gap-1.5">
            <CheckCircle size={14} className="text-cyan-600" />
            Developed by <strong className="text-slate-500">NIK-TECH</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;