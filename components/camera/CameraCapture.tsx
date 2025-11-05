import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { AdjustmentsIcon } from '../icons/AdjustmentsIcon';
import { CameraRotateIcon } from '../icons/CameraRotateIcon';
import { XIcon } from '../icons/XIcon';
import { Spinner } from '../Spinner';
import { FilmstripItem } from './FilmstripItem';
import { InitialVehicleSelection } from './InitialVehicleSelection';
import { SHOT_LIST } from './cameraShots';
import type { VehicleType } from '../../types';
import { GridGuide } from '../icons/guides/GridGuide';
import { shutterSoundDataUrl } from '../../assets/shutterSound';
import { LevelIndicator } from './LevelIndicator';
import {
  computeTiltFromMotion,
  computeTiltFromOrientation,
  isDeviceLevel,
  smoothTilt,
  type TiltReading,
} from '../../utils/orientation';
import { ImageViewer } from '../ImageViewer';
import { logger } from '../../utils/logger';

interface CameraCaptureProps {
  onClose: () => void;
  onCaptureComplete: (files: File[]) => void;
}

export const CameraCapture = ({ onClose, onCaptureComplete }: CameraCaptureProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [capturedImages, setCapturedImages] = useState<{ dataUrl: string; shotName: string }[]>([]);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [tilt, setTilt] = useState<TiltReading>({ roll: 0, pitch: 0 });
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [initialSelectionDone, setInitialSelectionDone] = useState(false);
  const [isGuideSettingsOpen, setIsGuideSettingsOpen] = useState(false);
  const [shutterKey, setShutterKey] = useState(0);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [streamStarted, setStreamStarted] = useState(false);
  const [previewingImageIndex, setPreviewingImageIndex] = useState<number | null>(null);

  const [showGuides, setShowGuides] = useState(() => localStorage.getItem('showGuides') !== 'false');
  const [showGrid, setShowGrid] = useState(() => localStorage.getItem('showGrid') === 'true');
  const [showLevel, setShowLevel] = useState(() => localStorage.getItem('showLevel') !== 'false');
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
  const focusIndicatorRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const capturedShotNames = useMemo(() => new Set(capturedImages.map(c => c.shotName)), [capturedImages]);
  const currentShot = SHOT_LIST[currentShotIndex];
  const GuideOverlay = currentShot.overlay;
  const isLevelAligned = isDeviceLevel(tilt, { rollThreshold: 2.5, pitchThreshold: 3.5 });
  const allShotsCompleted = capturedImages.length === SHOT_LIST.length;

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.readyState >= 2) {
      setShutterKey(prev => prev + 1);

      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => logger.warn("Audio play failed", e));
      }

      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

        const newCapturedImages = [...capturedImages, { dataUrl, shotName: currentShot.id }];
        setCapturedImages(newCapturedImages);

        const newCapturedShotNames = new Set(newCapturedImages.map(c => c.shotName));

        const nextUncapturedIndex = SHOT_LIST.findIndex((shot, index) => index > currentShotIndex && !newCapturedShotNames.has(shot.id));
        const firstUncapturedIndex = SHOT_LIST.findIndex(shot => !newCapturedShotNames.has(shot.id));

        if (nextUncapturedIndex !== -1) {
          setCurrentShotIndex(nextUncapturedIndex);
        } else if (firstUncapturedIndex !== -1) {
          setCurrentShotIndex(firstUncapturedIndex);
        } else {
          // All shots are captured
        }
      }
    }
  }, [currentShot.id, capturedImages, currentShotIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (isLevelAligned) {
          handleCapture();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLevelAligned, handleCapture]);

  useEffect(() => {
    const shutterAudio = new Audio(shutterSoundDataUrl);
    shutterAudio.preload = 'auto';
    audioRef.current = shutterAudio;
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!showLevel) return;
    let rafId: number;
    const updateTilt = (next: TiltReading) => {
      cancelAnimationFrame(rafId);
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
        try {
            if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
                await (DeviceOrientationEvent as any).requestPermission();
            }
            if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
                await (DeviceMotionEvent as any).requestPermission();
            }
        } catch (e) {
            logger.warn("Sensor permission request failed", e);
        }
    };

    requestPermissions().then(() => {
        window.addEventListener('devicemotion', handleMotion);
        window.addEventListener('deviceorientation', handleOrientation);
    });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('devicemotion', handleMotion);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [showLevel]);

  useEffect(() => { localStorage.setItem('showGuides', String(showGuides)); }, [showGuides]);
  useEffect(() => { localStorage.setItem('showGrid', String(showGrid)); }, [showGrid]);
  useEffect(() => { localStorage.setItem('showLevel', String(showLevel)); }, [showLevel]);
  useEffect(() => { localStorage.setItem('guideOpacity', String(guideOpacity)); }, [guideOpacity]);
  useEffect(() => { if (vehicleType) localStorage.setItem('vehicleType', vehicleType); }, [vehicleType]);

  const handleInitialSelect = (type: VehicleType) => {
    setVehicleType(type);
    setInitialSelectionDone(true);
  };

  useEffect(() => {
    const activeItem = filmstripRef.current?.children[currentShotIndex] as HTMLElement;
    if (activeItem) {
      activeItem.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [currentShotIndex]);

  useEffect(() => {
    const setTrueFullscreen = () => {
      if (containerRef.current) {
        containerRef.current.style.height = `${window.innerHeight}px`;
      }
    };
    setTrueFullscreen();
    window.addEventListener('resize', setTrueFullscreen);
    return () => window.removeEventListener('resize', setTrueFullscreen);
  }, []);

  const startStream = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera API not supported.');
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
      const constraints: MediaStreamConstraints = {
        video: { facingMode, width: { ideal: 4096 }, height: { ideal: 2160 } },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreamStarted(true);
      }
    } catch (err) {
      logger.error('Error accessing camera:', err);
      let message = 'Could not access the camera. ';
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') message += 'Please grant camera permissions.';
        else if (err.name === 'NotFoundError') message += 'No camera found.';
        else message += 'An unexpected error occurred.';
      }
      setError(message);
    } finally {
      setIsLoading(false);
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
    const [track] = (video.srcObject as MediaStream).getVideoTracks();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setFocusPoint({ x, y });
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    focusTimerRef.current = window.setTimeout(() => setFocusPoint(null), 1500);
    const constraints = { advanced: [{ focusMode: 'manual', pointsOfInterest: [{ x: x / rect.width, y: y / rect.height }] }] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    track.applyConstraints(constraints as any).catch(err => logger.error('Focus failed', err));
  }, []);

  const toggleFacingMode = useCallback(() => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  }, []);

  useEffect(() => {
    if (initialSelectionDone) startStream();
    const videoElement = videoRef.current;
    return () => {
      if (videoElement?.srcObject) {
        (videoElement.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [startStream, initialSelectionDone]);

  const handleDone = () => {
    const files = capturedImages.map(img => {
      const byteString = atob(img.dataUrl.split(',')[1]);
      const mimeString = img.dataUrl.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: mimeString });
      return new File([blob], `${img.shotName}.jpg`, { type: 'image/jpeg' });
    });
    onCaptureComplete(files);
  };

  if (!initialSelectionDone) {
    return <InitialVehicleSelection onSelect={handleInitialSelect} />;
  }

  return (
    <>
      <div ref={containerRef} className="fixed inset-0 bg-black z-40 flex flex-col items-center justify-center text-white">
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden" onClick={handleFocus}>
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-30">
              <Spinner />
              <p className="mt-4 text-lg">Starting camera...</p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-30 p-4">
              <div className="text-red-400 mb-4"><XIcon className="w-16 h-16" /></div>
              <h2 className="text-xl font-bold mb-2">Camera Error</h2>
              <p className="text-center text-gray-300">{error}</p>
              <button onClick={startStream} className="mt-6 px-6 py-2 bg-blue-600 rounded-lg font-semibold hover:bg-blue-700 transition-colors">Retry</button>
            </div>
          )}
          <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-contain transition-opacity duration-500 ${streamStarted ? 'opacity-100' : 'opacity-0'}`} onCanPlay={handleCanPlay} />
          <div ref={focusIndicatorRef} className={`absolute w-16 h-16 border-2 border-yellow-400 rounded-full transition-all duration-300 ${focusPoint ? 'opacity-100 scale-100' : 'opacity-0 scale-125'}`} style={focusPoint ? { left: `${focusPoint.x}px`, top: `${focusPoint.y}px`, transform: 'translate(-50%, -50%)' } : {}} />
          <div
            className="guide-overlay-wrapper"
            style={{ '--guide-opacity': showGuides ? guideOpacity : 0 } as React.CSSProperties}
          >
            {streamStarted && <GuideOverlay />}
          </div>
          <div className={`grid-overlay-wrapper ${showGrid ? 'opacity-30' : 'opacity-0'}`}>{streamStarted && <GridGuide />}</div>
          {showLevel && streamStarted && <LevelIndicator tilt={tilt} isAligned={isLevelAligned} />}
        </div>
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
          <div className="p-4 bg-gradient-to-b from-black/70 to-transparent flex justify-between items-start">
            <button onClick={onClose} className="p-3 bg-black/40 rounded-full hover:bg-black/60 transition-colors pointer-events-auto" aria-label="Close camera"><XIcon className="w-6 h-6" /></button>
            <div className="flex flex-col items-center space-y-2">
              <div className="text-sm font-bold bg-black/40 px-3 py-1 rounded-full">{capturedImages.length} / {SHOT_LIST.length} Completed</div>
              <div className="text-lg font-bold text-center p-2 rounded-lg bg-black/40">{currentShot.name}</div>
            </div>
            <button onClick={() => setIsGuideSettingsOpen(true)} className="p-3 bg-black/40 rounded-full hover:bg-black/60 transition-colors pointer-events-auto" aria-label="Adjustments"><AdjustmentsIcon className="w-6 h-6" /></button>
          </div>
          <div className="w-full p-4 bg-gradient-to-t from-black/70 to-transparent flex flex-col items-center">
            <div ref={filmstripRef} className="flex items-center space-x-2 overflow-x-auto py-2 w-full pointer-events-auto scrollbar-hide">
              {SHOT_LIST.map((shot, index) => (
                <FilmstripItem
                  key={shot.id}
                  shot={shot}
                  isCaptured={capturedShotNames.has(shot.id)}
                  isActive={index === currentShotIndex}
                  onSelectShot={() => setCurrentShotIndex(index)}
                  onPreviewImage={() => {
                    const capturedIndex = capturedImages.findIndex(img => img.shotName === shot.id);
                    if (capturedIndex !== -1) setPreviewingImageIndex(capturedIndex);
                  }}
                />
              ))}
            </div>
            <div className="flex items-center justify-around w-full max-w-md mt-4 pointer-events-auto">
              <button onClick={toggleFacingMode} className="p-4 bg-black/40 rounded-full hover:bg-black/60 transition-colors" aria-label="Toggle camera"><CameraRotateIcon className="w-7 h-7" /></button>
              <button key={shutterKey} onClick={handleCapture} disabled={!isLevelAligned} className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all duration-200 ${isLevelAligned ? 'bg-white/30 hover:bg-white/50' : 'bg-red-500/40 cursor-not-allowed'} animate-shutter-in`} aria-label="Capture photo">
                <div className="w-16 h-16 bg-white rounded-full" />
              </button>
              {allShotsCompleted ? (
                <button onClick={handleDone} className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-all transform hover:scale-105">Done</button>
              ) : (
                <div className="w-24 h-16" />
              )}
            </div>
          </div>
        </div>
        {isGuideSettingsOpen && (
          <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center pointer-events-auto">
            <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm m-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Guide Settings</h3>
                <button onClick={() => setIsGuideSettingsOpen(false)} className="p-2 rounded-full hover:bg-gray-800" aria-label="Close guide settings"><XIcon className="w-6 h-6" /></button>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="guide-opacity" className="font-semibold">Guide Opacity</label>
                  <div className="flex items-center space-x-4">
                    <input id="guide-opacity" type="range" min="0" max="1" step="0.1" value={guideOpacity} onChange={(e) => setGuideOpacity(parseFloat(e.target.value))} className="w-full" />
                    <span className="text-sm font-mono w-10">{guideOpacity.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="show-grid" className="font-semibold">Show 3x3 Grid</label>
                  <button onClick={() => setShowGrid(!showGrid)} className={`w-14 h-8 rounded-full flex items-center transition-colors ${showGrid ? 'bg-blue-600' : 'bg-gray-700'}`} aria-label={showGrid ? 'Hide 3x3 grid' : 'Show 3x3 grid'}>
                    <span className={`inline-block w-6 h-6 bg-white rounded-full transform transition-transform ${showGrid ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="show-level" className="font-semibold">Show Level</label>
                  <button onClick={() => setShowLevel(!showLevel)} className={`w-14 h-8 rounded-full flex items-center transition-colors ${showLevel ? 'bg-blue-600' : 'bg-gray-700'}`} aria-label={showLevel ? 'Hide level indicator' : 'Show level indicator'}>
                    <span className={`inline-block w-6 h-6 bg-white rounded-full transform transition-transform ${showLevel ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {previewingImageIndex !== null && (
          <ImageViewer
            images={capturedImages.map(img => ({
              id: img.shotName,
              originalFile: new File([], `${img.shotName}.jpg`),
              originalUrl: img.dataUrl,
              processedUrl: null,
              status: 'completed',
              error: null,
            }))}
            currentIndex={previewingImageIndex}
            onClose={() => setPreviewingImageIndex(null)}
            onNavigate={() => {}}
            onRecreateBackground={() => {}}
            onRetouch={() => {}}
            onHeroRender={() => {}}
          />
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </>
  );
};
