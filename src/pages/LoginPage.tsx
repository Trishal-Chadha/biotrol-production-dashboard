import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, AlertCircle, UserPlus, CheckCircle, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../lib/auth';
import type { UserRole } from '../lib/auth';
import { supabase } from '../lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSetupForm, setShowSetupForm] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState<string | null>(null);

  const { signIn, signUp, error } = useAuth();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setForgotPasswordError('Please enter your email address.');
      return;
    }
    setForgotPasswordLoading(true);
    setForgotPasswordError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    setForgotPasswordLoading(false);
    if (resetError) {
      setForgotPasswordError(resetError.message);
    } else {
      setForgotPasswordSent(true);
    }
  };

  const validateLoginForm = (): boolean => {
    const errors: typeof validationErrors = {};
    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateSetupForm = (): boolean => {
    const errors: typeof validationErrors = {};
    if (!fullName.trim()) {
      errors.fullName = 'Full name is required';
    }
    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLoginForm()) return;
    setIsSubmitting(true);
    await signIn(email, password);
    setIsSubmitting(false);
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSetupForm()) return;
    setIsSubmitting(true);
    const result = await signUp(email, password, role, fullName);
    setIsSubmitting(false);
    if (!result.error) {
      setShowSetupForm(false);
    }
  };

  const switchToSignIn = () => {
    setShowSetupForm(false);
    setValidationErrors({});
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setRole('employee');
  };

  const switchToCreate = () => {
    setShowSetupForm(true);
    setValidationErrors({});
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setRole('employee');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(59,130,246,0.15)_1px,transparent_0)] bg-[size:24px_24px]" />

      <div className="w-full max-w-md relative">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-blue-200/40 border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0f2744] to-[#1a3a5c] px-8 py-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <img src="/logo.png" alt="Biotrol Laboratories Pvt. Ltd." className="h-14 w-auto object-contain" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">BIOTROL</h1>
            <p className="text-blue-200 text-xs font-medium tracking-wider mt-1">PROFESSIONAL</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            {showSetupForm ? (
              <>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-full mb-3">
                    <UserPlus size={24} className="text-blue-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-800">Create Account</h2>
                  <p className="text-sm text-gray-500 mt-1">Register a new account</p>
                </div>

                <form onSubmit={handleSetup} className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (validationErrors.fullName) setValidationErrors((prev) => ({ ...prev, fullName: undefined }));
                        }}
                        className={`w-full pl-10 pr-4 py-2.5 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2 ${
                          validationErrors.fullName
                            ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400'
                            : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'
                        }`}
                        placeholder="John Doe"
                      />
                    </div>
                    {validationErrors.fullName && (
                      <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={12} /> {validationErrors.fullName}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (validationErrors.email) setValidationErrors((prev) => ({ ...prev, email: undefined }));
                        }}
                        className={`w-full pl-10 pr-4 py-2.5 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2 ${
                          validationErrors.email
                            ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400'
                            : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'
                        }`}
                        placeholder="you@company.com"
                      />
                    </div>
                    {validationErrors.email && (
                      <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={12} /> {validationErrors.email}
                      </p>
                    )}
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      Role
                    </label>
                    <div className="relative">
                      <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as UserRole)}
                        className="w-full pl-4 pr-10 py-2.5 text-sm border border-gray-200 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 appearance-none bg-white cursor-pointer"
                      >
                        <option value="admin">Admin</option>
                        <option value="employee">Employee</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (validationErrors.password) setValidationErrors((prev) => ({ ...prev, password: undefined }));
                        }}
                        className={`w-full pl-10 pr-11 py-2.5 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2 ${
                          validationErrors.password
                            ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400'
                            : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'
                        }`}
                        placeholder="Create a password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {validationErrors.password && (
                      <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={12} /> {validationErrors.password}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (validationErrors.confirmPassword) setValidationErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                        }}
                        className={`w-full pl-10 pr-11 py-2.5 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2 ${
                          validationErrors.confirmPassword
                            ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400'
                            : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'
                        }`}
                        placeholder="Confirm password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {validationErrors.confirmPassword && (
                      <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={12} /> {validationErrors.confirmPassword}
                      </p>
                    )}
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                      <AlertCircle size={16} className="flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-2.5 rounded-lg transition-all shadow-sm shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </button>

                  <p className="text-center text-sm text-gray-500 pt-1">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={switchToSignIn}
                      className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                    >
                      Sign In
                    </button>
                  </p>
                </form>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-800">Welcome Back</h2>
                  <p className="text-sm text-gray-500 mt-1">Sign in to your account to continue</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (validationErrors.email) setValidationErrors((prev) => ({ ...prev, email: undefined }));
                        }}
                        className={`w-full pl-10 pr-4 py-2.5 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2 ${
                          validationErrors.email
                            ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400'
                            : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'
                        }`}
                        placeholder="you@company.com"
                        autoFocus
                      />
                    </div>
                    {validationErrors.email && (
                      <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={12} /> {validationErrors.email}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (validationErrors.password) setValidationErrors((prev) => ({ ...prev, password: undefined }));
                        }}
                        className={`w-full pl-10 pr-11 py-2.5 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2 ${
                          validationErrors.password
                            ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400'
                            : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'
                        }`}
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {validationErrors.password && (
                      <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={12} /> {validationErrors.password}
                      </p>
                    )}
                  </div>

                  {/* Remember Me + Forgot Password */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                      />
                      <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">
                        Remember me
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => { setForgotPasswordMode(true); setForgotPasswordSent(false); setForgotPasswordError(null); }}
                      className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                      <AlertCircle size={16} className="flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-2.5 rounded-lg transition-all shadow-sm shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </button>

                  <p className="text-center text-sm text-gray-500 pt-1">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={switchToCreate}
                      className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                    >
                      Create an Account
                    </button>
                  </p>
                </form>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              &copy; {new Date().getFullYear()} Biotrol Professional. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotPasswordMode && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm p-8 relative">
            {forgotPasswordSent ? (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-green-50 rounded-full mb-4">
                  <CheckCircle size={28} className="text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Check Your Email</h3>
                <p className="text-sm text-gray-500 mb-6">
                  If an account exists for <span className="font-medium text-gray-700">{email}</span>, a password reset link has been sent.
                </p>
                <button
                  onClick={() => { setForgotPasswordMode(false); setForgotPasswordSent(false); }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-all"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-full mb-3">
                    <Mail size={22} className="text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">Reset Password</h3>
                  <p className="text-sm text-gray-500 mt-1">Enter your email to receive a reset link</p>
                </div>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setForgotPasswordError(null); }}
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        placeholder="you@company.com"
                        autoFocus
                      />
                    </div>
                    {forgotPasswordError && (
                      <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={12} /> {forgotPasswordError}
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={forgotPasswordLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {forgotPasswordLoading ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</>
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForgotPasswordMode(false)}
                    className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors py-1"
                  >
                    Back to Sign In
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
