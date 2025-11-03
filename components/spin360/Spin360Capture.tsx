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

interface Spin360CaptureProps {
  vehicleType: VehicleType;
  onComplete: (spin360Set: Spin360Set) => void;
  onCancel: () => void;
}

export const Spin360Capture: React.FC<Spin360CaptureProps> = ({
  vehicleType,
  onComplete,
  onCancel,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentAngle, setCurrentAngle] = useState<number>(0);
  const [capturedImages, setCapturedImages] = useState<ImageFile[]>([]);
  const [capturedIndices, setCapturedIndices] = useState<Set<number>>(new Set());
  const [targetIndex, setTargetIndex] = useState<number>(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [autoCapture, setAutoCapture] = useState(true);
  const [hasCompass, setHasCompass] = useState(false);
  const [initialAngle, setInitialAngle] = useState<number | null>(null);
  
  // Enhanced sensor states
  const [tiltX, setTiltX] = useState<number>(0); // Phone tilt left/right (beta)
  const [tiltY, setTiltY] = useState<number>(0); // Phone tilt forward/back (gamma)
  const [isLevelWarning, setIsLevelWarning] = useState(false);
  const [accelerationData, setAccelerationData] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const [hasMotionSensors, setHasMotionSensors] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hasLidar, setHasLidar] = useState(false);
  const [shootTimer, setShootTimer] = useState<number>(0);
  const [movementSpeed, setMovementSpeed] = useState<number>(0);
  const [hasStabilization, setHasStabilization] = useState(false);
  const [showGuides, setShowGuides] = useState(() => {
    return localStorage.getItem('showGuides') !== 'false';
  });
  const [guideOpacity, setGuideOpacity] = useState(() => {
    const savedOpacity = localStorage.getItem('guideOpacity');
    return savedOpacity ? parseFloat(savedOpacity) : 0.6;
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shutterAudioRef = useRef<HTMLAudioElement | null>(null);
  const spin360Id = useRef<string>(`spin360-${Date.now()}`);

  // Initialize camera
  useEffect(() => {
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
            // Enable optical and digital stabilization if available
            // @ts-ignore - Advanced constraint may not be in types
            imageStabilization: true,
            // @ts-ignore
            opticalStabilization: true,
          },
        });
        
        // Check if stabilization is supported
        const videoTrack = mediaStream.getVideoTracks()[0];
        const capabilities = videoTrack.getCapabilities?.() as any;
        setHasStabilization(capabilities?.imageStabilization === true);
        
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
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
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
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

  // Device orientation tracking for compass and tilt
  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha !== null) {
        setHasCompass(true);
        const compassHeading = normalizeAngle(360 - event.alpha); // Convert to standard compass
        
        // Set initial angle on first reading
        if (initialAngle === null) {
          setInitialAngle(compassHeading);
          setCurrentAngle(0); // Start at 0° relative
        } else {
          // Calculate relative angle from starting position
          const relativeAngle = normalizeAngle(compassHeading - initialAngle);
          setCurrentAngle(relativeAngle);
        }
      }
      
      // Capture tilt data for level indicator
      if (event.beta !== null && event.gamma !== null) {
        setTiltX(event.beta); // Forward/back tilt (-180 to 180)
        setTiltY(event.gamma); // Left/right tilt (-90 to 90)
        
        // Check if phone is reasonably level (within 15 degrees)
        const isLevel = Math.abs(event.beta - 90) < 15 && Math.abs(event.gamma) < 15;
        setIsLevelWarning(!isLevel);
      }
    };

    // Request permission for iOS 13+
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      (DeviceOrientationEvent as any).requestPermission()
        .then((permission: string) => {
          if (permission === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          }
        });
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [initialAngle]);

  // Accelerometer for motion detection and stability
  useEffect(() => {
    const handleMotion = (event: DeviceMotionEvent) => {
      if (event.acceleration) {
        setHasMotionSensors(true);
        setAccelerationData({
          x: event.acceleration.x || 0,
          y: event.acceleration.y || 0,
          z: event.acceleration.z || 0,
        });
      }
    };

    // Request permission for iOS 13+
    if (typeof DeviceMotionEvent !== 'undefined' && 
        typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      (DeviceMotionEvent as any).requestPermission()
        .then((permission: string) => {
          if (permission === 'granted') {
            window.addEventListener('devicemotion', handleMotion);
          }
        });
    } else {
      window.addEventListener('devicemotion', handleMotion);
    }

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, []);

  // GPS location tracking
  useEffect(() => {
    if (navigator.geolocation) {
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
    }
  }, []);

  // Auto-capture when within tolerance
  useEffect(() => {
    if (!autoCapture || isCapturing) return;
    
    const targetAngle = getTargetAngle(targetIndex);
    if (isWithinTolerance(currentAngle, targetAngle) && !capturedIndices.has(targetIndex)) {
      captureImage();
    }
  }, [currentAngle, targetIndex, autoCapture, isCapturing, capturedIndices]);

  const captureImage = useCallback(async () => {
    if (isCapturing || !videoRef.current || !canvasRef.current) return;
    
    setIsCapturing(true);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      // Set canvas size to video size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame
      ctx.drawImage(video, 0, 0);
      
      // Play shutter sound
      if (shutterAudioRef.current) {
        shutterAudioRef.current.currentTime = 0;
        shutterAudioRef.current.play().catch(() => {});
      }
      
      // Convert to blob
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
        
        setCapturedImages(prev => [...prev, imageFile]);
        setCapturedIndices(prev => new Set(prev).add(targetIndex));
        
        // Move to next uncaptured angle
        const newCapturedSet = new Set(capturedIndices).add(targetIndex);
        const nextIndex = getNextUncapturedIndex(newCapturedSet);
        
        if (nextIndex !== null) {
          setTargetIndex(nextIndex);
        } else {
          // All images captured!
          completeSpin360([...capturedImages, imageFile]);
        }
        
        setIsCapturing(false);
      }, 'image/jpeg', 0.95);
      
    } catch (error) {
      logger.error('Capture error:', error);
      setIsCapturing(false);
    }
  }, [isCapturing, targetIndex, capturedIndices, capturedImages]);

  const completeSpin360 = (allImages: ImageFile[]) => {
    // Sort by angle index
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
  };

  const handleComplete = () => {
    if (capturedImages.length >= 8) {
      completeSpin360(capturedImages);
    }
  };

  const targetAngle = getTargetAngle(targetIndex);
  const guidance = getDirectionGuidance(currentAngle, targetAngle);
  const progress = getProgressPercentage(capturedIndices.size);
  const isAligned = isWithinTolerance(currentAngle, targetAngle);

  // Format timer as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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

        </div>
        
      </div>
    </div>
  );
};
