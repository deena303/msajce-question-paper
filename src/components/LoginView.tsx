import React, { useState } from 'react';
import { Eye, EyeOff, X, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import loginLogo from '../img/login-logo.png';

export const LoginView: React.FC = () => {
  const { login, setActiveTab } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Privacy modal
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setLoginError('Please enter your email and password.');
      return;
    }

    setIsSubmitting(true);
    setLoginError(null);

    try {
      await login(email.trim(), password);
      // Navigation is handled by App.tsx once isAuthenticated is true
    } catch (err: any) {
      setLoginError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMeetTeamClick = () => {
    // Navigate to the Meet the Team page after logging in isn't possible from login
    // So we show a note here — but after login, the button in Sidebar navigates to it
    // For the login page, open it as a pre-auth page
    setActiveTab('meet-the-team-login');
  };

  return (
    <div className="min-h-screen w-full bg-[#edf2f7] flex flex-col items-center justify-center p-4 sm:p-6 relative select-none">

      {/* College Shield Emblem Badge (Floating atop card) */}
      <div className="relative w-full max-w-[440px]">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-10">
          <div className="w-24 h-24 rounded-full bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.12)] border border-slate-100 flex items-center justify-center transition-transform duration-300 hover:scale-105 overflow-hidden">
            <img
              src={loginLogo}
              alt="MSAJCE Institution Logo"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Main Card Container */}
        <div className="w-full bg-white rounded-[32px] border border-slate-200/90 shadow-[0_12px_40px_-8px_rgba(15,23,42,0.08)] px-8 sm:px-10 pt-16 pb-8 transition-all duration-300">

          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-[27px] font-bold text-slate-800 tracking-tight">
              Sign in
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1.5">
              Use your institutional account credentials
            </p>
          </div>

          {/* Login Error Banner */}
          {loginError && (
            <div className="mb-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <span className="mt-0.5 text-rose-500 shrink-0">⚠</span>
              <p className="text-xs font-semibold text-rose-700 leading-relaxed">{loginError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email Address */}
            <div>
              <label htmlFor="login-email" className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setLoginError(null); }}
                placeholder="@msajce-edu.in"
                className="w-full rounded-2xl border border-slate-200 bg-[#f4f7fb] text-slate-800 px-4 py-3 text-sm font-medium focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100 focus:outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-xs sm:text-sm font-semibold text-slate-700">
                  Password
                </label>
              </div>

              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setLoginError(null); }}
                  placeholder="Enter password"
                  className="w-full rounded-2xl border border-slate-200 bg-[#eef3fb] text-slate-800 px-4 py-3 text-sm font-medium tracking-wider focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100 focus:outline-none transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3.5 px-6 rounded-full bg-[#d91b42] hover:bg-[#c01538] active:scale-[0.98] text-white font-bold text-sm sm:text-base shadow-lg shadow-rose-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75"
            >
              <span>{isSubmitting ? 'Signing in...' : 'Sign in'}</span>
            </button>
          </form>

          {/* Security note & Footer inside card */}
          <div className="mt-8 pt-5 text-center border-t border-slate-100">
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <span>🔒</span> Secured login
              </span>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(true)}
                className="text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
              >
                Privacy
              </button>
            </div>

            <button
              type="button"
              onClick={handleMeetTeamClick}
              className="mt-2 text-xs font-bold text-[#d91b42] hover:text-[#b01435] hover:underline cursor-pointer inline-block"
            >
              Meet the team
            </button>
          </div>
        </div>

        {/* Outer Page Copyright */}
        <div className="mt-5 text-center text-xs text-slate-500 font-medium">
          © 2025 Mohamed Sathak A.J. College of Engineering
        </div>
      </div>

      {/* Privacy Modal Dialog */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-[#d91b42]">
                  <Info className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">
                  Institutional Privacy &amp; Security Policy
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-4 text-sm text-slate-600 leading-relaxed">
              Access is strictly monitored under Mohamed Sathak A. J. College of Engineering IT security protocols.
              Unauthorized access attempts are recorded and subject to academic disciplinary and legal action.
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="rounded-full bg-slate-800 hover:bg-slate-900 px-5 py-2 text-xs font-bold text-white transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
