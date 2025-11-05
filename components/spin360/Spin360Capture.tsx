import React, { useState, useEffect, useRef } from 'react';
import type { VehicleType, Spin360Set } from '../../types';
import { CameraIcon } from '../icons/CameraIcon';
import { XIcon } from '../icons/XIcon';
import {
  TOTAL_ANGLES,
  getTargetAngle,
  isWithinTolerance,
  getDirectionGuidance,
  getProgressPercentage,
} from './angleHelper';
import { ARProgressRing } from './ARProgressRing';
import { StatusBadge } from './StatusBadge';
import { useCamera } from './hooks/useCamera';
import { useSensorData } from './hooks/useSensorData';
import { useSpin360Capture } from './hooks/useSpin360Capture';

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
  const [targetIndex, setTargetIndex] = useState<number>(0);
  const [autoCapture, setAutoCapture] = useState(true);
  const [shootTimer, setShootTimer] = useState<number>(0);
  const [movementSpeed, setMovementSpeed] = useState<number>(0);
  const levelIndicatorDotRef = useRef<HTMLDivElement>(null);

  const {
    videoRef,
    canvasRef,
    capturedImages,
    capturedIndices,
    isCapturing,
    captureImage,
    handleComplete,
  } = useSpin360Capture(vehicleType, onComplete, targetIndex, setTargetIndex);

  const { hasLidar, hasStabilization } = useCamera(videoRef);
  const {
    currentAngle,
    hasCompass,
    tilt,
    isLevelWarning,
    accelerationData,
    hasMotionSensors,
    gpsLocation,
  } = useSensorData();

  useEffect(() => {
    const timer = setInterval(() => {
      setShootTimer(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const lastAngleRef = { current: currentAngle, time: Date.now() };

    const speedInterval = setInterval(() => {
      const now = Date.now();
      const timeDiff = (now - lastAngleRef.time) / 1000; // seconds
      const angleDiff = Math.abs(currentAngle - lastAngleRef.current);

      if (timeDiff > 0) {
        const degreesPerSecond = angleDiff / timeDiff;
        const speedMultiplier = degreesPerSecond / 12;
        setMovementSpeed(Number(speedMultiplier.toFixed(1)));
      }

      lastAngleRef.current = currentAngle;
      lastAngleRef.time = now;
    }, 500);

    return () => clearInterval(speedInterval);
  }, [currentAngle]);

  useEffect(() => {
    const dot = levelIndicatorDotRef.current;
    if (!dot) return;

    const clampValue = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
    const rollOffset = clampValue(tilt.roll, -20, 20) * 1.2;
    const pitchOffset = clampValue(tilt.pitch, -20, 20) * 1.2;

    dot.style.transform = `translate(${rollOffset}px, ${pitchOffset}px)`;
  }, [tilt]);

  useEffect(() => {
    if (!autoCapture || isCapturing || isLevelWarning) {
      return;
    }

    const targetAngle = getTargetAngle(targetIndex);
    if (isWithinTolerance(currentAngle, targetAngle) && !capturedIndices.has(targetIndex)) {
      captureImage();
    }
  }, [autoCapture, captureImage, capturedIndices, currentAngle, isCapturing, isLevelWarning, targetIndex]);

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

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  const vehicleTypeDisplay = vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
        <ARProgressRing
          capturedAngles={Array.from(capturedIndices).map(idx => getTargetAngle(idx))}
          totalShots={TOTAL_ANGLES}
          currentAngle={getTargetAngle(targetIndex)}
          size={280}
          strokeWidth={8}
        />
        <div className="absolute inset-0 pointer-events-none">
          <button
            onClick={onCancel}
            className="absolute top-4 left-4 w-12 h-12 rounded-full bg-black/50 backdrop-blur flex items-center justify-center pointer-events-auto hover:bg-black/70 transition-colors"
            aria-label="Back"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
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
          <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/80 to-transparent z-10">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
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
              <button
                onClick={handleComplete}
                disabled={capturedImages.length < 8}
                className={`px-4 sm:px-6 py-2 rounded-full font-semibold transition-all text-sm sm:text-base ${
                  capturedImages.length >= 8
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                Done
              </button>
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
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-48 h-48 sm:w-64 sm:h-64">
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
          {!hasCompass && (
            <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 bg-yellow-500/90 backdrop-blur-sm text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium">
              ⚠️ Compass unavailable - Manual mode
            </div>
          )}
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
          {!isAligned && guidance && (
            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-1 text-sm font-semibold text-white/85 pointer-events-none">
              {guidance}
            </div>
          )}
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
