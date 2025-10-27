
import React from 'react';
import { CameraIcon } from './icons/CameraIcon';
import { ImageUpload } from './ImageUpload';
import { BackgroundUpload } from './BackgroundUpload';
import type { DealershipBackground } from '../types';

interface StartShootProps {
  onStart: () => void;
  onStart360: () => void; // New prop for 360 spin mode
  onFilesSelected: (files: FileList) => void;
  isProcessing: boolean;
  dealershipBackground: DealershipBackground | null;
  onBackgroundSelected: (file: File) => void;
  onBackgroundRemoved: () => void;
}

export const StartShoot: React.FC<StartShootProps> = ({ 
  onStart,
  onStart360,
  onFilesSelected, 
  isProcessing,
  dealershipBackground,
  onBackgroundSelected,
  onBackgroundRemoved
}) => {
  return (
    <div className="text-center py-4 sm:py-8 px-3 sm:px-6">
      <CameraIcon className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-blue-400" />
      <h2 className="mt-3 sm:mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-white">
        Your Studio is Ready
      </h2>
      <p className="mt-2 sm:mt-4 max-w-2xl mx-auto text-base sm:text-lg leading-6 sm:leading-8 text-gray-300">
        Capture perfect shots or upload existing photos.
      </p>

      <div className="mt-6 sm:mt-8 flex flex-col gap-3 sm:gap-4 justify-center items-stretch sm:items-center max-w-md sm:max-w-none mx-auto">
        <button
          onClick={onStart}
          disabled={isProcessing}
          className="inline-flex items-center justify-center gap-x-2 sm:gap-x-3 rounded-md bg-blue-600 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold text-white shadow-sm transition-transform duration-200 hover:bg-blue-500 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 w-full sm:w-auto"
        >
          <CameraIcon className="-ml-1 h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
          Start Guided Photoshoot
        </button>
        
        <button
          onClick={onStart360}
          disabled={isProcessing}
          className="inline-flex items-center justify-center gap-x-2 sm:gap-x-3 rounded-md bg-purple-600 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold text-white shadow-sm transition-transform duration-200 hover:bg-purple-500 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 w-full sm:w-auto"
        >
          <span className="text-lg sm:text-xl">360°</span>
          Start 360° Spin
        </button>
      </div>
      <div className="my-4 sm:my-6 flex items-center justify-center">
        <div className="flex-grow border-t border-gray-600"></div>
        <span className="flex-shrink mx-4 text-gray-500 text-sm font-semibold">OR</span>
        <div className="flex-grow border-t border-gray-600"></div>
      </div>
      <ImageUpload onFilesSelected={onFilesSelected} isProcessing={isProcessing} />
      
      {/* Dealership Background Upload Section - Moved to bottom */}
      <div className="mt-6 sm:mt-10 pt-6 sm:pt-8 border-t border-gray-700 max-w-2xl mx-auto">
        <h3 className="text-sm font-semibold text-gray-300 mb-3 text-left">Optional: Dealership Background</h3>
        <BackgroundUpload
          currentBackground={dealershipBackground}
          onBackgroundSelected={onBackgroundSelected}
          onBackgroundRemoved={onBackgroundRemoved}
          isProcessing={isProcessing}
        />
        <p className="text-xs text-gray-400 mt-2 text-left">
          Upload a photo of your dealership to composite vehicles onto your actual location.
        </p>
      </div>
    </div>
  );
};
