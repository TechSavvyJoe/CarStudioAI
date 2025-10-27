import React from 'react';
import type { BatchHistoryEntry } from '../types';

interface ProjectCardProps {
  project: BatchHistoryEntry;
  onOpen: () => void;
  onDelete: () => void;
  isActive?: boolean;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onOpen,
  onDelete,
  isActive = false,
}) => {
  // Get thumbnail from first image or use placeholder
  const thumbnailUrl = project.images[0]?.processedUrl || project.images[0]?.originalUrl;
  const imageCount = project.images.length;
  const date = new Date(project.timestamp);
  const formattedDate = date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric' 
  });

  return (
    <div
      className={`group relative bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:scale-[1.02] cursor-pointer border border-gray-700/50 ${
        isActive ? 'ring-2 ring-blue-500 shadow-xl shadow-blue-500/20' : ''
      }`}
      onClick={onOpen}
    >
      {/* Thumbnail */}
      <div className="aspect-[4/3] bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden relative">
        {thumbnailUrl ? (
          <>
            <img
              src={thumbnailUrl}
              alt={project.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Active Badge */}
      {isActive && (
        <div className="absolute top-4 left-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg backdrop-blur-sm">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          Active
        </div>
      )}

      {/* Info Section */}
      <div className="p-5">
        <h3 className="text-white font-semibold text-lg mb-2 truncate group-hover:text-blue-400 transition-colors duration-200">
          {project.name}
        </h3>
        
        <div className="flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {imageCount} {imageCount === 1 ? 'photo' : 'photos'}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {formattedDate}
            </span>
          </div>
        </div>
      </div>

      {/* Hover Actions */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-200 flex gap-2 transform translate-y-1 group-hover:translate-y-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white p-2.5 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-110"
          aria-label="Delete project"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>

      {/* Processing Status Overlay */}
      {project.images.some(img => img.status === 'processing') && (
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 to-black/60 backdrop-blur-md flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-3 border-blue-500 mb-3"></div>
            <p className="text-white text-sm font-semibold">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
};
