
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { SHOT_LIST } from './cameraShots';
import { Spinner } from '../Spinner';
import { ShutterIcon } from '../icons/ShutterIcon';
import { logger } from '../../utils/logger';
import { XIcon } from '../icons/XIcon';
import { CameraRotateIcon } from '../icons/CameraRotateIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { AdjustmentsIcon } from '../icons/AdjustmentsIcon';
import { VehicleTypeSelector } from './VehicleTypeSelector';
import type { VehicleType } from '../../types';
import { GridGuide } from '../icons/guides/GridGuide';
import { VEHICLE_TYPES } from './vehicleTypes';
import { shutterSoundDataUrl } from '../../assets/shutterSound';
import {
  computeTiltFromMotion,
  computeTiltFromOrientation,
  isDeviceLevel,
  smoothTilt,
  type TiltReading,
} from '../../utils/orientation';

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
  const [tilt, setTilt] = useState<TiltReading>({ roll: 0, pitch: 0 });
  const [showLevel, setShowLevel] = useState(() => {
    return localStorage.getItem('showLevel') !== 'false';
  });

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
  const motionAvailableRef = useRef(false);
  const levelIndicatorDotRef = useRef<HTMLDivElement>(null);
  const focusIndicatorRef = useRef<HTMLDivElement>(null);
  const guideOverlayWrapperRef = useRef<HTMLDivElement>(null);
  const gridOverlayWrapperRef = useRef<HTMLDivElement>(null);

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

  // Device orientation/accelerometer for level indicator
  useEffect(() => {
    if (!showLevel) return;

    let rafId: number | null = null;
    let isActive = true;

    const updateTilt = (next: TiltReading) => {
      if (!isActive) return;

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        setTilt(prev => smoothTilt(prev, next, 0.25));
      });
    };

    const handleMotion = (event: DeviceMotionEvent) => {
      motionAvailableRef.current = true;
      updateTilt(computeTiltFromMotion(event.accelerationIncludingGravity));
    };

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (motionAvailableRef.current) return;
      updateTilt(computeTiltFromOrientation(event.beta, event.gamma));
    };

    const requestPermissions = async () => {
      if (typeof DeviceOrientationEvent !== 'undefined') {
        const { requestPermission } = DeviceOrientationEvent as unknown as {
          requestPermission?: () => Promise<string>;
        };

        if (typeof requestPermission === 'function') {
          try {
            const status = await requestPermission();
            if (status !== 'granted') {
              logger.warn('Device orientation permission was not granted. Level indicator accuracy may be reduced.');
            }
          } catch (permissionError) {
            logger.warn('Device orientation permission request failed', permissionError);
          }
        }
      }

      if (typeof DeviceMotionEvent !== 'undefined') {
        const { requestPermission } = DeviceMotionEvent as unknown as {
          requestPermission?: () => Promise<string>;
        };

        if (typeof requestPermission === 'function') {
          try {
            const status = await requestPermission();
            if (status !== 'granted') {
              logger.warn('Device motion permission was not granted. Level indicator accuracy may be reduced.');
            }
          } catch (permissionError) {
            logger.warn('Device motion permission request failed', permissionError);
          }
        }
      }
    };

    requestPermissions().catch(error => logger.warn('Sensor permission request issue', error));

    window.addEventListener('devicemotion', handleMotion);
    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      isActive = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener('devicemotion', handleMotion);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [showLevel]);

  useEffect(() => {
    const dot = levelIndicatorDotRef.current;
    if (!dot) return;

    const clampValue = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
    const rollOffset = clampValue(tilt.roll, -20, 20) * 1.4;
    const pitchOffset = clampValue(tilt.pitch, -20, 20) * 1.4;

    dot.style.transform = `translate(${rollOffset}px, ${pitchOffset}px)`;
  }, [tilt]);

  useEffect(() => {
    if (!focusPoint) return;
    const indicator = focusIndicatorRef.current;
    if (!indicator) return;

    indicator.style.left = `${focusPoint.x}px`;
    indicator.style.top = `${focusPoint.y}px`;
    indicator.style.transform = 'translate(-50%, -50%)';
  }, [focusPoint]);

  useEffect(() => {
    const guideWrapper = guideOverlayWrapperRef.current;
    if (!guideWrapper) return;
    guideWrapper.style.opacity = streamStarted ? String(guideOpacity) : '0';
  }, [guideOpacity, streamStarted]);

  useEffect(() => {
    const gridWrapper = gridOverlayWrapperRef.current;
    if (!gridWrapper) return;
    gridWrapper.style.opacity = streamStarted ? '0.3' : '0';
  }, [streamStarted, showGrid]);

  useEffect(() => {
    localStorage.setItem('showGuides', String(showGuides));
  }, [showGuides]);

  useEffect(() => {
    localStorage.setItem('showGrid', String(showGrid));
  }, [showGrid]);

  useEffect(() => {
    localStorage.setItem('showLevel', String(showLevel));
  }, [showLevel]);

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
  const isLevelAligned = isDeviceLevel(tilt, { rollThreshold: 2.5, pitchThreshold: 3.5 });

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
      logger.error('Error accessing camera:', err);
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
    track.applyConstraints(constraints).catch(err => logger.error('Focus failed', err));
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
            logger.error(`Failed to convert image ${index}:`, error);
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
            logger.error(`Image ${index} conversion failed:`, result.reason);
            return null;
          }
        })
        .filter((file: File | null): file is File => file !== null);

      if (files.length === 0) {
        logger.error('No images were successfully converted');
        return;
      }

      if (files.length < capturedImages.length) {
        logger.warn(`Only ${files.length} of ${capturedImages.length} images were successfully converted`);
      }

      onCaptureComplete(files);
    } catch (error) {
      logger.error('Error during capture completion:', error);
    }
  }, [capturedImages, onCaptureComplete]);

  useEffect(() => {
    if (initialSelectionDone) {
      startStream();
    }

    const videoElement = videoRef.current;

    return () => {
      const currentStream = (videoElement?.srcObject as MediaStream | null) ?? null;

      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }

      if (videoElement) {
        videoElement.srcObject = null;
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
          <div
            ref={guideOverlayWrapperRef}
            className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300"
          >
            <GuideOverlay
              vehicleType={vehicleType}
              category={currentShot.category}
              className="h-full w-full"
            />
          </div>
        )}
        {showGrid && (
          <div
            ref={gridOverlayWrapperRef}
            className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300"
          >
            <GridGuide className="h-full w-full" />
          </div>
        )}

        {/* Level Indicator */}
        {showLevel && streamStarted && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div
                className={`relative flex h-28 w-28 items-center justify-center rounded-full border-2 ${
                  isLevelAligned ? 'border-emerald-400/80' : 'border-yellow-300/70'
                } bg-black/40 backdrop-blur-sm transition-colors duration-200`}
              >
                <div className="absolute inset-4 rounded-full border border-white/15" />
                <div
                  ref={levelIndicatorDotRef}
                  className={`h-3 w-3 rounded-full transition-colors duration-200 ${
                    isLevelAligned
                      ? 'bg-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.6)]'
                      : 'bg-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.5)]'
                  }`}
                />
              </div>
              <div className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-white/80">
                <span>{`${tilt.roll >= 0 ? '↷' : '↶'} ${Math.abs(tilt.roll).toFixed(1)}°`}</span>
                <span className="text-white/30">|</span>
                <span>{`${tilt.pitch >= 0 ? '↑' : '↓'} ${Math.abs(tilt.pitch).toFixed(1)}°`}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tap-to-focus animation */}
        {focusPoint && (
          <div
            ref={focusIndicatorRef}
            className="absolute border-2 border-yellow-400 w-16 h-16 rounded-full animate-focus pointer-events-none"
          />
        )}

        {/* Shutter visual effect */}
        <div key={shutterKey} className="absolute inset-0 rounded-full animate-shutter-burst pointer-events-none" />
      </div>

      {/* Clean Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center z-10">
        <button
          onClick={onClose}
          className="p-2 sm:p-3 bg-black/50 rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm flex-shrink-0"
          aria-label="Close camera"
        >
          <XIcon className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <div className="text-center px-2 py-1.5 sm:px-3 sm:py-2 bg-black/50 rounded-full backdrop-blur-sm flex-1 mx-2 sm:mx-3 max-w-md">
            <h3 className="font-semibold text-sm sm:text-base leading-tight truncate">{currentShot.name}</h3>
        </div>

        <button
          onClick={() => setIsGuideSettingsOpen(prev => !prev)}
          className={`p-2 sm:p-3 rounded-full transition-colors backdrop-blur-sm flex-shrink-0 ${isGuideSettingsOpen ? 'bg-blue-600' : 'bg-black/50 hover:bg-black/70'}`}
          aria-label="Settings"
        >
          <AdjustmentsIcon className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
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
                <div className="flex items-center justify-between">
                    <label htmlFor="showLevel" className="text-sm text-gray-300">Show Level</label>
                    <input type="checkbox" id="showLevel" checked={showLevel} onChange={e => setShowLevel(e.target.checked)} className="toggle-switch" />
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
        {/* Compact Filmstrip and Controls */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 sm:pb-3 scrollbar-hide">
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

        {/* Controls Row */}
        <div className="flex items-center justify-between w-full px-4 mt-2 sm:mt-3">
            {/* Left: Camera Switch */}
            <button
              onClick={toggleFacingMode}
              className="p-2.5 sm:p-3 bg-black/50 rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm"
              aria-label="Switch camera"
            >
              <CameraRotateIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Center: Done Button */}
            <button
              onClick={handleCaptureComplete}
              disabled={capturedImages.length === 0}
              className={`px-4 sm:px-6 py-2 sm:py-3 rounded-full font-semibold transition-all text-sm sm:text-base ${
                capturedImages.length > 0
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
              aria-label="Finish photoshoot"
            >
              Done ({capturedImages.length})
            </button>

            {/* Right: Red Shutter Button */}
            <button
              onClick={handleCapture}
              className="w-16 h-16 sm:w-20 sm:h-20 bg-red-600 rounded-full flex items-center justify-center border-4 border-white shadow-2xl transition-transform duration-200 hover:scale-110 active:scale-95"
              aria-label="Capture photo"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-500 rounded-full border-2 border-white"></div>
            </button>
        </div>
      </div>
    </div>
  );
};
