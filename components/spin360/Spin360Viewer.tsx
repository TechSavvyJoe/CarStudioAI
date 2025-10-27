import React, { useState, useEffect, useRef } from 'react';
import type { Spin360Set } from '../../types';
import { PlayIcon } from '../icons/PlayIcon';
import { PauseIcon } from '../icons/PauseIcon';

interface Spin360ViewerProps {
  spin360Set: Spin360Set;
  className?: string;
}

export const Spin360Viewer: React.FC<Spin360ViewerProps> = ({ spin360Set, className = '' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartIndex, setDragStartIndex] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const autoPlayIntervalRef = useRef<number | null>(null);

  const totalImages = spin360Set.images.length;
  const currentImage = spin360Set.images[currentIndex];

  // Auto-play functionality
  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayIntervalRef.current = window.setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % totalImages);
      }, 100); // 10 FPS for smooth rotation
    } else {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
        autoPlayIntervalRef.current = null;
      }
    }

    return () => {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
      }
    };
  }, [isAutoPlaying, totalImages]);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isAutoPlaying) return;
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartIndex(currentIndex);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStartX;
    const sensitivity = 5; // Pixels per image
    const imagesDragged = Math.floor(deltaX / sensitivity);
    
    let newIndex = (dragStartIndex + imagesDragged) % totalImages;
    if (newIndex < 0) newIndex += totalImages;
    
    setCurrentIndex(newIndex);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch drag handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAutoPlaying) return;
    setIsDragging(true);
    setDragStartX(e.touches[0]!.clientX);
    setDragStartIndex(currentIndex);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.touches[0]!.clientX - dragStartX;
    const sensitivity = 5;
    const imagesDragged = Math.floor(deltaX / sensitivity);
    
    let newIndex = (dragStartIndex + imagesDragged) % totalImages;
    if (newIndex < 0) newIndex += totalImages;
    
    setCurrentIndex(newIndex);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main viewer */}
      <div
        ref={containerRef}
        className={`relative bg-gray-100 rounded-lg overflow-hidden ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Current image */}
        {currentImage && (
          <img
            src={currentImage.processedUrl || currentImage.originalUrl}
            alt={`360 view - angle ${currentImage.spin360Angle}°`}
            className="w-full h-full object-contain select-none"
            draggable={false}
          />
        )}
        
        {/* 360 indicator badge */}
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-white text-sm font-medium">
          360° {currentImage?.spin360Angle?.toFixed(0)}°
        </div>
        
        {/* Progress indicator */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-black/60 backdrop-blur-sm rounded-full p-2">
            <div className="relative h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-100"
                style={{ width: `${((currentIndex + 1) / totalImages) * 100}%` } as React.CSSProperties}
              />
            </div>
            <div className="text-center text-white text-xs mt-1">
              {currentIndex + 1} / {totalImages}
            </div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={toggleAutoPlay}
            className="p-3 bg-black/60 backdrop-blur-sm rounded-full text-white hover:bg-black/80 transition-colors"
            aria-label={isAutoPlaying ? 'Pause auto-rotation' : 'Play auto-rotation'}
          >
            {isAutoPlaying ? (
              <PauseIcon className="w-5 h-5" />
            ) : (
              <PlayIcon className="w-5 h-5" />
            )}
          </button>
        </div>
        
        {/* Drag instruction overlay */}
        {!isDragging && !isAutoPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm px-6 py-3 rounded-full text-white text-sm font-medium animate-pulse">
              ↔️ Drag to rotate
            </div>
          </div>
        )}
      </div>
      
      {/* Thumbnail strip */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {spin360Set.images.map((image, index) => (
          <button
            key={image.id}
            onClick={() => setCurrentIndex(index)}
            className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
              index === currentIndex
                ? 'border-blue-500 ring-2 ring-blue-500/50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            aria-label={`View angle ${image.spin360Angle}°`}
          >
            <img
              src={image.processedUrl || image.originalUrl}
              alt={`Angle ${image.spin360Angle}°`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
};
