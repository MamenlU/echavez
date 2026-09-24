import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  Mail,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setStatus('error');
      setMessage('Please enter your email address.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await axios.post('/api/auth/forgot-password', {
        email: email.trim(),
      });

      setStatus('success');
      setMessage(
        response.data.message ||
          'If an account exists with that email, a password reset link has been sent.'
      );
    } catch (error) {
      console.error(error);

      setStatus('error');

      if (axios.isAxiosError(error)) {
        setMessage(
          error.response?.data?.error ||
            'Unable to send password reset email. Please try again.'
        );
      } else {
        setMessage(
          'Unable to send password reset email. Please try again.'
        );
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-[#064e3b] via-[#0b6044] to-[#07563e] flex items-center justify-center px-4 py-20 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-construction-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(56, 189, 248, 0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56, 189, 248, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-[#0a5b42] border border-emerald-100/[0.15] rounded-2xl shadow-2xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-construction-500 via-construction-600 to-construction-400" />

          <div className="p-8">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-construction-500/10 border border-construction-500/30 flex items-center justify-center">
                <Mail className="w-8 h-8 text-construction-500" />
              </div>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white">
                Forgot Password?
              </h1>

              <p className="text-navy-300 mt-2 text-sm leading-relaxed">
                Enter the email address associated with your Rayjin Hardware
                account and we'll send you a password reset link.
              </p>
            </div>

            {status === 'success' ? (
              <div className="space-y-6">
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />

                  <div>
                    <p className="text-green-300 font-medium">
                      Check your email
                    </p>

                    <p className="text-green-200/70 text-sm mt-1">
                      {message}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-navy-400 text-center">
                  The password reset link will expire after 15 minutes.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setStatus('idle');
                    setMessage('');
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-construction-500 hover:bg-construction-600 text-white font-semibold transition-colors"
                >
                  Send Another Link
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-navy-200 mb-2"
                  >
                    Email Address
                  </label>

                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />

                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your registered email"
                      autoComplete="email"
                      required
                      className="w-full pl-11 pr-4 py-3 bg-[#064633]/[0.76] border border-white/10 rounded-xl text-white placeholder:text-navy-500 focus:outline-none focus:border-construction-500 focus:ring-1 focus:ring-construction-500 transition-all"
                    />
                  </div>
                </div>

                {status === 'error' && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />

                    <p className="text-red-300 text-sm">
                      {message}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full py-3 px-4 rounded-xl bg-construction-500 hover:bg-construction-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold transition-all flex items-center justify-center gap-2"
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>
            )}

            <div className="mt-7 pt-6 border-t border-white/10 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-construction-400 hover:text-construction-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-navy-500 mt-5">
          Rayjin Hardware • Account Recovery
        </p>
      </div>
    </div>
  );
}