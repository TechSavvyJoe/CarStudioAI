
import React from 'react';
import { CameraIcon } from './icons/CameraIcon';

export const Header = () => {
  return (
    <header className="relative py-6 border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 flex items-center justify-center">
        <div className="flex items-center">
            <CameraIcon className="w-8 h-8 mr-3 text-blue-400" />
            <h1 className="text-3xl font-bold tracking-tight text-white">
            Auto Background <span className="text-blue-400">Studio</span>
            </h1>
        </div>
      </div>
       <p className="text-center text-gray-400 mt-2">Instantly upgrade your car photos to a professional studio setting.</p>
    </header>
  );
};
