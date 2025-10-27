
import React from 'react';
import { HistoryIcon } from './icons/HistoryIcon';

interface HistoryButtonProps {
  onClick: () => void;
  count: number;
}

export const HistoryButton: React.FC<HistoryButtonProps> = ({ onClick, count }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-20 w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-300 ease-in-out transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-500/50 flex items-center justify-center"
      aria-label="View batch history"
    >
      <HistoryIcon className="w-8 h-8" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
          {count}
        </span>
      )}
    </button>
  );
};
