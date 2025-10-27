
import React from 'react';
import type { BatchHistoryEntry } from '../types';
import { CollectionIcon } from './icons/CollectionIcon';
import { TrashIcon } from './icons/TrashIcon';
import { UploadIcon } from './icons/UploadIcon';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  history: BatchHistoryEntry[];
  onLoadBatch: (id: string) => void;
  onDeleteBatch: (id: string) => void;
  currentBatchId?: string | null;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, onClose, history, onLoadBatch, onDeleteBatch, currentBatchId }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" 
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-gray-800 border border-gray-700 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Batch History</h2>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 rounded-full hover:bg-gray-700 hover:text-white"
            aria-label="Close history panel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4">
          {history.length === 0 ? (
            <div className="text-center py-12">
              <CollectionIcon className="w-12 h-12 mx-auto text-gray-500" />
              <h3 className="mt-2 text-lg font-medium text-gray-300">No Saved Batches</h3>
              <p className="mt-1 text-sm text-gray-500">Your saved batches will appear here.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {history.map((batch) => {
                const isCurrent = currentBatchId === batch.id;
                return (
                  <li 
                    key={batch.id} 
                    className={`p-3 rounded-lg flex items-center justify-between transition-colors ${
                      isCurrent 
                        ? 'bg-blue-900/50 border-l-4 border-blue-400' 
                        : 'bg-gray-700/50 hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate flex items-center gap-x-2" title={batch.name}>
                        <span>{batch.name}</span>
                         {isCurrent && (
                          <span className="inline-block px-2 py-0.5 text-xs font-bold text-blue-200 bg-blue-600/50 rounded-full">
                            Loaded
                          </span>
                        )}
                      </p>
                      <div className="text-xs text-gray-400 mt-1 flex items-center gap-x-3">
                        <span>{new Date(batch.timestamp).toLocaleString()}</span>
                        <span className="flex items-center gap-x-1">
                          <CollectionIcon className="w-3 h-3"/>
                          {batch.imageCount} image{batch.imageCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-x-2 ml-4">
                       <button
                          onClick={() => onLoadBatch(batch.id)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md transition-colors duration-200 flex items-center gap-x-1.5"
                          aria-label={`Load batch named ${batch.name}`}
                        >
                          <UploadIcon className="w-4 h-4" />
                          Load
                        </button>
                        <button
                          onClick={() => onDeleteBatch(batch.id)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors duration-200"
                          aria-label={`Delete batch named ${batch.name}`}
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </main>
      </div>
    </div>
  );
};
