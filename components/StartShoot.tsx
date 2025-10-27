
import React from 'react';
import { CameraIcon } from './icons/CameraIcon';
import { ImageUpload } from './ImageUpload';
import { BackgroundUpload } from './BackgroundUpload';
import type { DealershipBackground } from '../types';

interface StartShootProps {
  onStart: () => void;
  onFilesSelected: (files: FileList) => void;
  isProcessing: boolean;
  dealershipBackground: DealershipBackground | null;
  onBackgroundSelected: (file: File) => void;
  onBackgroundRemoved: () => void;
}

export const StartShoot: React.FC<StartShootProps> = ({ 
  onStart, 
  onFilesSelected, 
  isProcessing,
  dealershipBackground,
  onBackgroundSelected,
  onBackgroundRemoved
}) => {
  return (
    <div className="text-center py-8 px-6">
      <CameraIcon className="mx-auto h-16 w-16 text-blue-400" />
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Your Studio is Ready
      </h2>
      <p className="mt-4 max-w-2xl mx-auto text-lg leading-8 text-gray-300">
        Capture the perfect shots with our guided process, or upload your existing photos to get started.
      </p>
      
      {/* Dealership Background Upload Section */}
      <div className="mt-8 max-w-2xl mx-auto">
        <h3 className="text-sm font-semibold text-gray-300 mb-3 text-left">Optional: Upload Dealership Background</h3>
        <BackgroundUpload
          currentBackground={dealershipBackground}
          onBackgroundSelected={onBackgroundSelected}
          onBackgroundRemoved={onBackgroundRemoved}
          isProcessing={isProcessing}
        />
        <p className="text-xs text-gray-400 mt-2 text-left">
          Upload a photo of your dealership to composite vehicles onto your actual location (like the photo booth example).
        </p>
      </div>

      <div className="mt-8">
        <button
          onClick={onStart}
          disabled={isProcessing}
          className="inline-flex items-center justify-center gap-x-3 rounded-md bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-sm transition-transform duration-200 hover:bg-blue-500 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
        >
          <CameraIcon className="-ml-1 h-6 w-6" aria-hidden="true" />
          Start Guided Photoshoot
        </button>
      </div>
      <div className="my-6 flex items-center justify-center">
        <div className="flex-grow border-t border-gray-600"></div>
        <span className="flex-shrink mx-4 text-gray-500 text-sm font-semibold">OR</span>
        <div className="flex-grow border-t border-gray-600"></div>
      </div>
      <ImageUpload onFilesSelected={onFilesSelected} isProcessing={isProcessing} />
    </div>
  );
};
