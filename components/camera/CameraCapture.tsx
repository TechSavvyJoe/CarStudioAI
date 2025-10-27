
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { SHOT_LIST } from './cameraShots';
import { Spinner } from '../Spinner';
import { ShutterIcon } from '../icons/ShutterIcon';
import { XIcon } from '../icons/XIcon';
import { CameraRotateIcon } from '../icons/CameraRotateIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { AdjustmentsIcon } from '../icons/AdjustmentsIcon';
import { VehicleTypeSelector } from './VehicleTypeSelector';
import type { VehicleType } from '../../types';
import { GridGuide } from '../icons/guides/GridGuide';
import { VEHICLE_TYPES } from './vehicleTypes';
import { shutterSoundDataUrl } from '../../assets/shutterSound';

// Type for camera focus constraints (advanced property)
type CameraFocusConstraint = {
  focusMode?: 'manual' | 'single-shot' | 'continuous';
  pointsOfInterest?: Array<{ x: number; y: number }>;
};


interface CameraCaptureProps {
  onClose: () => void;
  onCaptureComplete: (files: File[]) => void;
}

const FilmstripItem: React.FC<{
  shot: typeof SHOT_LIST[0];
  isCaptured: boolean;
  isActive: boolean;
  onSelectShot: () => void;
  onPreviewImage?: () => void;
}> = ({ shot, isCaptured, isActive, onSelectShot, onPreviewImage }) => {
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


const InitialVehicleSelection: React.FC<{ onSelect: (type: VehicleType) => void; }> = ({ onSelect }) => {
    const [selected, setSelected] = useState<VehicleType | null>(null);

    return (
        <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center p-4 text-center animate-fadeIn">
            <h1 className="text-3xl font-bold text-white mb-2">First, Select Your Vehicle Type</h1>
            <p className="text-gray-400 mb-8 max-w-md">This helps us provide accurate guides for your photoshoot. You can change this later in the settings.</p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 max-w-2xl w-full">
                {VEHICLE_TYPES.map((type) => {
                    const isSelected = selected === type.id;
                    const Icon = type.icon;
                    return (
                        <button
                            key={type.id}
                            onClick={() => setSelected(type.id)}
                            className={`flex flex-col items-center justify-center aspect-square rounded-lg border-2 transition-all duration-200 transform p-2 hover:scale-105 ${
                                isSelected
                                    ? 'border-blue-400 bg-blue-900/50 ring-2 ring-blue-500'
                                    : 'border-gray-700 bg-gray-800'
                            }`}
                        >
                            <Icon className="w-16 h-12 text-white" />
                            <span className="text-sm font-semibold mt-2 text-white">{type.label}</span>
                        </button>
                    );
                })}
            </div>
            <button
                onClick={() => onSelect(selected!)}
                disabled={!selected}
                className="mt-8 px-8 py-3 bg-blue-600 text-white font-bold rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-blue-700 transition-all transform hover:scale-105"
            >
                Confirm & Start
            </button>
        </div>
    );
};


export const CameraCapture = ({ onClose, onCaptureComplete }: CameraCaptureProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [capturedImages, setCapturedImages] = useState<{ dataUrl: string; shotName: string }[]>([]);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [streamStarted, setStreamStarted] = useState(false);
  const [previewingImageIndex, setPreviewingImageIndex] = useState<number | null>(null);
  const [isGuideSettingsOpen, setIsGuideSettingsOpen] = useState(false);
  const [shutterKey, setShutterKey] = useState(0);
  
  // Safely validate vehicle type from localStorage
  const getValidVehicleType = (): VehicleType | null => {
    const stored = localStorage.getItem('vehicleType');
    if (!stored) return null;
    // Validate that stored value is a valid vehicle type
    const isValid = VEHICLE_TYPES.some(type => type.id === stored);
    return isValid ? (stored as VehicleType) : null;
  };

  const [vehicleType, setVehicleType] = useState<VehicleType | null>(getValidVehicleType());
  const [initialSelectionDone, setInitialSelectionDone] = useState(!!vehicleType);


  const [showGuides, setShowGuides] = useState(() => {
    return localStorage.getItem('showGuides') !== 'false';
  });
  const [showGrid, setShowGrid] = useState(() => {
    return localStorage.getItem('showGrid') === 'true';
  });
  const [guideOpacity, setGuideOpacity] = useState(() => {
    const savedOpacity = localStorage.getItem('guideOpacity');
    return savedOpacity ? parseFloat(savedOpacity) : 0.35;
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const focusTimerRef = useRef<number | null>(null);
  const focusIsSupported = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);

  const shutterSoundRef = useRef<HTMLAudioElement | null>(null);

  // Initialize and cleanup audio element
  useEffect(() => {
    if (shutterSoundDataUrl) {
      shutterSoundRef.current = new Audio(shutterSoundDataUrl);
    }

    return () => {
      if (shutterSoundRef.current) {
        shutterSoundRef.current.pause();
        shutterSoundRef.current.src = '';
        shutterSoundRef.current = null;
      }
    };
  }, []);

  // Cleanup focus timer on unmount
  useEffect(() => {
    return () => {
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current);
        focusTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('showGuides', String(showGuides));
  }, [showGuides]);
  
  useEffect(() => {
    localStorage.setItem('showGrid', String(showGrid));
  }, [showGrid]);

  useEffect(() => {
    localStorage.setItem('guideOpacity', String(guideOpacity));
  }, [guideOpacity]);

  useEffect(() => {
    if (vehicleType) {
        localStorage.setItem('vehicleType', vehicleType);
    }
  }, [vehicleType]);
  
  const handleInitialSelect = (type: VehicleType) => {
    setVehicleType(type);
    setInitialSelectionDone(true);
  };
  
  const capturedShotNames = useMemo(() => 
    new Set(capturedImages.map(c => c.shotName))
  , [capturedImages]);

  const currentShot = SHOT_LIST[currentShotIndex];
  const GuideOverlay = currentShot.overlay;
  
  useEffect(() => {
      const activeItem = filmstripRef.current?.children[currentShotIndex] as HTMLElement;
      if (activeItem) {
          activeItem.scrollIntoView({
              behavior: 'smooth',
              inline: 'center',
              block: 'nearest',
          });
      }
  }, [currentShotIndex]);

  useEffect(() => {
    const setTrueFullscreen = () => {
      if (containerRef.current) {
        containerRef.current.style.height = `${window.innerHeight}px`;
        containerRef.current.style.width = `${window.innerWidth}px`;
      }
    };
    setTrueFullscreen();
    window.addEventListener('resize', setTrueFullscreen);
    return () => window.removeEventListener('resize', setTrueFullscreen);
  }, []);

  const startStream = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    let abortController: AbortController | null = null;
    let timeoutId: number | null = null;

    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }

      // Stop existing stream
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }

      // Use AbortController for timeout capability
      abortController = new AbortController();

      // Set 30-second timeout for camera request
      timeoutId = window.setTimeout(() => {
        abortController?.abort();
      }, 30000);

      // Type assertion needed as signal is not yet in standard MediaStreamConstraints type
      const constraints: MediaStreamConstraints & { signal?: AbortSignal } = {
        video: {
            facingMode,
            width: { ideal: 4096 },
            height: { ideal: 2160 },
         },
        signal: abortController.signal,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Cancel timeout if request succeeded
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamStarted(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      let message = 'Could not access the camera. ';
      if (err instanceof DOMException) {
          if (err.name === 'AbortError') {
              message = 'Camera request timed out. Please try again.';
          } else if (err.name === 'NotAllowedError') {
              message += 'Please grant camera permissions in your browser settings.';
          } else if (err.name === 'NotFoundError') {
              message += 'No camera found on this device.';
          } else {
              message += 'An unexpected error occurred.';
          }
      } else if (err instanceof Error && err.name === 'AbortError') {
          message = 'Camera request timed out. Please check your device and try again.';
      }
      setError(message);
    } finally {
        setIsLoading(false);
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }
    }
  }, [facingMode]);

  const handleCanPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const [track] = (video.srcObject as MediaStream).getVideoTracks();
    if (track && 'focusMode' in track.getSettings()) {
        focusIsSupported.current = true;
    }
    setIsLoading(false);
  }, []);

  const handleFocus = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!focusIsSupported.current || !videoRef.current) return;

    const video = videoRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setFocusPoint({ x, y });
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    focusTimerRef.current = window.setTimeout(() => setFocusPoint(null), 1500);

    const [track] = (video.srcObject as MediaStream).getVideoTracks();
    const focusConstraint: CameraFocusConstraint = {
        focusMode: 'manual',
        pointsOfInterest: [{
            x: x / rect.width,
            y: y / rect.height
        }]
    };

    // Type assertion needed for advanced camera constraints not in standard MediaTrackConstraints
    const constraints = { advanced: [focusConstraint] } as MediaTrackConstraints & { advanced: CameraFocusConstraint[] };
    track.applyConstraints(constraints).catch(err => console.error('Focus failed', err));
  }, []);

  const toggleFacingMode = useCallback(() => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  }, []);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      // Shutter visual effect
      setShutterKey(prev => prev + 1);

      // Play shutter sound
      if(shutterSoundRef.current) {
        shutterSoundRef.current.currentTime = 0;
        shutterSoundRef.current.play().catch(() => {
          // Silently fail if audio can't play (may be blocked by browser)
        });
      }

      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setCapturedImages(prev => [...prev, { dataUrl, shotName: currentShot.name }]);
        // Move to the next un-captured shot
        const nextUncapturedIndex = SHOT_LIST.findIndex((shot, index) => 
            index > currentShotIndex && !capturedShotNames.has(shot.name));
        const nextIndex = nextUncapturedIndex !== -1 ? nextUncapturedIndex : SHOT_LIST.findIndex(s => !capturedShotNames.has(s.name));
        setCurrentShotIndex(nextIndex !== -1 ? nextIndex : (currentShotIndex + 1) % SHOT_LIST.length);
      }
    }
  }, [currentShot.name, capturedShotNames, currentShotIndex]);

  const handleCaptureComplete = useCallback(async () => {
    if (capturedImages.length === 0) return;

    try {
      const results = await Promise.allSettled(
        capturedImages.map(async (img, index) => {
          try {
            const res = await fetch(img.dataUrl);
            if (!res.ok) {
              throw new Error(`HTTP ${res.status}`);
            }
            const blob = await res.blob();
            // Sanitize shot name for use in filename
            const sanitizedShotName = img.shotName.toLowerCase().replace(/[^a-z0-9]/g, '-');
            return new File([blob], `capture-${sanitizedShotName}-${index}.jpg`, { type: 'image/jpeg' });
          } catch (error) {
            console.error(`Failed to convert image ${index}:`, error);
            throw error;
          }
        })
      );

      // Filter out failed conversions and only use successful files
      const files = results
        .map((result: PromiseSettledResult<File>, index: number) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            console.error(`Image ${index} conversion failed:`, result.reason);
            return null;
          }
        })
        .filter((file: File | null): file is File => file !== null);

      if (files.length === 0) {
        console.error('No images were successfully converted');
        return;
      }

      if (files.length < capturedImages.length) {
        console.warn(`Only ${files.length} of ${capturedImages.length} images were successfully converted`);
      }

      onCaptureComplete(files);
    } catch (error) {
      console.error('Error during capture completion:', error);
    }
  }, [capturedImages, onCaptureComplete]);
  
  useEffect(() => {
    if (initialSelectionDone) {
      startStream();
    }
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [startStream, initialSelectionDone]);


  if (!initialSelectionDone) {
    return <InitialVehicleSelection onSelect={handleInitialSelect} />;
  }

  return (
    <div ref={containerRef} className="fixed inset-0 z-40 bg-black text-white flex flex-col items-center justify-center animate-fadeIn">
      {/* Hidden canvas for taking pictures */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Main Video and Overlays */}
      <div 
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        onClick={handleFocus}
      >
        <video
          ref={videoRef}
          className={`w-full h-full object-cover transition-opacity duration-500 ${streamStarted ? 'opacity-100' : 'opacity-0'}`}
          playsInline
          autoPlay
          muted
          onCanPlay={handleCanPlay}
        />
        
        {/* Loading / Error States */}
        {(isLoading || error) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-center p-4">
                {isLoading && !error && <Spinner className="w-12 h-12 text-blue-400" />}
                {error && <p className="text-red-400">{error}</p>}
            </div>
        )}

        {/* Guides Overlay */}
        {showGuides && vehicleType && (
          <GuideOverlay
            vehicleType={vehicleType}
            category={currentShot.category}
            className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300"
            style={{ opacity: streamStarted ? guideOpacity : 0 }}
          />
        )}
        {showGrid && (
            <GridGuide
                className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300"
                style={{ opacity: streamStarted ? 0.3 : 0 }}
            />
        )}

        {/* Tap-to-focus animation */}
        {focusPoint && (
          <div
            className="absolute border-2 border-yellow-400 w-16 h-16 rounded-full animate-focus pointer-events-none"
            style={{ top: `${focusPoint.y}px`, left: `${focusPoint.x}px`, transform: 'translate(-50%, -50%)' }}
          />
        )}
        
        {/* Shutter visual effect */}
        <div key={shutterKey} className="absolute inset-0 rounded-full animate-shutter-burst pointer-events-none" />
      </div>

      {/* Top Controls */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10 bg-gradient-to-b from-black/60 to-transparent">
        <button
          onClick={onClose}
          className="p-3 bg-black/50 rounded-full hover:bg-white/20 transition-colors backdrop-blur-sm"
          aria-label="Close camera"
        >
          <XIcon className="w-6 h-6" />
        </button>

        <div className="text-center p-2 bg-black/50 rounded-lg backdrop-blur-sm max-w-[50%]">
            <h3 className="font-bold text-lg leading-tight">{currentShot.name}</h3>
            <p className="text-xs text-gray-300 leading-tight">{currentShot.description}</p>
        </div>

        <div className="flex flex-col gap-2">
            <button
              onClick={() => setIsGuideSettingsOpen(prev => !prev)}
              className={`p-3 rounded-full transition-colors backdrop-blur-sm ${isGuideSettingsOpen ? 'bg-blue-600' : 'bg-black/50 hover:bg-white/20'}`}
              aria-label="Adjust guides"
            >
              <AdjustmentsIcon className="w-6 h-6" />
            </button>
            <button
              onClick={toggleFacingMode}
              className="p-3 bg-black/50 rounded-full hover:bg-white/20 transition-colors backdrop-blur-sm"
              aria-label="Switch camera"
            >
              <CameraRotateIcon className="w-6 h-6" />
            </button>
        </div>
      </div>
      
      {/* Guide Settings Panel */}
      {isGuideSettingsOpen && (
        <div className="absolute top-20 right-4 z-20 w-64 bg-gray-800/80 border border-gray-700 rounded-lg p-4 backdrop-blur-md animate-fadeIn">
            <h4 className="font-bold mb-3 text-white">Guide Settings</h4>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <label htmlFor="showGuides" className="text-sm text-gray-300">Show Guides</label>
                    <input type="checkbox" id="showGuides" checked={showGuides} onChange={e => setShowGuides(e.target.checked)} className="toggle-switch" />
                </div>
                <div className="flex items-center justify-between">
                    <label htmlFor="showGrid" className="text-sm text-gray-300">Show Grid</label>
                    <input type="checkbox" id="showGrid" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} className="toggle-switch" />
                </div>
                 <div>
                    <label htmlFor="guideOpacity" className="block text-sm text-gray-300 mb-1">Guide Opacity</label>
                    <input
                      type="range"
                      id="guideOpacity"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={guideOpacity}
                      onChange={e => setGuideOpacity(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
                <div>
                    <label className="block text-sm text-gray-300 mb-2">Vehicle Type</label>
                    <VehicleTypeSelector selectedType={vehicleType!} onSelectType={setVehicleType} />
                </div>
            </div>
            {/* FIX: Replaced the <style> tag's children with the `dangerouslySetInnerHTML` prop to prevent the TSX parser from misinterpreting CSS as TypeScript, which caused compilation errors. */}
            <style dangerouslySetInnerHTML={{ __html: `
                .toggle-switch {
                    position: relative;
                    display: inline-block;
                    width: 34px;
                    height: 20px;
                    background-color: #4a5568;
                    border-radius: 20px;
                    transition: background-color 0.2s;
                    appearance: none;
                    cursor: pointer;
                }
                .toggle-switch:checked {
                    background-color: #3b82f6;
                }
                .toggle-switch::before {
                    content: '';
                    position: absolute;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background-color: white;
                    top: 2px;
                    left: 2px;
                    transition: transform 0.2s;
                }
                .toggle-switch:checked::before {
                    transform: translateX(14px);
                }
            `}}/>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewingImageIndex !== null && capturedImages[previewingImageIndex] && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 animate-fadeIn">
          <button
            type="button"
            onClick={() => setPreviewingImageIndex(null)}
            className="absolute top-4 right-4 p-3 bg-black/50 rounded-full hover:bg-white/20 transition-colors backdrop-blur-sm z-10"
            aria-label="Close preview"
          >
            <XIcon className="w-6 h-6" />
          </button>

          <div className="flex flex-col items-center justify-center h-full max-w-4xl w-full">
            <img
              src={capturedImages[previewingImageIndex]!.dataUrl}
              alt={`Preview of ${capturedImages[previewingImageIndex]!.shotName}`}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
            <p className="mt-4 text-gray-300 text-sm">
              {capturedImages[previewingImageIndex]!.shotName}
            </p>
          </div>
        </div>
      )}

      {/* Bottom Controls and Filmstrip */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-10 bg-gradient-to-t from-black/60 to-transparent">
        {/* Filmstrip */}
        <div ref={filmstripRef} className="flex items-center gap-2 overflow-x-auto pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {SHOT_LIST.map((shot, index) => {
              const capturedImageIndex = capturedImages.findIndex(img => img.shotName === shot.name);
              return (
                <FilmstripItem
                    key={shot.name}
                    shot={shot}
                    isCaptured={capturedShotNames.has(shot.name)}
                    isActive={index === currentShotIndex}
                    onSelectShot={() => setCurrentShotIndex(index)}
                    onPreviewImage={capturedImageIndex >= 0 ? () => setPreviewingImageIndex(capturedImageIndex) : undefined}
                />
              );
            })}
        </div>
        
        {/* Shutter Button & Done button */}
        <div className="flex items-center justify-center gap-x-16 mt-4">
            <div className="w-20"></div> {/* Spacer */}
            <button
                onClick={handleCapture}
                className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-4 border-gray-600 ring-4 ring-white/20 transition-transform duration-200 hover:scale-110 active:scale-95"
                aria-label="Capture photo"
            >
                <ShutterIcon className="w-16 h-16 text-gray-800" />
            </button>
            <button
              onClick={handleCaptureComplete}
              disabled={capturedImages.length === 0}
              className="w-20 h-20 bg-blue-600 rounded-full flex flex-col items-center justify-center text-white font-bold text-sm border-4 border-blue-400 disabled:bg-gray-600 disabled:border-gray-500 disabled:cursor-not-allowed transition-colors"
              aria-label="Finish photoshoot"
            >
              <CheckIcon className="w-6 h-6" />
              <span>Done</span>
              <span className="text-xs">({capturedImages.length})</span>
            </button>
        </div>
      </div>
    </div>
  );
};
