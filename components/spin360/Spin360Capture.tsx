import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ImageFile, VehicleType, Spin360Set } from '../../types';
import { CameraIcon } from '../icons/CameraIcon';
import { XIcon } from '../icons/XIcon';
import { shutterSoundDataUrl } from '../../assets/shutterSound';
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
import { CarFrontQuarterGuide } from '../icons/guides/CarFrontQuarterGuide';
import { CarSideGuide } from '../icons/guides/CarSideGuide';
import { CarRearQuarterGuide } from '../icons/guides/CarRearQuarterGuide';
import { CarFrontGuide } from '../icons/guides/CarFrontGuide';
import { CarRearGuide } from '../icons/guides/CarRearGuide';
import { WireframeGuide } from './WireframeGuide';

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
        console.error('Camera access error:', error);
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
          console.warn('GPS error:', error);
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
      console.error('Capture error:', error);
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

  const targetAngle = getTargetAngle(targetIndex);
  const guidance = getDirectionGuidance(currentAngle, targetAngle);
  const progress = getProgressPercentage(capturedIndices.size);
  const isAligned = isWithinTolerance(currentAngle, targetAngle);

  // Get appropriate guide overlay based on target angle
  const getGuideForAngle = (angle: number) => {
    const normalized = ((angle % 360) + 360) % 360;
    
    // Front: 315-45 degrees
    if (normalized >= 315 || normalized < 45) {
      if (normalized >= 337.5 || normalized < 22.5) return CarFrontGuide;
      return normalized < 180 ? CarFrontQuarterGuide : CarFrontQuarterGuide;
    }
    // Right Side: 45-135 degrees
    if (normalized >= 45 && normalized < 135) {
      return normalized < 90 ? CarFrontQuarterGuide : CarSideGuide;
    }
    // Rear: 135-225 degrees
    if (normalized >= 135 && normalized < 225) {
      if (normalized >= 157.5 && normalized < 202.5) return CarRearGuide;
      return normalized < 180 ? CarRearQuarterGuide : CarRearQuarterGuide;
    }
    // Left Side: 225-315 degrees
    return normalized < 270 ? CarRearQuarterGuide : CarSideGuide;
  };

  const CurrentGuide = getGuideForAngle(targetAngle);

  // Get guide name for current angle
  const getGuideName = (angle: number) => {
    const normalized = ((angle % 360) + 360) % 360;
    
    if (normalized >= 337.5 || normalized < 22.5) return 'Front View';
    if (normalized >= 22.5 && normalized < 67.5) return 'Front Right Quarter';
    if (normalized >= 67.5 && normalized < 112.5) return 'Right Side';
    if (normalized >= 112.5 && normalized < 157.5) return 'Rear Right Quarter';
    if (normalized >= 157.5 && normalized < 202.5) return 'Rear View';
    if (normalized >= 202.5 && normalized < 247.5) return 'Rear Left Quarter';
    if (normalized >= 247.5 && normalized < 292.5) return 'Left Side';
    return 'Front Left Quarter';
  };

  const currentGuideName = getGuideName(targetAngle);

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
        
        {/* Wireframe Guide Overlay (Spyne AI Style) */}
        {showGuides && (
          <WireframeGuide 
            isAligned={isAligned}
            guideName={currentGuideName}
          />
        )}
        
        {/* Vehicle Guide Overlay (Optional - can be toggled separately) */}
        {showGuides && CurrentGuide && guideOpacity > 0.3 && (
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ opacity: guideOpacity * 0.5 }}
          >
            <CurrentGuide 
              vehicleType={vehicleType}
              className="w-full h-full max-w-4xl max-h-screen text-blue-400"
            />
          </div>
        )}
        
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

          {/* Top Center - Current Angle Progress */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-full font-bold text-lg">
            {Math.round(currentAngle)}°
          </div>

          {/* Top Right - Vehicle Type Badge */}
          <div className="absolute top-4 right-4 bg-black/50 backdrop-blur text-white px-4 py-2 rounded-lg font-semibold">
            {vehicleTypeDisplay}
          </div>

          {/* Left Side - Shot Counter */}
          <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
            <div className="bg-black/70 backdrop-blur rounded-lg px-4 py-3 text-white">
              <div className="text-xs opacity-75 mb-1">[::]:</div>
              <div className="text-3xl font-bold">{capturedIndices.size}</div>
            </div>
            
            {/* Stabilization Indicator */}
            {hasStabilization && (
              <div className="bg-blue-500/80 backdrop-blur rounded-full p-2" title="Stabilization Active">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 9V5h2v4h4v2h-4v4H9v-4H5V9h4z" />
                </svg>
              </div>
            )}
          </div>

          {/* Right Side - Large Capture Button (Manual Mode) */}
          {!autoCapture && (
            <button
              onClick={captureImage}
              disabled={isCapturing}
              className="absolute right-6 top-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-red-600 border-4 border-white shadow-2xl pointer-events-auto hover:bg-red-700 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center"
              aria-label="Capture photo"
            >
              <div className="w-16 h-16 rounded-full border-2 border-white" />
            </button>
          )}

          {/* Right Side - Auto Mode Indicator */}
          {autoCapture && isAligned && (
            <div className="absolute right-6 top-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-red-600 border-4 border-white shadow-2xl animate-pulse flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-2 border-white" />
            </div>
          )}

          {/* Bottom Right - Vehicle Icon and Timer */}
          <div className="absolute bottom-24 right-6 flex flex-col items-center gap-3">
            {/* Vehicle Type Icon */}
            <div className="w-16 h-16 bg-black/50 backdrop-blur rounded-lg flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6z" />
              </svg>
            </div>
            
            {/* Timer */}
            <div className="bg-black/70 backdrop-blur rounded-lg px-4 py-2 text-white text-center">
              <div className="text-lg font-bold font-mono">{formatTime(shootTimer)}</div>
            </div>
          </div>

          {/* Bottom Center - Warning Message */}
          {shootTimer < 30 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 backdrop-blur rounded-full px-6 py-3 text-white">
              <div className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              </div>
              <div className="text-sm font-medium">Don't end your shoot before 30 seconds</div>
            </div>
          )}

          {/* Bottom Left - Speed and Settings */}
          <div className="absolute bottom-6 left-6 flex items-center gap-3">
            {/* Movement Speed */}
            <div className="bg-black/70 backdrop-blur rounded-lg px-4 py-2 text-white text-center">
              <div className="text-2xl font-bold">{movementSpeed.toFixed(1)}</div>
              <div className="text-xs opacity-75">speed</div>
            </div>
            
            {/* Auto-capture toggle */}
            <button
              onClick={() => setAutoCapture(!autoCapture)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors pointer-events-auto ${
                autoCapture 
                  ? 'bg-green-600 text-white' 
                  : 'bg-white/20 text-white'
              }`}
            >
              {autoCapture ? '1x Auto' : 'Manual'}
            </button>
            
            {/* Guide toggle button */}
            <button
              onClick={() => {
                const newValue = !showGuides;
                setShowGuides(newValue);
                localStorage.setItem('showGuides', String(newValue));
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors pointer-events-auto ${
                showGuides 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white/20 text-white'
              }`}
              title="Toggle vehicle guide overlay"
            >
              {showGuides ? '👁️ Guide' : '👁️‍🗨️ Guide'}
            </button>
          </div>

          {/* Center - Guidance Circle (Simplified) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <svg className="w-64 h-64">
              {/* Background circle */}
              <circle
                cx="128"
                cy="128"
                r="120"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="2"
              />
              
              {/* Progress arc */}
              <circle
                cx="128"
                cy="128"
                r="120"
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeDasharray={`${(progress / 100) * 754} 754`}
                strokeLinecap="round"
                transform="rotate(-90 128 128)"
              />
              
              {/* Angle markers (captured shots) */}
              {Array.from({ length: TOTAL_ANGLES }).map((_, i) => {
                const angle = getTargetAngle(i);
                const rad = ((angle - 90) * Math.PI) / 180;
                const x = 128 + 110 * Math.cos(rad);
                const y = 128 + 110 * Math.sin(rad);
                const isCaptured = capturedIndices.has(i);
                
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={isCaptured ? 6 : 3}
                    fill={isCaptured ? '#10b981' : 'rgba(255,255,255,0.3)'}
                  />
                );
              })}
              
              {/* Current heading indicator */}
              {hasCompass && (
                <>
                  <line
                    x1="128"
                    y1="128"
                    x2={128 + 100 * Math.sin((currentAngle * Math.PI) / 180)}
                    y2={128 - 100 * Math.cos((currentAngle * Math.PI) / 180)}
                    stroke={isAligned ? '#10b981' : '#fbbf24'}
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <circle cx="128" cy="128" r="6" fill={isAligned ? '#10b981' : '#fbbf24'} />
                </>
              )}
            </svg>
          </div>

          {/* No Compass Warning */}
          {!hasCompass && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-yellow-500/90 text-white px-4 py-2 rounded-lg text-sm font-medium">
              ⚠️ Compass unavailable - Manual capture mode
            </div>
          )}

        </div>
        
      </div>
    </div>
  );
};
