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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shutterAudioRef = useRef<HTMLAudioElement | null>(null);
  const spin360Id = useRef<string>(`spin360-${Date.now()}`);

  // Initialize camera
  useEffect(() => {
    const initCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
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

  // Device orientation tracking for compass
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
        
        {/* Compass Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Progress Ring */}
          <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64">
            {/* Background circle */}
            <circle
              cx="128"
              cy="128"
              r="120"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="4"
            />
            
            {/* Progress arc */}
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
            />
            
            {/* Angle markers */}
            {Array.from({ length: TOTAL_ANGLES }).map((_, i) => {
              const angle = getTargetAngle(i);
              const rad = ((angle - 90) * Math.PI) / 180;
              const x = 128 + 110 * Math.cos(rad);
              const y = 128 + 110 * Math.sin(rad);
              const isCaptured = capturedIndices.has(i);
              const isTarget = i === targetIndex;
              
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={isTarget ? 8 : 4}
                  fill={isCaptured ? '#10b981' : isTarget ? '#ef4444' : 'rgba(255,255,255,0.5)'}
                  stroke={isTarget ? '#fff' : 'none'}
                  strokeWidth={isTarget ? 2 : 0}
                />
              );
            })}
            
            {/* Current angle indicator */}
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
                <circle cx="128" cy="128" r="8" fill={isAligned ? '#10b981' : '#fbbf24'} />
              </>
            )}
          </svg>
          
          {/* Center guidance */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <div className={`text-2xl font-bold mb-2 ${isAligned ? 'text-green-400' : 'text-yellow-400'}`}>
              {guidance}
            </div>
            {isAligned && autoCapture && (
              <div className="text-green-400 animate-pulse">
                Capturing...
              </div>
            )}
          </div>
        </div>
        
        {/* Top Info Bar */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4">
          <div className="flex items-center justify-between text-white">
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Cancel 360 spin capture"
            >
              <XIcon className="w-6 h-6" />
            </button>
            
            <div className="text-center">
              <div className="text-sm opacity-75">360° Spin Capture</div>
              <div className="text-xl font-bold">{capturedIndices.size} / {TOTAL_ANGLES}</div>
              <div className="text-xs opacity-75">{progress}% Complete</div>
            </div>
            
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </div>
        
        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
          <div className="flex items-center justify-center gap-6">
            {/* Auto-capture toggle */}
            <button
              onClick={() => setAutoCapture(!autoCapture)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                autoCapture 
                  ? 'bg-green-600 text-white' 
                  : 'bg-white/10 text-white'
              }`}
            >
              Auto: {autoCapture ? 'ON' : 'OFF'}
            </button>
            
            {/* Manual capture button */}
            {!autoCapture && (
              <button
                onClick={captureImage}
                disabled={isCapturing}
                className="w-16 h-16 rounded-full bg-red-600 border-4 border-white shadow-lg hover:bg-red-700 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center"
                aria-label="Capture photo"
              >
                <CameraIcon className="w-8 h-8 text-white" />
              </button>
            )}
          </div>
          
          {!hasCompass && (
            <div className="mt-4 text-center text-yellow-400 text-sm">
              ⚠️ Device compass not available. Rotate manually and capture at each marker.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
