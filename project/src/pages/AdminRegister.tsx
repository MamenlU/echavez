import React, { useState } from 'react';
import axios from 'axios';
import { User, Mail, Lock, CheckCircle, AlertCircle, ShieldAlert, Phone, Eye, EyeOff } from 'lucide-react';
import { useReveal } from '../hooks/useReveal';
import { Link } from 'react-router-dom';

export function AdminRegister() {
  const ref = useReveal<HTMLDivElement>();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    phone_number: '',
    password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  setStatus('idle');
  setMessage('');

  if (formData.password !== formData.confirm_password) {
    setStatus('error');
    setMessage('Passwords do not match. Please try again.');
    return;
  }

  setStatus('loading');

  try {
    const dataToSubmit = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      username: formData.username,
      email: formData.email,
      phone_number: formData.phone_number,
      password: formData.password,
    };

    await axios.post('/api/auth/register', {
      ...dataToSubmit,
      role: 'admin',
    });

    setStatus('success');
    setMessage('Admin account created successfully.');

    setFormData({
      first_name: '',
      last_name: '',
      username: '',
      email: '',
      phone_number: '',
      password: '',
      confirm_password: '',
    });
  } catch (err: unknown) {
    setStatus('error');

    const errorMessage =
      axios.isAxiosError<{ error?: string }>(err)
        ? err.response?.data?.error
        : undefined;

    setMessage(
      errorMessage ||
        'An error occurred during registration.'
    );
  }
};

  return (
    <div ref={ref} className="max-w-xl mx-auto mt-16 mb-24 bg-steel-900/95 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-steel-700/50 relative overflow-hidden animate-fade-up">
      <div className="absolute top-0 right-0 w-32 h-32 bg-construction-500/20 rounded-bl-full blur-2xl animate-fade-in animation-fill-both animation-delay-200"></div>
      
      <div className="text-center mb-8 flex flex-col items-center animate-fade-up animation-fill-both animation-delay-75">
        <div className="w-12 h-12 bg-construction-500/20 rounded-full flex items-center justify-center mb-3">
          <ShieldAlert className="w-6 h-6 text-construction-500" />
        </div>
        <h2 className="text-3xl font-bold text-white">Admin Registration</h2>
        <p className="text-steel-400 mt-2">Secure access for system administrators</p>
      </div>

      {status === 'success' && (
        <div className="mb-6 p-4 bg-green-500/10 text-green-400 rounded-xl flex items-start gap-3 border border-green-500/20 animate-fade-in">
          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{message}</p>
        </div>
      )}

      {status === 'error' && (
        <div className="mb-6 p-4 bg-red-500/10 text-red-400 rounded-xl flex items-start gap-3 border border-red-500/20 animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-up animation-fill-both animation-delay-100">
          <div>
            <label className="block text-sm font-medium text-steel-300 mb-1">First Name</label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-steel-700 bg-steel-800/50 text-white focus:bg-steel-800 focus:ring-2 focus:ring-construction-500/30 focus:border-construction-500 hover:border-steel-600 focus:scale-[1.01] focus:shadow-md focus:shadow-construction-500/5 transition-all duration-200 ease-out outline-none placeholder:text-steel-600"
              placeholder="Admin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-steel-300 mb-1">Last Name</label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-steel-700 bg-steel-800/50 text-white focus:bg-steel-800 focus:ring-2 focus:ring-construction-500/30 focus:border-construction-500 hover:border-steel-600 focus:scale-[1.01] focus:shadow-md focus:shadow-construction-500/5 transition-all duration-200 ease-out outline-none placeholder:text-steel-600"
              placeholder="User"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-up animation-fill-both animation-delay-150">
          <div>
            <label className="block text-sm font-medium text-steel-300 mb-1">Username <span className="text-red-500">*</span></label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-steel-500" />
              <input
                type="text"
                name="username"
                required
                value={formData.username}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-steel-700 bg-steel-800/50 text-white focus:bg-steel-800 focus:ring-2 focus:ring-construction-500/30 focus:border-construction-500 hover:border-steel-600 focus:scale-[1.01] focus:shadow-md focus:shadow-construction-500/5 transition-all duration-200 ease-out outline-none placeholder:text-steel-600"
                placeholder="admin_sys"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-steel-300 mb-1">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-steel-500" />
              <input
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-steel-700 bg-steel-800/50 text-white focus:bg-steel-800 focus:ring-2 focus:ring-construction-500/30 focus:border-construction-500 hover:border-steel-600 focus:scale-[1.01] focus:shadow-md focus:shadow-construction-500/5 transition-all duration-200 ease-out outline-none placeholder:text-steel-600"
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
        </div>

        <div className="animate-fade-up animation-fill-both animation-delay-200">
          <label className="block text-sm font-medium text-steel-300 mb-1">Email Address <span className="text-red-500">*</span></label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-steel-500" />
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-steel-700 bg-steel-800/50 text-white focus:bg-steel-800 focus:ring-2 focus:ring-construction-500/30 focus:border-construction-500 hover:border-steel-600 focus:scale-[1.01] focus:shadow-md focus:shadow-construction-500/5 transition-all duration-200 ease-out outline-none placeholder:text-steel-600"
              placeholder="admin@system.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-up animation-fill-both animation-delay-250">
          <div>
            <label className="block text-sm font-medium text-steel-300 mb-1">Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-steel-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-steel-700 bg-steel-800/50 text-white focus:bg-steel-800 focus:ring-2 focus:ring-construction-500/30 focus:border-construction-500 hover:border-steel-600 focus:scale-[1.01] focus:shadow-md focus:shadow-construction-500/5 transition-all duration-200 ease-out outline-none placeholder:text-steel-600"
                placeholder="••••••••"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-500 hover:text-construction-500 hover:scale-110 active:scale-90 transition-all duration-150 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-steel-300 mb-1">Confirm Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-steel-500" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirm_password"
                required
                value={formData.confirm_password}
                onChange={handleChange}
                className={`w-full pl-10 pr-10 py-2.5 rounded-xl border ${formData.password && formData.confirm_password && formData.password !== formData.confirm_password ? 'border-red-500/50 focus:ring-red-500/30 focus:border-red-500' : 'border-steel-700 focus:ring-construction-500/30 focus:border-construction-500 hover:border-steel-600'} bg-steel-800/50 text-white focus:bg-steel-800 focus:ring-2 focus:scale-[1.01] focus:shadow-md transition-all duration-200 ease-out outline-none placeholder:text-steel-600`}
                placeholder="••••••••"
              />
              <button 
                type="button" 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-500 hover:text-construction-500 hover:scale-110 active:scale-90 transition-all duration-150 focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="animate-fade-up animation-fill-both animation-delay-300 pt-2">
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full py-3 px-4 bg-gradient-to-r from-construction-600 to-construction-500 hover:from-construction-500 hover:to-construction-400 text-white font-semibold rounded-xl shadow-lg shadow-construction-500/25 hover:shadow-construction-500/35 hover:-translate-y-0.5 hover:scale-[1.01] active:scale-[0.97] transition-all duration-200 ease-out transform disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none disabled:scale-100"
          >
            {status === 'loading' ? 'Processing...' : 'Register Administrator'}
          </button>
        </div>

        <p className="text-center text-sm text-steel-400 mt-6 animate-fade-up animation-fill-both animation-delay-400">
          Already have an account? <Link to="/login" className="font-semibold text-construction-500 hover:text-construction-600 hover:underline transition-all">Log in</Link>
        </p>
      </form>
    </div>
  );
}