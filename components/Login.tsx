import React, { useState } from 'react';
import { signInWithEmail, signUpWithEmail } from '../services/auth';
import { logger } from '../utils/logger';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    logger.log('[Login] Form submitted, mode:', mode, 'email:', email);
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      if (mode === 'signin') {
        logger.log('[Login] Attempting sign in...');
        await signInWithEmail(email, password);
        logger.log('[Login] Sign in successful');
        // Success - AuthProvider will handle the state update
      } else {
        logger.log('[Login] Attempting sign up...');
        const result = await signUpWithEmail(email, password);
        logger.log('[Login] Signup result:', result);
        // Check if email confirmation is required
        if (result.user && !result.session) {
          logger.log('[Login] Email confirmation required');
          setSuccessMessage('Account created! Check your email to confirm your account, then sign in.');
          setMode('signin');
        } else if (result.user && result.session) {
          logger.log('[Login] User auto-confirmed and logged in');
          setSuccessMessage('Account created successfully! Logging you in...');
          // If auto-confirmed, user will be logged in automatically via AuthProvider
        } else {
          logger.warn('[Login] Unexpected signup result:', result);
          setSuccessMessage('Account created! You can now sign in.');
          setMode('signin');
        }
      }
    } catch (err) {
      logger.error('[Login] Error during auth:', err);
      const message = err instanceof Error ? err.message : 'Authentication failed';
      // Make error messages more user-friendly
      if (message.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again or create a new account.');
      } else if (message.includes('Email not confirmed')) {
        setError('Please check your email and confirm your account before signing in.');
      } else if (message.includes('User already registered')) {
        setError('An account with this email already exists. Please sign in instead.');
        setMode('signin');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="w-full max-w-md bg-gray-800/70 p-6 rounded-2xl border border-gray-700">
        <h1 className="text-2xl font-bold mb-4">{mode === 'signin' ? 'Sign in' : 'Create account'}</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2"
            required
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          {successMessage && <p className="text-sm text-green-400">{successMessage}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
          >
            {loading ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        </form>
        <button
          className="mt-4 text-sm text-gray-300 hover:text-white"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError(null);
            setSuccessMessage(null);
          }}
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Have an account? Sign in'}
        </button>

        {/* Help text */}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-400 text-center">
            {mode === 'signin'
              ? 'First time? Click "Sign up" to create an account. The first user becomes admin automatically.'
              : 'Password must be at least 6 characters long.'}
          </p>
        </div>
      </div>
    </div>
  );
};
