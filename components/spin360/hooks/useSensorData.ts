import { useState, useEffect, useRef } from 'react';
import {
  computeTiltFromMotion,
  computeTiltFromOrientation,
  isDeviceLevel,
  smoothTilt,
  type TiltReading,
} from '../../../utils/orientation';
import { normalizeAngle } from '../angleHelper';
import { logger } from '../../../utils/logger';

export const useSensorData = () => {
  const [currentAngle, setCurrentAngle] = useState<number>(0);
  const [initialAngle, setInitialAngle] = useState<number | null>(null);
  const [hasCompass, setHasCompass] = useState(false);
  const [tilt, setTilt] = useState<TiltReading>({ roll: 0, pitch: 0 });
  const [isLevelWarning, setIsLevelWarning] = useState(false);
  const [accelerationData, setAccelerationData] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const [hasMotionSensors, setHasMotionSensors] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const motionAvailableRef = useRef(false);

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const status = await (DeviceOrientationEvent as any).requestPermission();
          if (status !== 'granted') {
            logger.warn('Device orientation permission was not granted for 360 capture.');
          }
        } catch (error) {
          logger.warn('Device orientation permission request failed', error);
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const status = await (DeviceMotionEvent as any).requestPermission();
          if (status !== 'granted') {
            logger.warn('Device motion permission was not granted for 360 capture.');
          }
        } catch (error) {
          logger.warn('Device motion permission request failed', error);
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

  return {
    currentAngle,
    hasCompass,
    tilt,
    isLevelWarning,
    accelerationData,
    hasMotionSensors,
    gpsLocation,
  };
};
