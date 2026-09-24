import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');

  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setStatus('error');
      setMessage('Invalid password reset link.');
      return;
    }

    if (password.length < 8) {
      setStatus('error');
      setMessage('Password must contain at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await axios.post('/api/auth/reset-password', {
        token,
        password,
      });

      setStatus('success');
      setMessage(
        response.data.message ||
          'Your password has been successfully reset.'
      );

      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (error) {
      console.error(error);

      setStatus('error');

      if (axios.isAxiosError(error)) {
        setMessage(
          error.response?.data?.error ||
            'Unable to reset password. Please try again.'
        );
      } else {
        setMessage(
          'Unable to reset password. Please try again.'
        );
      }
    }
  };

  if (!token) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-[#064e3b] via-[#0b6044] to-[#07563e] flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-md bg-[#0a5b42] border border-emerald-100/[0.15] rounded-2xl shadow-2xl p-8 text-center">

          <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-5" />

          <h1 className="text-2xl font-bold text-white">
            Invalid Reset Link
          </h1>

          <p className="text-navy-300 mt-3">
            This password reset link is invalid or incomplete.
          </p>

          <Link
            to="/forgot-password"
            className="mt-7 inline-flex items-center gap-2 text-construction-400 hover:text-construction-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Request Another Link
          </Link>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-[#064e3b] via-[#0b6044] to-[#07563e] flex items-center justify-center px-4 py-20 relative overflow-hidden">

      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-construction-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">

        <div className="bg-[#0a5b42] border border-emerald-100/[0.15] rounded-2xl shadow-2xl overflow-hidden">

          <div className="h-1 bg-gradient-to-r from-construction-500 via-construction-600 to-construction-400" />

          <div className="p-8">

            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-construction-500/10 border border-construction-500/30 flex items-center justify-center">
                <Lock className="w-8 h-8 text-construction-500" />
              </div>
            </div>

            <div className="text-center mb-8">

              <h1 className="text-3xl font-bold text-white">
                Create New Password
              </h1>

              <p className="text-navy-300 mt-2 text-sm">
                Enter a new password for your Rayjin Hardware account.
              </p>

            </div>

            {status === 'success' ? (
              <div className="space-y-5">

                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex gap-3">

                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />

                  <div>
                    <p className="text-green-300 font-medium">
                      Password Reset Successful
                    </p>

                    <p className="text-green-200/70 text-sm mt-1">
                      {message}
                    </p>
                  </div>

                </div>

                <p className="text-center text-sm text-navy-400">
                  Redirecting you to the login page...
                </p>

              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >

                <div>

                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-navy-200 mb-2"
                  >
                    New Password
                  </label>

                  <div className="relative">

                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />

                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                      placeholder="Enter new password"
                      autoComplete="new-password"
                      required
                      className="w-full pl-11 pr-12 py-3 bg-[#064633]/[0.76] border border-white/10 rounded-xl text-white placeholder:text-navy-500 focus:outline-none focus:border-construction-500 focus:ring-1 focus:ring-construction-500"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(!showPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-white"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>

                  </div>

                  <p className="text-xs text-navy-500 mt-2">
                    Minimum of 8 characters.
                  </p>

                </div>

                <div>

                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-navy-200 mb-2"
                  >
                    Confirm New Password
                  </label>

                  <div className="relative">

                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />

                    <input
                      id="confirmPassword"
                      type={
                        showConfirmPassword
                          ? 'text'
                          : 'password'
                      }
                      value={confirmPassword}
                      onChange={(e) =>
                        setConfirmPassword(e.target.value)
                      }
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                      required
                      className="w-full pl-11 pr-12 py-3 bg-[#064633]/[0.76] border border-white/10 rounded-xl text-white placeholder:text-navy-500 focus:outline-none focus:border-construction-500 focus:ring-1 focus:ring-construction-500"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          !showConfirmPassword
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-white"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>

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
                      Resetting Password...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </button>

              </form>
            )}

            <div className="mt-7 pt-6 border-t border-white/10 text-center">

              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-construction-400 hover:text-construction-300"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>

            </div>

          </div>
        </div>

        <p className="text-center text-xs text-navy-500 mt-5">
          Rayjin Hardware • Secure Password Reset
        </p>

      </div>
    </div>
  );
}