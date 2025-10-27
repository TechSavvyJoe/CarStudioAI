

import React from 'react';
import { CameraIcon } from './icons/CameraIcon';

interface HeaderProps {
  viewMode?: 'projects' | 'queue';
  onViewChange?: (mode: 'projects' | 'queue') => void;
}

export const Header: React.FC<HeaderProps> = ({ viewMode = 'queue', onViewChange }) => {
  return (
    <header className="relative py-3 sm:py-6 border-b border-gray-700/30 bg-gradient-to-b from-gray-900 via-gray-900/95 to-gray-900/50 backdrop-blur-xl sticky top-0 z-20 shadow-2xl">
      <div className="container mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20 flex-shrink-0">
              <CameraIcon className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl md:text-3xl font-bold tracking-tight text-white truncate">
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">CarStudioAI</span>
              </h1>
              <p className="hidden sm:block text-gray-400 text-xs sm:text-sm mt-0.5 sm:mt-1">Professional car photos instantly</p>
            </div>
          </div>

          {/* View Switcher */}
          {onViewChange && (
            <div className="flex items-center gap-1 sm:gap-1.5 bg-gray-800/80 p-1 sm:p-1.5 rounded-lg sm:rounded-xl backdrop-blur-sm shadow-lg border border-gray-700/50 flex-shrink-0">
              <button
                onClick={() => onViewChange('projects')}
                className={`px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                  viewMode === 'projects'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-1 sm:gap-2">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    />
                  </svg>
                  <span className="hidden xs:inline">Projects</span>
                </div>
              </button>
              <button
                onClick={() => onViewChange('queue')}
                className={`px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                  viewMode === 'queue'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-1 sm:gap-2">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="hidden xs:inline">Queue</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

