import React, { useState, useRef, useEffect } from 'react';
import { ImageFile } from '../types';
import { Spinner } from './Spinner';
import { DownloadIcon } from './icons/DownloadIcon';
import { ErrorIcon } from './icons/ErrorIcon';
import { RetryIcon } from './icons/RetryIcon';
import { ClockIcon } from './icons/ClockIcon';
import { Placeholder } from './Placeholder';
import { CheckIcon } from './icons/CheckIcon';
import { WandIcon } from './icons/WandIcon';

interface ImageCardProps {
  image: ImageFile;
  index: number;
  onReprocess: (id: string) => void;
  onOpenViewer: (index: number) => void;
}

const ImageCardComponent: React.FC<ImageCardProps> = ({ image, index, onReprocess, onOpenViewer }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isOriginalLoaded, setIsOriginalLoaded] = useState(false);
  const [isProcessedLoaded, setIsProcessedLoaded] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  const cardRef = useRef<HTMLDivElement | null>(null);
  const prevStatusRef = useRef(image.status);


  useEffect(() => {
    // Reset loaded state when image source changes (e.g., on reprocess)
    setIsOriginalLoaded(false);
    setIsProcessedLoaded(false);
  }, [image.originalUrl, image.processedUrl]);

  useEffect(() => {
    if (prevStatusRef.current !== 'completed' && image.status === 'completed') {
      setJustCompleted(true);
      const timer = setTimeout(() => setJustCompleted(false), 1200); // Match animation duration
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = image.status;
  }, [image.status]);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        rootMargin: '0px 0px 200px 0px',
      }
    );

    const currentRef = cardRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  const getStatusText = () => {
    switch (image.status) {
      case 'pending':
        return <p className="text-xs text-gray-400 mt-1">Pending</p>;
      case 'queued':
        return <p className="text-xs text-gray-400 mt-1">Queued</p>;
      case 'processing':
        return <p className="text-xs text-blue-400 mt-1 animate-pulse">Processing...</p>;
      case 'retouching':
        return <p className="text-xs text-purple-400 mt-1 animate-pulse">Retouching...</p>;
      case 'completed':
        return <p className="text-xs text-green-400 mt-1">Completed</p>;
      case 'paused':
        const pauseMessage = image.error && image.error.includes('Retrying') 
          ? 'Rate limit hit. Paused.' 
          : 'Paused';
        return <p className="text-xs text-yellow-400 mt-1">{pauseMessage}</p>;
      case 'failed':
        return <p className="text-xs text-red-400 mt-1">Failed</p>;
      default:
        return null;
    }
  };

  const showStatusOverlay = image.status !== 'completed' && image.status !== 'pending';
  
  const isLoading = (image.status === 'completed' && image.processedUrl && !isProcessedLoaded) || 
                    (image.status !== 'completed' && !isOriginalLoaded);
  const showPlaceholder = isVisible && isLoading;

  return (
    <div 
      ref={cardRef} 
      className={`aspect-square bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700 group transition-all duration-300 ease-in-out hover:shadow-blue-500/20 hover:border-blue-500/50 hover:scale-105 cursor-pointer ${justCompleted ? 'animate-flash-success' : ''}`}
      title={image.error ? `${image.aiGeneratedName || image.originalFile.name} - Error: ${image.error}` : (image.aiGeneratedName || image.originalFile.name)}
      onClick={() => onOpenViewer(index)}
    >
      <div className="relative w-full h-full">
        {/* --- IMAGE AREA --- */}
        {showPlaceholder && <Placeholder />}

        {isVisible && (
          <img
            src={image.originalUrl}
            alt="Original"
            className={`w-full h-full object-cover transition-opacity duration-300 ${isOriginalLoaded ? (image.status === 'completed' ? 'opacity-0 group-hover:opacity-100' : 'opacity-100') : 'opacity-0'}`}
            onLoad={() => setIsOriginalLoaded(true)}
          />
        )}
        
        {isVisible && image.status === 'completed' && image.processedUrl && (
          <img
            src={image.processedUrl}
            alt="Processed"
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${isProcessedLoaded ? 'opacity-100 group-hover:opacity-0 group-hover:scale-110' : 'opacity-0'}`}
            onLoad={() => setIsProcessedLoaded(true)}
          />
        )}

        {/* --- STATUS OVERLAY (Spinner, Error, etc.) --- */}
        {showStatusOverlay && (
          <div className="absolute inset-0 w-full h-full bg-black/50 flex items-center justify-center p-2">
            <div className="text-center">
              {image.status === 'processing' && <Spinner className="w-8 h-8 text-blue-400 mx-auto" />}
              {image.status === 'retouching' && <WandIcon className="w-8 h-8 text-purple-400 mx-auto animate-pulse" />}
              {image.status === 'queued' && <ClockIcon className="w-8 h-8 text-gray-400 mx-auto" />}
              {image.status === 'paused' && <ClockIcon className="w-8 h-8 text-yellow-400 mx-auto" />}
              {image.status === 'failed' && <ErrorIcon className="w-8 h-8 text-red-400 mx-auto" />}
            </div>
          </div>
        )}

        {/* --- BOTTOM INFO OVERLAY (Filename, status text) - ALWAYS VISIBLE --- */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none">
          <p className="text-xs font-semibold text-white truncate flex items-center gap-1" title={image.aiGeneratedName || image.originalFile.name}>
            {image.aiGeneratedName ? (
              <>
                <span className="inline-block w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                {image.aiGeneratedName}
              </>
            ) : (
              <>
                <span className="inline-block w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></span>
                <span className="text-yellow-400">Analyzing...</span>
              </>
            )}
          </p>
          {getStatusText()}
        </div>
        
        {/* --- TOP RIGHT ICONS (Status & Actions) --- */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-x-2">
          {/* Status Icon */}
          {(image.status === 'completed' || image.status === 'failed') && (
            <div className="p-1.5 bg-black/60 rounded-full backdrop-blur-sm pointer-events-none">
              {image.status === 'completed' && <CheckIcon className="w-4 h-4 text-green-400" />}
              {image.status === 'failed' && <ErrorIcon className="w-4 h-4 text-red-400" />}
            </div>
          )}
          
          {/* Action Buttons (appear on hover) */}
          <div className="flex items-center gap-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {image.status === 'completed' && image.processedUrl && (
              <a
                href={image.processedUrl}
                download={image.aiGeneratedName ? `${image.aiGeneratedName}.jpg` : `studio-${image.originalFile.name}`}
                className="p-2 bg-gray-900/60 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-sm"
                aria-label="Download processed image"
                onClick={(e) => e.stopPropagation()}
              >
                <DownloadIcon className="w-5 h-5" />
              </a>
            )}
            {(image.status === 'completed' || image.status === 'failed') && (
              <button
                onClick={(e) => { e.stopPropagation(); onReprocess(image.id); }}
                className="p-2 bg-gray-900/60 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-sm"
                aria-label="Re-process image"
                title="Re-process image"
              >
                <RetryIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        
        {/* --- 'ORIGINAL' LABEL ON HOVER --- */}
        {image.status === 'completed' && (
          <div className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 bg-black/60 text-white text-[10px] font-bold rounded-full opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 backdrop-blur-sm pointer-events-none">
            ORIGINAL
          </div>
        )}
      </div>
    </div>
  );
};

export const ImageCard = React.memo(ImageCardComponent, (prevProps, nextProps) => {
  // Return true if props are equal (don't re-render)
  return (
    prevProps.image.id === nextProps.image.id &&
    prevProps.image.status === nextProps.image.status &&
    prevProps.image.error === nextProps.image.error &&
    prevProps.image.processedUrl === nextProps.image.processedUrl &&
    prevProps.image.originalUrl === nextProps.image.originalUrl &&
    prevProps.index === nextProps.index
  );
});