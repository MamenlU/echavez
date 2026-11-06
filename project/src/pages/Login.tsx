import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Lock, AlertCircle, Eye, EyeOff, Wrench, Settings, Package, Shield } from 'lucide-react';
import { useReveal } from '../hooks/useReveal';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { consumePostAuthRedirect } from '../utils/postAuthRedirect';

export function Login() {
  const ref = useReveal<HTMLDivElement>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [progressWidth, setProgressWidth] = useState('0%');
  const [googleError, setGoogleError] = useState('');

  // Trigger progress bar transition when success state is active
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        setProgressWidth('100%');
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setProgressWidth('0%');
    }
  }, [status]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setStatus('loading');
  setMessage('');

  try {
    const response = await axios.post('/api/auth/login', formData);

    setStatus('success');
    setMessage(`Welcome back, ${response.data.user.username || 'user'}!`);

    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));

    // Notify Navbar immediately
    window.dispatchEvent(new Event('storage'));

    const destination =
      consumePostAuthRedirect(response.data.user.role);

    setTimeout(() => {
      navigate(destination);
    }, 2000);

  } catch (err) {
    setStatus('error');

    if (axios.isAxiosError(err)) {
      setMessage(
        err.response?.data?.error || 'Invalid credentials.'
      );
    } else {
      setMessage('Invalid credentials.');
    }
  }
};

  const floatingIcons = [
    { Icon: Wrench, top: '12%', left: '10%', size: 28, delay: '0s', duration: '9s', rotation: 35 },
    { Icon: Settings, top: '22%', right: '15%', size: 32, delay: '1.5s', duration: '12s', rotation: -20 },
    { Icon: Shield, bottom: '25%', left: '12%', size: 26, delay: '3s', duration: '10s', rotation: 15 },
    { Icon: Package, bottom: '15%', right: '10%', size: 30, delay: '0.8s', duration: '8s', rotation: 45 },
    { Icon: Lock, top: '55%', left: '8%', size: 24, delay: '2s', duration: '11s', rotation: -40 },
    { Icon: User, bottom: '40%', right: '8%', size: 24, delay: '4s', duration: '9.5s', rotation: 25 },
  ];

  return (
    <div 
      ref={ref} 
      className="w-full min-h-[calc(100vh-64px)] bg-gradient-to-br from-[#064e3b] via-[#0b6044] to-[#07563e] flex items-center justify-center relative py-20 px-4 overflow-hidden"
    >
      {/* Success Modal Overlay */}
      {status === 'success' && (
        <div className="fixed inset-0 bg-[#043d2d]/[0.72] backdrop-blur-md flex items-center justify-center z-50 animate-fade-in px-4">
          <style>{`
            @keyframes draw-check {
              to { stroke-dashoffset: 0; }
            }
            @keyframes spark-float-1 {
              0% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 0; }
              15% { opacity: 0.9; }
              100% { transform: translate(-50px, -70px) scale(0.1) rotate(180deg); opacity: 0; }
            }
            @keyframes spark-float-2 {
              0% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 0; }
              15% { opacity: 0.9; }
              100% { transform: translate(50px, -80px) scale(0.1) rotate(-180deg); opacity: 0; }
            }
            @keyframes spark-float-3 {
              0% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 0; }
              15% { opacity: 0.9; }
              100% { transform: translate(-25px, -100px) scale(0.1) rotate(90deg); opacity: 0; }
            }
            @keyframes spark-float-4 {
              0% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 0; }
              15% { opacity: 0.9; }
              100% { transform: translate(30px, -60px) scale(0.1) rotate(-90deg); opacity: 0; }
            }
            @keyframes spark-float-5 {
              0% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 0; }
              15% { opacity: 0.9; }
              100% { transform: translate(-35px, -90px) scale(0.1) rotate(120deg); opacity: 0; }
            }
            @keyframes spark-float-6 {
              0% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 0; }
              15% { opacity: 0.9; }
              100% { transform: translate(35px, -70px) scale(0.1) rotate(-120deg); opacity: 0; }
            }
            .animate-draw-check {
              stroke-dasharray: 48;
              stroke-dashoffset: 48;
              animation: draw-check 0.6s cubic-bezier(0.65, 0, 0.45, 1) 0.3s forwards;
            }
          `}</style>

          <div className="w-full max-w-sm bg-[#0a5b42] border border-emerald-100/[0.15] p-8 rounded-2xl shadow-2xl shadow-emerald-950/[0.35] text-center relative overflow-hidden animate-fade-up">
            {/* Top orange gradient mechanical line */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-construction-500 via-construction-600 to-construction-400"></div>
            {/* Technical notches */}
            <div className="absolute top-1 inset-x-0 h-2 flex justify-between px-6 pointer-events-none opacity-25">
              {[...Array(21)].map((_, i) => (
                <span key={i} className={`w-[1px] bg-white ${i % 5 === 0 ? 'h-2' : 'h-1'}`}></span>
              ))}
            </div>

            {/* Decorative coordinates logs */}
            <span className="absolute top-3 left-3 text-[8px] font-mono text-navy-500 select-none">SYS_OK.200</span>
            <span className="absolute top-3 right-3 text-[8px] font-mono text-navy-500 select-none">AUTH_OK</span>

            {/* Checkmark, glow, and sparks container */}
            <div className="relative flex items-center justify-center w-24 h-24 mx-auto mb-6">
              {/* Outer pulsing ring */}
              <div 
                className="absolute inset-0 rounded-full bg-construction-500/20 blur-md animate-ping"
                style={{ animationDuration: '1.5s' }}
              />
              
              {/* Inner ring */}
              <div className="relative z-10 w-20 h-20 rounded-full border-4 border-construction-500 flex items-center justify-center bg-[#064633] shadow-lg shadow-construction-500/30">
                <svg className="w-10 h-10 text-construction-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                  <path className="animate-draw-check" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              {/* Bursting sparks */}
              <div className="absolute inset-0 pointer-events-none">
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-construction-500 blur-[1px]" style={{ animation: 'spark-float-1 1s ease-out forwards', animationDelay: '0.1s' }} />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-construction-400" style={{ animation: 'spark-float-2 1.2s ease-out forwards', animationDelay: '0.2s' }} />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-yellow-400 blur-[1px]" style={{ animation: 'spark-float-3 0.9s ease-out forwards', animationDelay: '0.0s' }} />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-construction-600" style={{ animation: 'spark-float-4 1.1s ease-out forwards', animationDelay: '0.3s' }} />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-yellow-300 blur-[2px]" style={{ animation: 'spark-float-5 1.3s ease-out forwards', animationDelay: '0.15s' }} />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-construction-500 blur-[1px]" style={{ animation: 'spark-float-6 1s ease-out forwards', animationDelay: '0.25s' }} />
              </div>
            </div>

            <h3 className="text-2xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-white via-navy-100 to-white tracking-tight">Access Granted</h3>
            <p className="text-navy-300 mt-2 text-sm">{message}</p>

            {/* Technical Progress Loading Bar */}
            <div className="mt-8">
              <div className="flex justify-between text-[10px] font-mono text-navy-400 mb-1.5">
                <span>TERMINAL_SYNC</span>
                <span>{progressWidth === '100%' ? 'READY' : 'LOADING...'}</span>
              </div>
              <div className="w-full h-1.5 bg-[#064633] rounded-full overflow-hidden border border-white/5 p-[1px]">
                <div 
                  className="h-full bg-gradient-to-r from-construction-500 to-construction-600 rounded-full transition-all duration-[1800ms] ease-out shadow-[0_0_8px_rgba(249,115,22,0.4)]"
                  style={{ width: progressWidth }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Blueprint grid patterns */}
      <div 
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(56, 189, 248, 0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56, 189, 248, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(56, 189, 248, 0.4) 2px, transparent 2px),
            linear-gradient(90deg, rgba(56, 189, 248, 0.4) 2px, transparent 2px)
          `,
          backgroundSize: '200px 200px',
        }}
      />

      {/* Ambient glow backgrounds */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-construction-500/10 blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] rounded-full bg-emerald-300/[0.12] blur-[100px] pointer-events-none animate-glow" />

      {/* SVG drafting drawings overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20%" cy="30%" r="140" stroke="#6ee7b7" strokeWidth="1.5" strokeDasharray="6,4" fill="none" />
        <circle cx="20%" cy="30%" r="80" stroke="#6ee7b7" strokeWidth="1" fill="none" />
        <line x1="20%" y1="10%" x2="20%" y2="50%" stroke="#6ee7b7" strokeWidth="1" strokeDasharray="3,3" />
        <line x1="5%" y1="30%" x2="35%" y2="30%" stroke="#6ee7b7" strokeWidth="1" strokeDasharray="3,3" />
        <path d="M 20% 30% m -140 0 a 140 140 0 1 1 280 0 a 140 140 0 1 1 -280 0" stroke="#6ee7b7" strokeWidth="0.5" fill="none" />
        
        <circle cx="80%" cy="70%" r="180" stroke="#6ee7b7" strokeWidth="1.5" strokeDasharray="8,6" fill="none" />
        <circle cx="80%" cy="70%" r="90" stroke="#6ee7b7" strokeWidth="1" fill="none" />
        <line x1="80%" y1="45%" x2="80%" y2="95%" stroke="#6ee7b7" strokeWidth="1" strokeDasharray="3,3" />
        <line x1="60%" y1="70%" x2="100%" y2="70%" stroke="#6ee7b7" strokeWidth="1" strokeDasharray="3,3" />
        
        {/* Drafting angle line */}
        <line x1="0" y1="0" x2="100%" y2="100%" stroke="#6ee7b7" strokeWidth="0.5" strokeDasharray="10,10" />
        <line x1="100%" y1="0" x2="0" y2="100%" stroke="#6ee7b7" strokeWidth="0.5" strokeDasharray="10,10" />
      </svg>

      {/* Floating minimal hardware icons */}
      {floatingIcons.map((item, idx) => {
        const { Icon, top, left, right, bottom, size, delay, duration, rotation } = item;
        return (
          <div
            key={idx}
            className="absolute pointer-events-none animate-float opacity-[0.06] text-emerald-200"
            style={{
              top,
              left,
              right,
              bottom,
              animationDelay: delay,
              animationDuration: duration,
            }}
          >
            <Icon size={size} style={{ transform: `rotate(${rotation}deg)` }} />
          </div>
        );
      })}

      {/* Login Card Container */}
      <div className="w-full max-w-md bg-[#0a5b42]/[0.82] backdrop-blur-xl border border-emerald-100/[0.15] rounded-2xl shadow-2xl shadow-emerald-950/[0.35] p-8 relative overflow-hidden animate-fade-up z-10">
        
        {/* Top orange gradient mechanical line */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-construction-500 via-construction-600 to-construction-400"></div>
        {/* Technical ruler notches */}
        <div className="absolute top-1 inset-x-0 h-2 flex justify-between px-6 pointer-events-none opacity-25">
          {[...Array(21)].map((_, i) => (
            <span key={i} className={`w-[1px] bg-white ${i % 5 === 0 ? 'h-2' : 'h-1'}`}></span>
          ))}
        </div>

        {/* Decorative blueprint coordinates in corners */}
        <span className="absolute top-3 left-3 text-[8px] font-mono text-navy-500 select-none">SYS_AUTH.v1.0</span>
        <span className="absolute top-3 right-3 text-[8px] font-mono text-navy-500 select-none">LAT_21.06</span>
        <span className="absolute bottom-3 left-3 text-[8px] font-mono text-navy-500 select-none">RAYJIN_HW</span>
        <span className="absolute bottom-3 right-3 text-[8px] font-mono text-navy-500 select-none">CONFIDENTIAL</span>

        <div className="text-center mt-4 mb-8">
          <div className="flex justify-center mb-4">
            <div 
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-construction-500 text-navy-950 shadow-lg shadow-construction-500/20"
              style={{ animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
            >
              <Wrench className="h-6 w-6" style={{ animation: 'spin 15s linear infinite' }} />
            </div>
          </div>
          <h2 className="text-3xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-white via-navy-100 to-white tracking-tight">Welcome Back</h2>
          <p className="text-navy-300 mt-2 text-sm">Enter your credentials to access the system</p>
        </div>


        {status === 'error' && (
          <div className="mb-6 p-4 bg-red-500/10 text-red-200 rounded-xl flex items-start gap-3 border border-red-500/20 animate-fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <p className="text-sm font-medium">{message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div className="group">
            <label className="block text-xs font-mono uppercase tracking-wider text-navy-300 mb-1.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-construction-500 opacity-60 group-focus-within:opacity-100 group-focus-within:animate-ping transition-all" />
              Username or Email
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400 group-focus-within:text-construction-500 transition-colors duration-200" />
              <input
                type="text"
                name="username"
                required
                value={formData.username}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-white/10 bg-[#064633]/[0.68] text-white placeholder-navy-500 focus:bg-[#064633]/[0.90] focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500 hover:border-white/20 focus:scale-[1.01] transition-all duration-200 ease-out outline-none"
                placeholder="johndoe123"
              />
            </div>
          </div>

          <div className="group">
            <label className="block text-xs font-mono uppercase tracking-wider text-navy-300 mb-1.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-construction-500 opacity-60 group-focus-within:opacity-100 group-focus-within:animate-ping transition-all" />
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400 group-focus-within:text-construction-500 transition-colors duration-200" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-11 pr-10 py-3 rounded-xl border border-white/10 bg-[#064633]/[0.68] text-white placeholder-navy-500 focus:bg-[#064633]/[0.90] focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500 hover:border-white/20 focus:scale-[1.01] transition-all duration-200 ease-out outline-none"
                placeholder="••••••••"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-navy-400 hover:text-construction-500 hover:scale-110 active:scale-90 transition-all duration-150 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 mb-4">
            <label className="flex items-center gap-2 text-sm text-navy-300 cursor-pointer select-none group">
              <input 
                type="checkbox" 
                className="rounded border-white/10 bg-[#064633]/[0.68] text-construction-500 focus:ring-construction-500 focus:ring-offset-[#0a5b42] transition-all duration-150 group-hover:scale-105" 
              />
              Remember me
            </label>
<Link
  to="/forgot-password"
  className="text-sm font-medium text-construction-400 hover:text-construction-300 hover:underline transition-colors"
>
  Forgot password?
</Link>          
</div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-3 px-4 bg-gradient-to-r from-construction-500 via-construction-600 to-construction-500 hover:from-construction-400 hover:via-construction-500 hover:to-construction-400 text-navy-950 font-bold uppercase tracking-wider text-sm rounded-xl shadow-lg shadow-construction-500/10 hover:shadow-construction-500/25 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {status === 'loading' ? 'Authenticating...' : 'Sign In'}
            </button>
          </div>

          {/* ── Divider ── */}
          <div className="relative flex items-center my-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="px-4 text-xs font-mono text-navy-500 uppercase tracking-widest">or continue with</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* ── Google Error ── */}
          {googleError && (
            <div className="mb-4 p-3 bg-red-500/10 text-red-200 rounded-xl flex items-start gap-2 border border-red-500/20 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <p className="text-xs font-medium">{googleError}</p>
            </div>
          )}

          {/* ── Google Sign-In Button ── */}
          <GoogleSignInButton mode="login" onError={(msg) => setGoogleError(msg)} />

          <p className="text-center text-sm text-navy-300 mt-6">
            Don't have an account? <Link to="/register/customer" className="font-semibold text-construction-400 hover:text-construction-300 hover:underline transition-colors">Sign up</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
