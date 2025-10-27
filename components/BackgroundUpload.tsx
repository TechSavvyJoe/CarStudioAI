import React, { useCallback, useState } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ErrorIcon } from './icons/ErrorIcon';
import type { DealershipBackground } from '../types';

interface BackgroundUploadProps {
  currentBackground: DealershipBackground | null;
  onBackgroundSelected: (file: File) => void;
  onBackgroundRemoved: () => void;
  isProcessing: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_FILE_SIZE = 10 * 1024; // 10KB

const validateFile = (file: File): { valid: boolean; error?: string } => {
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'Please select an image file.' };
  }

  if (file.size === 0) {
    return { valid: false, error: 'The file is empty. Please select a valid image.' };
  }

  if (file.size < MIN_FILE_SIZE) {
    const sizeMB = (MIN_FILE_SIZE / 1024).toFixed(0);
    return { valid: false, error: `File size must be at least ${sizeMB}KB.` };
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = Math.round(MAX_FILE_SIZE / 1024 / 1024);
    return { valid: false, error: `File size must be less than ${sizeMB}MB. Your file is ${Math.round(file.size / 1024 / 1024)}MB.` };
  }

  return { valid: true };
};

export const BackgroundUpload: React.FC<BackgroundUploadProps> = ({
  currentBackground,
  onBackgroundSelected,
  onBackgroundRemoved,
  isProcessing,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) {
      setIsDragging(true);
    }
  }, [isProcessing]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }, [isProcessing]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setError(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && !isProcessing) {
      const file = e.dataTransfer.files[0];
      const validation = validateFile(file);
      if (validation.valid) {
        onBackgroundSelected(file);
      } else {
        setError(validation.error || 'Invalid file');
      }
    }
  }, [onBackgroundSelected, isProcessing]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files.length > 0 && !isProcessing) {
      const file = e.target.files[0];
      const validation = validateFile(file);
      if (validation.valid) {
        onBackgroundSelected(file);
      } else {
        setError(validation.error || 'Invalid file');
      }
      e.target.value = '';
    }
  };

  const dragDropClasses = isDragging
    ? 'border-solid border-green-400 bg-green-900/50 ring-4 ring-green-500/30'
    : 'border-dashed border-gray-600 hover:border-green-500 hover:bg-gray-700/50';

  const disabledClasses = isProcessing ? 'opacity-50 cursor-not-allowed' : '';

  if (currentBackground) {
    return (
      <div className={`bg-gray-800 rounded-lg border-2 border-gray-700 p-3 ${disabledClasses}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-200">Dealership Background</h3>
          <button
            type="button"
            onClick={onBackgroundRemoved}
            disabled={isProcessing}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white transition-colors"
            title="Remove background"
            aria-label="Remove dealership background"
          >
            <TrashIcon className="w-3 h-3" />
            Remove
          </button>
        </div>
        <div className="relative w-full aspect-[21/9] rounded overflow-hidden bg-gray-900 border border-gray-700">
          <img
            src={currentBackground.url}
            alt="Dealership Background"
            className="w-full h-full object-cover"
          />
        </div>
        <p className="text-xs text-gray-400 mt-2 truncate">{currentBackground.name}</p>
      </div>
    );
  }

  return (
    <div className={`${disabledClasses}`}>
      <label
        htmlFor="background-upload"
        className={`relative block w-full transform rounded-lg border-2 ${dragDropClasses} p-4 transition-all duration-300 ease-in-out ${isProcessing ? '' : 'cursor-pointer'} ${isDragging ? 'scale-105' : 'scale-100'}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center">
          <UploadIcon className={`mx-auto h-7 w-7 transition-all duration-300 ${isDragging ? 'text-green-400 scale-110 -translate-y-1' : 'text-gray-400'}`} />

          {isDragging ? (
            <span className="mt-2 block text-sm font-semibold text-green-300">
              Release to upload
            </span>
          ) : (
            <>
              <span className="mt-2 block text-xs font-medium text-gray-200">
                <span className="text-green-400">Upload Dealership Background</span>
              </span>
              <p className="text-xs text-gray-500 mt-1 text-center">
                Upload your photo booth background (Max 10MB)
              </p>
            </>
          )}
        </div>
        <input
          id="background-upload"
          name="background-upload"
          type="file"
          className="sr-only"
          accept="image/png, image/jpeg, image/gif, image/webp"
          onChange={handleFileChange}
          disabled={isProcessing}
          aria-describedby={error ? 'background-error' : undefined}
        />
      </label>
      {error && (
        <div id="background-error" className="mt-3 flex items-start gap-2 p-3 bg-red-900/20 border border-red-600/50 rounded-lg" role="alert">
          <ErrorIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
};
