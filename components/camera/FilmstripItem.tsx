import React from 'react';
import { CheckIcon } from '../icons/CheckIcon';
import type { Shot } from './cameraShots';

interface FilmstripItemProps {
  shot: Shot;
  isCaptured: boolean;
  isActive: boolean;
  onSelectShot: () => void;
  onPreviewImage?: () => void;
}

export const FilmstripItem: React.FC<FilmstripItemProps> = ({ shot, isCaptured, isActive, onSelectShot, onPreviewImage }) => {
  const GuideOverlay = shot.overlay;

  const handleClick = () => {
    if (isCaptured && onPreviewImage) {
      onPreviewImage();
    } else {
      onSelectShot();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`relative flex-shrink-0 w-12 h-12 rounded-lg border-2 transition-all duration-300 ease-in-out transform flex flex-col items-center justify-center p-0.5 overflow-hidden ${
        isActive
          ? 'border-blue-400 bg-gray-600 scale-105'
          : isCaptured
          ? 'border-green-400 bg-green-900/30 hover:border-green-500 hover:bg-green-900/50 cursor-pointer'
          : `border-gray-700 bg-gray-800/80 hover:border-blue-500`
      }`}
      aria-label={isCaptured ? `Preview shot: ${shot.name}` : `Go to shot: ${shot.name}`}
    >
      <GuideOverlay className="w-8 h-5 text-white/90" />
      <span className="text-white text-[9px] leading-tight mt-0.5 font-semibold text-center truncate w-full px-1">
        {shot.name}
      </span>
      {isCaptured && (
        <div className="absolute top-0.5 right-0.5 bg-green-500 rounded-full p-0.5 shadow-md">
          <CheckIcon className="w-2.5 h-2.5 text-white" />
        </div>
      )}
    </button>
  );
};
