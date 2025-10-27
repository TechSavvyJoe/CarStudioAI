

import React from 'react';
import { CameraIcon } from './icons/CameraIcon';

interface HeaderProps {
  viewMode?: 'projects' | 'queue';
  onViewChange?: (mode: 'projects' | 'queue') => void;
}

export const Header: React.FC<HeaderProps> = ({ viewMode = 'queue', onViewChange }) => {
  return (
    <header className="relative py-6 border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CameraIcon className="w-8 h-8 mr-3 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">
                Auto Background <span className="text-blue-400">Studio</span>
              </h1>
              <p className="text-gray-400 text-sm mt-1">Instantly upgrade your car photos to a professional studio setting.</p>
            </div>
          </div>

          {/* View Switcher */}
          {onViewChange && (
            <div className="flex items-center gap-2 bg-gray-800 p-1 rounded-lg">
              <button
                onClick={() => onViewChange('projects')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'projects'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    />
                  </svg>
                  Projects
                </div>
              </button>
              <button
                onClick={() => onViewChange('queue')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'queue'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Queue
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

