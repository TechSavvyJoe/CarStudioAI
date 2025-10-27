
import React, { useCallback, useState } from 'react';
import { UploadIcon } from './icons/UploadIcon';

interface ImageUploadProps {
  onFilesSelected: (files: FileList) => void;
  isProcessing: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onFilesSelected, isProcessing }) => {
  const [isDragging, setIsDragging] = useState(false);

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
    // Provide visual feedback to the user about the drop effect
    if (!isProcessing) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }, [isProcessing]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && !isProcessing) {
      onFilesSelected(e.dataTransfer.files);
    }
  }, [onFilesSelected, isProcessing]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && !isProcessing) {
      onFilesSelected(e.target.files);
      // Reset input value to allow selecting the same file again
      e.target.value = '';
    }
  };

  // Enhanced visual feedback classes
  const dragDropClasses = isDragging
    ? 'border-solid border-blue-400 bg-blue-900/50 ring-4 ring-blue-500/30'
    : 'border-dashed border-gray-600 hover:border-blue-500 hover:bg-gray-700/50';
  
  const disabledClasses = isProcessing ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <div className={`text-center ${disabledClasses}`}>
      <label
        htmlFor="file-upload"
        className={`relative block w-full transform rounded-lg border-2 ${dragDropClasses} p-12 transition-all duration-300 ease-in-out ${isProcessing ? '' : 'cursor-pointer'} ${isDragging ? 'scale-105' : 'scale-100'}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center">
          {/* Icon animates during drag */}
          <UploadIcon className={`mx-auto h-12 w-12 transition-all duration-300 ${isDragging ? 'text-blue-400 scale-110 -translate-y-1' : 'text-gray-400'}`} />
          
          {/* Text changes during drag */}
          {isDragging ? (
            <span className="mt-4 block text-lg font-semibold text-blue-300">
              Release to upload
            </span>
          ) : (
            <>
              <span className="mt-2 block text-sm font-medium text-gray-200">
                <span className="text-blue-400">Click to upload</span> or drag and drop
              </span>
              <p className="text-xs text-gray-500">PNG, JPG, GIF, or WEBP</p>
            </>
          )}
        </div>
        <input
          id="file-upload"
          name="file-upload"
          type="file"
          className="sr-only"
          multiple
          accept="image/png, image/jpeg, image/gif, image/webp"
          onChange={handleFileChange}
          disabled={isProcessing}
          aria-label="Upload vehicle photos for processing"
        />
      </label>
      
      {isProcessing && (
         <p className="mt-4 text-sm text-blue-400 animate-pulse">Processing images, please wait...</p>
      )}
    </div>
  );
};
