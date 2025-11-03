import React from 'react';
import { getSupabaseEnvIssues } from '../services/auth';
import { ErrorIcon } from './icons/ErrorIcon';

/**
 * Shows a small banner if Supabase env vars are misconfigured.
 * Non-intrusive; appears below the header area.
 */
export const EnvWarning: React.FC = () => {
  const issues = getSupabaseEnvIssues();
  if (!issues.length) return null;

  return (
    <div className="bg-red-900/25 border-y border-red-700">
      <div className="container mx-auto px-4 py-2 flex gap-2 items-start text-red-200 text-sm">
        <ErrorIcon className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
        <div>
          <p className="font-medium">Supabase configuration issue</p>
          <ul className="list-disc list-inside">
            {issues.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
          <p className="mt-1 opacity-80">
            Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel (Production & Preview) to resolve this.
          </p>
        </div>
      </div>
    </div>
  );
};
