import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { ImageFile, Spin360Set } from '../types';
import { Spinner } from './Spinner';
import { Placeholder } from './Placeholder';
import { XIcon } from './icons/XIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { RetryIcon } from './icons/RetryIcon';
import { ErrorIcon } from './icons/ErrorIcon';
import { WandIcon } from './icons/WandIcon';
import { ArrowLeftRightIcon } from './icons/ArrowLeftRightIcon';
import { Spin360Viewer } from './spin360/Spin360Viewer';


interface ImageViewerProps {
  images: ImageFile[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onRecreateBackground: (id: string) => void;
  onRetouch: (id: string, prompt: string) => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  images,
  currentIndex,
  onClose,
  onNavigate,
  onRecreateBackground,
  onRetouch,
}) => {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [isOriginalLoaded, setIsOriginalLoaded] = useState(false);
  const [isProcessedLoaded, setIsProcessedLoaded] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [retouchPrompt, setRetouchPrompt] = useState('');
  const [isRetouching, setIsRetouching] = useState(false);

  const image = images[currentIndex];
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Detect if current image is part of a 360 spin set
  const spin360Set = useMemo<Spin360Set | null>(() => {
    if (!image.spin360Id) return null;
    
    const spin360Images = images
      .filter(img => img.spin360Id === image.spin360Id)
      .sort((a, b) => (a.spin360Index ?? 0) - (b.spin360Index ?? 0));
    
    if (spin360Images.length < 2) return null;
    
    return {
      id: image.spin360Id,
      name: `360° Spin`,
      vehicleType: 'sedan', // Default, would need to be stored if important
      timestamp: Date.now(),
      images: spin360Images,
      totalAngles: 24, // Standard 360 spin has 24 angles
      isComplete: spin360Images.length === 24,
    };
  }, [image, images]);

  // Guard: if no valid image, don't render
  if (!image) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/90">
        <div className="text-center text-white">
          <p className="text-lg mb-4">Image not found</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    // Reset state when the image changes
    setIsOriginalLoaded(false);
    setIsProcessedLoaded(false);
    setSliderPosition(50);
    setRetouchPrompt('');
    setIsRetouching(false);
  }, [currentIndex]);

  useEffect(() => {
    if (image.status === 'retouching') {
        setIsRetouching(true);
    } else {
        setIsRetouching(false);
    }
  }, [image.status]);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(onClose, 200); // Match animation duration
  };
  
  const handleRecreateBackground = () => {
    onRecreateBackground(image.id);
    handleClose();
  };
  
  const handleMagicRetouch = () => {
      const magicPrompt = "Analyze this photo of a car and perform professional-level enhancements. Improve lighting, correct colors, enhance reflections on the paint and glass to make it look like a high-end commercial photograph. Do not change the car's color or add/remove any parts. Make the car look its absolute best.";
      setIsRetouching(true);
      onRetouch(image.id, magicPrompt);
  };
  
  const handleCustomRetouch = () => {
      if (!retouchPrompt.trim()) return;
      setIsRetouching(true);
      onRetouch(image.id, retouchPrompt);
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    const total = images.length;
    const nextIndex = direction === 'next'
      ? (currentIndex + 1) % total
      : (currentIndex - 1 + total) % total;
    onNavigate(nextIndex);
  };

  const isImageLoading = (!isOriginalLoaded || (image.processedUrl && !isProcessedLoaded));


  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isAnimatingOut ? 'animate-fadeOut' : 'animate-fadeIn'}`}
      style={{ backgroundColor: 'rgba(17, 24, 39, 0.9)' }}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Main content area */}
      <div
        className={`relative w-full h-full flex flex-col items-center justify-center gap-4 ${isAnimatingOut ? 'animate-scaleOut' : 'animate-scaleIn'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="w-full max-w-7xl flex justify-between items-center text-white px-2">
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate" title={image.originalFile.name}>{image.originalFile.name}</p>
            <p className="text-sm text-gray-400">
              {currentIndex + 1} / {images.length}
            </p>
          </div>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Close image viewer">
            <XIcon className="w-6 h-6" />
          </button>
        </header>
        
        {/* Image Display */}
        <div ref={imageContainerRef} className="relative w-full flex-1 flex items-center justify-center min-h-0">
            {spin360Set && spin360Set.images.every(img => img.status === 'completed' && img.processedUrl) ? (
              // 360 Spin Viewer - all images are processed
              <div className="w-full h-full max-w-7xl">
                <Spin360Viewer spin360Set={spin360Set} className="w-full h-full" />
              </div>
            ) : spin360Set ? (
              // 360 spin is still processing
              <div className="text-center text-white">
                <Spinner className="w-12 h-12 mx-auto mb-4" />
                <p className="text-lg">Processing 360° spin...</p>
                <p className="text-sm text-gray-400 mt-2">
                  {spin360Set.images.filter(img => img.status === 'completed').length} / {spin360Set.totalAngles} images complete
                </p>
              </div>
            ) : (
              // Regular single image viewer
              <>
                {isImageLoading && <Placeholder />}

                <div className={`relative max-w-full max-h-full transition-opacity duration-300 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}>
                    <img
                        src={image.originalUrl}
                        alt="Original"
                        className="block max-w-full max-h-full object-contain"
                        onLoad={() => setIsOriginalLoaded(true)}
                    />

                    {image.status === 'completed' && image.processedUrl ? (
                        <>
                            <div className="comparison-slider" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`}}>
                                <img
                                    src={image.processedUrl!}
                                    alt="Processed"
                                    className="absolute inset-0 w-full h-full object-contain"
                                    onLoad={() => setIsProcessedLoaded(true)}
                                 />
                            </div>
                            <div className="comparison-divider" style={{ left: `${sliderPosition}%` }} />
                            <div className="comparison-handle" style={{ left: `${sliderPosition}%` }}>
                                <ArrowLeftRightIcon className="w-6 h-6" />
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={sliderPosition}
                                onChange={(e) => setSliderPosition(Number(e.target.value))}
                                className="slider-input"
                                aria-label="Compare original and processed images"
                            />
                        </>
                    ) : image.processedUrl && (
                        <img
                            src={image.processedUrl}
                            alt="Processed"
                            className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ${isProcessedLoaded ? 'opacity-100' : 'opacity-0'}`}
                            onLoad={() => setIsProcessedLoaded(true)}
                        />
                    )}
                </div>

                {(image.status === 'processing' || isRetouching) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-center">
                    <Spinner className="w-12 h-12 text-blue-400"/>
                    <p className="mt-4 text-lg font-semibold text-white animate-pulse">
                      {isRetouching ? 'Applying AI Retouch...' : 'Creating Background...'}
                    </p>
                  </div>
                )}
              </>
            )}
        </div>
        
        {/* Footer & Controls */}
        <footer className="w-full max-w-4xl flex flex-col items-center gap-4 px-2">
            {image.status === 'failed' && image.error && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg text-sm flex items-start gap-x-3 w-full">
                    <ErrorIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                        <span className="font-semibold">Processing Failed:</span> {image.error}
                    </div>
                </div>
            )}

           <div className="flex items-center justify-center gap-x-4 p-2 bg-gray-800/50 border border-gray-700 rounded-full">
                {(image.status === 'completed' || image.status === 'failed') && (
                  <button
                    onClick={handleRecreateBackground}
                    disabled={isRetouching}
                    className="flex items-center gap-x-2 px-4 py-2 text-sm font-semibold text-white rounded-full hover:bg-white/10 transition-colors"
                    title="Recreate background"
                    aria-label="Recreate background for this image"
                  >
                    <RetryIcon className="w-5 h-5" />
                    <span>Recreate Background</span>
                  </button>
                )}

                {image.status === 'completed' && image.processedUrl && (
                  <a
                    href={image.processedUrl}
                    download={`studio-${image.originalFile.name}`}
                    className="flex items-center gap-x-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-full hover:bg-green-700 transition-colors"
                    aria-label="Download processed image"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DownloadIcon className="w-5 h-5" />
                    <span>Download</span>
                  </a>
                )}
          </div>
        </footer>

      </div>

      {/* Navigation Buttons */}
      <button
        onClick={(e) => {e.stopPropagation(); handleNavigate('prev')}}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/40 rounded-full text-white hover:bg-white/20 transition-colors backdrop-blur-sm"
        aria-label="Previous image"
      >
        <ChevronLeftIcon className="w-8 h-8" />
      </button>
      <button
        onClick={(e) => {e.stopPropagation(); handleNavigate('next')}}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/40 rounded-full text-white hover:bg-white/20 transition-colors backdrop-blur-sm"
        aria-label="Next image"
      >
        <ChevronRightIcon className="w-8 h-8" />
      </button>
    </div>
  );
};