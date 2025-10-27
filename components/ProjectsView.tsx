import React from 'react';
import type { BatchHistoryEntry } from '../types';
import { ProjectCard } from './ProjectCard';

interface ProjectsViewProps {
  projects: BatchHistoryEntry[];
  currentProjectId: string | null;
  onOpenProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onNewProject: () => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  currentProjectId,
  onOpenProject,
  onDeleteProject,
  onNewProject,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Your Projects</h1>
          <p className="text-gray-400 text-lg">
            Manage your vehicle photoshoots and 360° spins
          </p>
        </div>

        {/* New Project Button */}
        <div className="mb-8">
          <button
            onClick={onNewProject}
            className="inline-flex items-center gap-3 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-blue-500/50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create New Project
          </button>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-16 bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-700">
            <svg
              className="mx-auto h-16 w-16 text-gray-600 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No projects yet</h3>
            <p className="text-gray-500 mb-6">Create your first project to get started</p>
            <button
              onClick={onNewProject}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Start Your First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isActive={project.id === currentProjectId}
                onOpen={() => onOpenProject(project.id)}
                onDelete={() => onDeleteProject(project.id)}
              />
            ))}
          </div>
        )}

        {/* Stats Footer */}
        {projects.length > 0 && (
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-gray-800/50 rounded-xl p-6 text-center backdrop-blur">
              <div className="text-3xl font-bold text-blue-400 mb-1">
                {projects.length}
              </div>
              <div className="text-gray-400 text-sm">Total Projects</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-6 text-center backdrop-blur">
              <div className="text-3xl font-bold text-green-400 mb-1">
                {projects.reduce((sum, p) => sum + p.images.length, 0)}
              </div>
              <div className="text-gray-400 text-sm">Photos Processed</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-6 text-center backdrop-blur">
              <div className="text-3xl font-bold text-purple-400 mb-1">
                {projects.filter(p => p.images.some(img => img.spin360Index !== undefined)).length}
              </div>
              <div className="text-gray-400 text-sm">360° Spins</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
