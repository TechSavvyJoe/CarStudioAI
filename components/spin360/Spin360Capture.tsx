import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ImageFile, VehicleType, Spin360Set } from '../../types';
import { CameraIcon } from '../icons/CameraIcon';
import { XIcon } from '../icons/XIcon';
import { shutterSoundDataUrl } from '../../assets/shutterSound';
import { logger } from '../../utils/logger';
import {
  TOTAL_ANGLES,
  getTargetAngle,
  getNearestTargetIndex,
  isWithinTolerance,
  getDirectionGuidance,
  getProgressPercentage,
  getNextUncapturedIndex,
  normalizeAngle,
} from './angleHelper';
import { ARProgressRing } from './ARProgressRing';
import {
  computeTiltFromMotion,
  computeTiltFromOrientation,
  isDeviceLevel,
  smoothTilt,
  type TiltReading,
} from '../../utils/orientation';

interface Spin360CaptureProps {
  vehicleType: VehicleType;
  onComplete: (spin360Set: Spin360Set) => void;
  onCancel: () => void;
}

type StatusVariant = 'ok' | 'warn' | 'info';

const badgeVariants: Record<StatusVariant, string> = {
  ok: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
  warn: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
  info: 'border-blue-400/40 bg-blue-500/10 text-blue-100',
};

const StatusBadge: React.FC<{
  label: string;
  value: string;
  variant?: StatusVariant;
  icon?: React.ReactNode;
}> = ({ label, value, variant = 'info', icon }) => (
  <div className={`pointer-events-none rounded-full border px-3 py-1 text-[11px] font-medium backdrop-blur-sm ${badgeVariants[variant]}`}>
    <span className="mr-1 text-white/50">{label}:</span>
    {icon && <span className="mr-1 inline-flex items-center align-middle">{icon}</span>}
    <span>{value}</span>
  </div>
);

type StabilizationConstraint = MediaTrackConstraintSet & {
  imageStabilization?: boolean;
  opticalStabilization?: boolean;
};

export const Spin360Capture: React.FC<Spin360CaptureProps> = ({
  vehicleType,
  onComplete,
  onCancel,
}) => {
  const [currentAngle, setCurrentAngle] = useState<number>(0);
  const [capturedImages, setCapturedImages] = useState<ImageFile[]>([]);
  const [capturedIndices, setCapturedIndices] = useState<Set<number>>(new Set());
  const [targetIndex, setTargetIndex] = useState<number>(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [autoCapture, setAutoCapture] = useState(true);
  const [hasCompass, setHasCompass] = useState(false);
  const [initialAngle, setInitialAngle] = useState<number | null>(null);

  // Enhanced sensor states
  const [tilt, setTilt] = useState<TiltReading>({ roll: 0, pitch: 0 });
  const [isLevelWarning, setIsLevelWarning] = useState(false);
  const [accelerationData, setAccelerationData] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const [hasMotionSensors, setHasMotionSensors] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hasLidar, setHasLidar] = useState(false);
  const [shootTimer, setShootTimer] = useState<number>(0);
  const [movementSpeed, setMovementSpeed] = useState<number>(0);
  const [hasStabilization, setHasStabilization] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shutterAudioRef = useRef<HTMLAudioElement | null>(null);
  const spin360Id = useRef<string>(`spin360-${Date.now()}`);
  const motionAvailableRef = useRef(false);
  const levelIndicatorDotRef = useRef<HTMLDivElement>(null);

  // Initialize camera
  useEffect(() => {
  let activeStream: MediaStream | null = null;
  let videoElement: HTMLVideoElement | null = null;

    const initCamera = async () => {
      try {
        // Check for LiDAR support (iOS devices with depth camera)
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        // LiDAR is available on newer iPhones/iPads with multiple rear cameras
        const hasDepthCamera = videoDevices.length > 2; // Typical LiDAR devices have 3+ cameras
        setHasLidar(hasDepthCamera);

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });

        const videoTrack = mediaStream.getVideoTracks()[0];
        const advancedConstraints: StabilizationConstraint = {
          imageStabilization: true,
          opticalStabilization: true,
        };

        videoTrack
          .applyConstraints?.({ advanced: [advancedConstraints] })
          .catch(() => undefined);

        const capabilities = videoTrack.getCapabilities?.() as Partial<StabilizationConstraint> | undefined;
        setHasStabilization(capabilities?.imageStabilization === true);

        activeStream = mediaStream;
        videoElement = videoRef.current;
        if (videoElement) {
          videoElement.srcObject = mediaStream;
        }
      } catch (error) {
        logger.error('Camera access error:', error);
        alert('Cannot access camera. Please grant camera permissions.');
      }
    };

    initCamera();

    // Initialize shutter sound
    const audio = new Audio(shutterSoundDataUrl);
    shutterAudioRef.current = audio;

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      if (videoElement) {
        videoElement.srcObject = null;
      }
      shutterAudioRef.current = null;
    };
  }, []);

  // Shoot timer
  useEffect(() => {
    const timer = setInterval(() => {
      setShootTimer(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Movement speed calculation based on angle change
  useEffect(() => {
    const lastAngleRef = { current: currentAngle, time: Date.now() };

    const speedInterval = setInterval(() => {
      const now = Date.now();
      const timeDiff = (now - lastAngleRef.time) / 1000; // seconds
      const angleDiff = Math.abs(currentAngle - lastAngleRef.current);

      if (timeDiff > 0) {
        const degreesPerSecond = angleDiff / timeDiff;
        // Convert to speed multiplier (ideal is ~10-15 degrees/second = 1x)
        const speedMultiplier = degreesPerSecond / 12;
        setMovementSpeed(Number(speedMultiplier.toFixed(1)));
      }

      lastAngleRef.current = currentAngle;
      lastAngleRef.time = now;
    }, 500);

    return () => clearInterval(speedInterval);
  }, [currentAngle]);

  // Device orientation tracking for compass, tilt, and stability signals
  useEffect(() => {
    const levelThresholds = { rollThreshold: 3.5, pitchThreshold: 4.5 } as const;
    let rafId: number | null = null;
    let isActive = true;

    const updateTiltState = (reading: TiltReading) => {
      if (!isActive) return;

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        setTilt(prev => {
          const blended = smoothTilt(prev, reading, 0.25);
          setIsLevelWarning(!isDeviceLevel(blended, levelThresholds));
          return blended;
        });
      });
    };

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha !== null) {
        setHasCompass(true);
        const compassHeading = normalizeAngle(360 - event.alpha);

        if (initialAngle === null) {
          setInitialAngle(compassHeading);
          setCurrentAngle(0);
        } else {
          const relativeAngle = normalizeAngle(compassHeading - initialAngle);
          setCurrentAngle(relativeAngle);
        }
      }

      if (motionAvailableRef.current) return;
      updateTiltState(computeTiltFromOrientation(event.beta, event.gamma));
    };

    const handleMotion = (event: DeviceMotionEvent) => {
      motionAvailableRef.current = true;
      setHasMotionSensors(true);

      const acceleration = event.accelerationIncludingGravity ?? event.acceleration;

      setAccelerationData({
        x: acceleration?.x ?? 0,
        y: acceleration?.y ?? 0,
        z: acceleration?.z ?? 0,
      });

      updateTiltState(computeTiltFromMotion(acceleration));
    };

    const requestPermissions = async () => {
      if (typeof DeviceOrientationEvent !== 'undefined') {
        const orientationPermission = (DeviceOrientationEvent as unknown as {
          requestPermission?: () => Promise<string>;
        }).requestPermission;

        if (typeof orientationPermission === 'function') {
          try {
            const status = await orientationPermission();
            if (status !== 'granted') {
              logger.warn('Device orientation permission was not granted for 360 capture.');
            }
          } catch (error) {
            logger.warn('Device orientation permission request failed', error);
          }
        }
      }

      if (typeof DeviceMotionEvent !== 'undefined') {
        const motionPermission = (DeviceMotionEvent as unknown as {
          requestPermission?: () => Promise<string>;
        }).requestPermission;

        if (typeof motionPermission === 'function') {
          try {
            const status = await motionPermission();
            if (status !== 'granted') {
              logger.warn('Device motion permission was not granted for 360 capture.');
            }
          } catch (error) {
            logger.warn('Device motion permission request failed', error);
          }
        }
      }
    };

    requestPermissions().catch(error => logger.warn('Sensor permission request issue', error));

    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('devicemotion', handleMotion);

    return () => {
      isActive = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [initialAngle]);

  useEffect(() => {
    const dot = levelIndicatorDotRef.current;
    if (!dot) return;

    const clampValue = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
    const rollOffset = clampValue(tilt.roll, -20, 20) * 1.2;
    const pitchOffset = clampValue(tilt.pitch, -20, 20) * 1.2;

    dot.style.transform = `translate(${rollOffset}px, ${pitchOffset}px)`;
  }, [tilt]);

  // GPS location tracking
  useEffect(() => {
    if (!navigator.geolocation) {
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setGpsLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        logger.warn('GPS error:', error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 5000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const completeSpin360 = useCallback((allImages: ImageFile[]) => {
    const sortedImages = [...allImages].sort((a, b) =>
      (a.spin360Index ?? 0) - (b.spin360Index ?? 0)
    );

    const spin360Set: Spin360Set = {
      id: spin360Id.current,
      name: `360 Spin - ${new Date().toLocaleString()}`,
      vehicleType,
      timestamp: Date.now(),
      images: sortedImages,
      totalAngles: TOTAL_ANGLES,
      isComplete: true,
    };

    onComplete(spin360Set);
  }, [onComplete, vehicleType]);

  const captureImage = useCallback(async () => {
    if (isCapturing || !videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.drawImage(video, 0, 0);

      if (shutterAudioRef.current) {
        shutterAudioRef.current.currentTime = 0;
        shutterAudioRef.current.play().catch(() => {});
      }

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], `360-${targetIndex}.jpg`, { type: 'image/jpeg' });
        const imageUrl = URL.createObjectURL(blob);

        const imageFile: ImageFile = {
          id: `${spin360Id.current}-${targetIndex}`,
          originalFile: file,
          originalUrl: imageUrl,
          processedUrl: null,
          status: 'pending',
          error: null,
          spin360Id: spin360Id.current,
          spin360Index: targetIndex,
          spin360Angle: getTargetAngle(targetIndex),
        };

        const updatedImages = [...capturedImages, imageFile];
        const updatedIndices = new Set(capturedIndices);
        updatedIndices.add(targetIndex);

        setCapturedImages(updatedImages);
        setCapturedIndices(updatedIndices);

        const nextIndex = getNextUncapturedIndex(updatedIndices);

        if (nextIndex !== null) {
          setTargetIndex(nextIndex);
        } else {
          completeSpin360(updatedImages);
        }

        setIsCapturing(false);
      }, 'image/jpeg', 0.95);

    } catch (error) {
      logger.error('Capture error:', error);
      setIsCapturing(false);
    }
  }, [capturedImages, capturedIndices, completeSpin360, isCapturing, targetIndex]);

  useEffect(() => {
    if (!autoCapture || isCapturing || isLevelWarning) {
      return;
    }

    const targetAngle = getTargetAngle(targetIndex);
    if (isWithinTolerance(currentAngle, targetAngle) && !capturedIndices.has(targetIndex)) {
      captureImage();
    }
  }, [autoCapture, captureImage, capturedIndices, currentAngle, isCapturing, isLevelWarning, targetIndex]);

  const handleComplete = () => {
    if (capturedImages.length >= 8) {
      completeSpin360(capturedImages);
    }
  };

  const targetAngle = getTargetAngle(targetIndex);
  const guidance = getDirectionGuidance(currentAngle, targetAngle);
  const progress = getProgressPercentage(capturedIndices.size);
  const isAligned = isWithinTolerance(currentAngle, targetAngle);
  const isLevelAligned = !isLevelWarning;
  const rollDegrees = Math.abs(tilt.roll);
  const pitchDegrees = Math.abs(tilt.pitch);
  const formattedTimer = formatTime(shootTimer);
  const speedDisplay = movementSpeed.toFixed(1);
  const accelerationMagnitude = Math.sqrt(
    accelerationData.x ** 2 + accelerationData.y ** 2 + accelerationData.z ** 2,
  );
  const isDeviceStable = accelerationMagnitude < 1.2;
  const sensorsStatus = hasMotionSensors ? 'Active' : 'Limited';
  const gpsStatus = gpsLocation ? 'Locked' : 'Searching';
  const isSpeedOptimal = movementSpeed >= 0.8 && movementSpeed <= 1.4;

  // Format timer as MM:SS
  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Get vehicle type display name
  const vehicleTypeDisplay = vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Video Preview */}
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* Canvas for capture (hidden) */}
        <canvas ref={canvasRef} className="hidden" />

        {/* AR Progress Ring Overlay - Always Visible */}
        <ARProgressRing
          capturedAngles={Array.from(capturedIndices).map(idx => getTargetAngle(idx))}
          totalShots={TOTAL_ANGLES}
          currentAngle={getTargetAngle(targetIndex)}
          size={280}
          strokeWidth={8}
        />

        {/* Spyne AI Style Overlay */}
        <div className="absolute inset-0 pointer-events-none">

          {/* Top Left - Back Button */}
          <button
            onClick={onCancel}
            className="absolute top-4 left-4 w-12 h-12 rounded-full bg-black/50 backdrop-blur flex items-center justify-center pointer-events-auto hover:bg-black/70 transition-colors"
            aria-label="Back"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Clean Top Bar */}
          <div className="absolute top-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-10">
            <button
              onClick={onCancel}
              className="p-2 sm:p-3 bg-black/50 rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm"
              aria-label="Close 360 capture"
            >
              <XIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </button>

            <div className="flex items-center gap-2 sm:gap-3 bg-black/50 backdrop-blur-sm rounded-full px-3 sm:px-4 py-2">
              <div className="text-xl sm:text-2xl font-bold text-white">{capturedIndices.size}</div>
              <div className="text-xs sm:text-sm text-gray-300">/ {TOTAL_ANGLES}</div>
            </div>

            <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 sm:px-4 py-2">
              <div className="text-xs sm:text-sm font-semibold text-white">{Math.round(currentAngle)}°</div>
            </div>
          </div>

          {/* Sensor & Telemetry Badges */}
          <div className="absolute top-16 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-2 px-4 pointer-events-none">
            <StatusBadge label="Vehicle" value={vehicleTypeDisplay} />
            <StatusBadge label="Timer" value={formattedTimer} />
            <StatusBadge label="Speed" value={`${speedDisplay}x`} variant={isSpeedOptimal ? 'ok' : 'warn'} />
            <StatusBadge label="Level" value={`${rollDegrees.toFixed(1)}° / ${pitchDegrees.toFixed(1)}°`} variant={isLevelAligned ? 'ok' : 'warn'} />
            <StatusBadge label="Stability" value={isDeviceStable ? 'Steady' : 'Unsteady'} variant={isDeviceStable ? 'ok' : 'warn'} />
            {hasStabilization && (
              <StatusBadge
                label="Stabilization"
                value="Active"
                variant="info"
                icon={<CameraIcon className="h-3 w-3 text-blue-200" />}
              />
            )}
            {hasLidar && <StatusBadge label="LiDAR" value="Detected" variant="info" />}
            <StatusBadge label="Sensors" value={sensorsStatus} variant={hasMotionSensors ? 'ok' : 'warn'} />
            <StatusBadge label="GPS" value={gpsStatus} variant={gpsLocation ? 'ok' : 'warn'} />
          </div>

          {/* Bottom Controls Bar */}
          <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/80 to-transparent z-10">
            <div className="flex items-center justify-between max-w-4xl mx-auto">

              {/* Left: Mode Toggle */}
              <button
                onClick={() => setAutoCapture(!autoCapture)}
                className={`px-3 sm:px-4 py-2 rounded-full font-medium transition-all text-sm sm:text-base ${
                  autoCapture
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                    : 'bg-white/20 text-white backdrop-blur-sm'
                }`}
              >
                {autoCapture ? 'Auto' : 'Manual'}
              </button>

              {/* Center: Done Button */}
              <button
                onClick={handleComplete}
                disabled={capturedIndices.size < 8}
                className={`px-4 sm:px-6 py-2 rounded-full font-semibold transition-all text-sm sm:text-base ${
                  capturedIndices.size >= 8
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                Done
              </button>

              {/* Right: Red Shutter Button */}
              <button
                onClick={autoCapture ? undefined : captureImage}
                disabled={autoCapture || isCapturing}
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-white shadow-2xl transition-all flex items-center justify-center ${
                  autoCapture && isAligned
                    ? 'bg-red-600 animate-pulse'
                    : autoCapture
                    ? 'bg-red-600 opacity-50'
                    : 'bg-red-600 hover:bg-red-700 active:scale-95'
                }`}
                aria-label="Capture photo"
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-600 rounded-full border-2 border-white" />
              </button>
            </div>
          </div>

          {/* Minimal Center Progress Ring */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-48 h-48 sm:w-64 sm:h-64">
              {/* Background circle */}
              <circle
                cx="96"
                cy="96"
                r="88"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="2"
                className="sm:hidden"
              />
              <circle
                cx="128"
                cy="128"
                r="120"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="2"
                className="hidden sm:block"
              />

              {/* Progress arc */}
              <circle
                cx="96"
                cy="96"
                r="88"
                fill="none"
                stroke="#10b981"
                strokeWidth="4"
                strokeDasharray={`${(progress / 100) * 553} 553`}
                strokeLinecap="round"
                transform="rotate(-90 96 96)"
                className="sm:hidden"
              />
              <circle
                cx="128"
                cy="128"
                r="120"
                fill="none"
                stroke="#10b981"
                strokeWidth="4"
                strokeDasharray={`${(progress / 100) * 754} 754`}
                strokeLinecap="round"
                transform="rotate(-90 128 128)"
                className="hidden sm:block"
              />

              {/* Captured dots */}
              {Array.from({ length: TOTAL_ANGLES }).map((_, i) => {
                const angle = getTargetAngle(i);
                const rad = ((angle - 90) * Math.PI) / 180;
                const isCaptured = capturedIndices.has(i);

                return (
                  <React.Fragment key={i}>
                    <circle
                      cx={96 + 80 * Math.cos(rad)}
                      cy={96 + 80 * Math.sin(rad)}
                      r={isCaptured ? 5 : 2}
                      fill={isCaptured ? '#10b981' : 'rgba(255,255,255,0.3)'}
                      className="sm:hidden"
                    />
                    <circle
                      cx={128 + 110 * Math.cos(rad)}
                      cy={128 + 110 * Math.sin(rad)}
                      r={isCaptured ? 6 : 3}
                      fill={isCaptured ? '#10b981' : 'rgba(255,255,255,0.3)'}
                      className="hidden sm:block"
                    />
                  </React.Fragment>
                );
              })}

              {/* Current heading indicator */}
              {hasCompass && (
                <>
                  <line
                    x1="96"
                    y1="96"
                    x2={96 + 70 * Math.sin((currentAngle * Math.PI) / 180)}
                    y2={96 - 70 * Math.cos((currentAngle * Math.PI) / 180)}
                    stroke={isAligned ? '#10b981' : '#fbbf24'}
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="sm:hidden"
                  />
                  <line
                    x1="128"
                    y1="128"
                    x2={128 + 100 * Math.sin((currentAngle * Math.PI) / 180)}
                    y2={128 - 100 * Math.cos((currentAngle * Math.PI) / 180)}
                    stroke={isAligned ? '#10b981' : '#fbbf24'}
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="hidden sm:block"
                  />
                  <circle cx="96" cy="96" r="5" fill={isAligned ? '#10b981' : '#fbbf24'} className="sm:hidden" />
                  <circle cx="128" cy="128" r="6" fill={isAligned ? '#10b981' : '#fbbf24'} className="hidden sm:block" />
                </>
              )}
            </svg>
          </div>

          {/* Compass Warning */}
          {!hasCompass && (
            <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 bg-yellow-500/90 backdrop-blur-sm text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium">
              ⚠️ Compass unavailable - Manual mode
            </div>
          )}

          {/* Level indicator bubble */}
          <div className="absolute bottom-32 right-6 flex flex-col items-center gap-2 pointer-events-none">
            <div
              className={`relative flex h-24 w-24 items-center justify-center rounded-full border-2 ${
                isLevelAligned ? 'border-emerald-400/70' : 'border-amber-400/70'
              } bg-black/40 backdrop-blur-sm`}
            >
              <div className="absolute inset-3 rounded-full border border-white/15" />
              <div
                ref={levelIndicatorDotRef}
                className={`h-3 w-3 rounded-full transition-transform duration-150 ease-out ${
                  isLevelAligned
                    ? 'bg-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.6)]'
                    : 'bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.6)]'
                }`}
              />
            </div>
            <div className="rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-white/80">
              {rollDegrees.toFixed(1)}° · {pitchDegrees.toFixed(1)}°
            </div>
          </div>

          {/* Rotation guidance */}
          {!isAligned && guidance && (
            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-1 text-sm font-semibold text-white/85 pointer-events-none">
              {guidance}
            </div>
          )}

          {/* Auto capture notification */}
          {autoCapture && isLevelWarning && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full bg-amber-500/80 px-4 py-1 text-xs font-semibold text-black pointer-events-none shadow-md shadow-amber-500/40">
              Hold device level to continue auto capture
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
