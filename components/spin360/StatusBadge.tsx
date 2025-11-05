import React from 'react';

type StatusVariant = 'ok' | 'warn' | 'info';

const badgeVariants: Record<StatusVariant, string> = {
  ok: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
  warn: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
  info: 'border-blue-400/40 bg-blue-500/10 text-blue-100',
};

interface StatusBadgeProps {
  label: string;
  value: string;
  variant?: StatusVariant;
  icon?: React.ReactNode;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, value, variant = 'info', icon }) => (
  <div className={`pointer-events-none rounded-full border px-3 py-1 text-[11px] font-medium backdrop-blur-sm ${badgeVariants[variant]}`}>
    <span className="mr-1 text-white/50">{label}:</span>
    {icon && <span className="mr-1 inline-flex items-center align-middle">{icon}</span>}
    <span>{value}</span>
  </div>
);
