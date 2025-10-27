
import React from 'react';
import { CollectionIcon } from './icons/CollectionIcon';
import { CheckIcon } from './icons/CheckIcon';
import { ErrorIcon } from './icons/ErrorIcon';
import { ClockIcon } from './icons/ClockIcon';

interface QueueStatusProps {
  stats: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
  };
}

const StatusItem: React.FC<{ icon: React.ReactNode; label: string; value: number; colorClass: string }> = ({ icon, label, value, colorClass }) => (
  <div className="flex items-center gap-x-2">
    <div className={`p-1.5 rounded-full ${colorClass}`}>
      {icon}
    </div>
    <div>
      <span className="font-bold text-lg text-white">{value}</span>
      <span className="text-sm text-gray-400 ml-1.5">{label}</span>
    </div>
  </div>
);

export const QueueStatus: React.FC<QueueStatusProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700 mb-6">
      <StatusItem
        icon={<CollectionIcon className="w-5 h-5 text-gray-200" />}
        label="Total"
        value={stats.total}
        colorClass="bg-gray-600/50"
      />
      <StatusItem
        icon={<CheckIcon className="w-5 h-5 text-green-300" />}
        label="Completed"
        value={stats.completed}
        colorClass="bg-green-500/20"
      />
      <StatusItem
        icon={<ErrorIcon className="w-5 h-5 text-red-400" />}
        label="Failed"
        value={stats.failed}
        colorClass="bg-red-500/20"
      />
      <StatusItem
        icon={<ClockIcon className="w-5 h-5 text-yellow-400" />}
        label="Pending"
        value={stats.pending}
        colorClass="bg-yellow-500/20"
      />
    </div>
  );
};
