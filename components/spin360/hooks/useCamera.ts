import { useState, useEffect } from 'react';
import { logger } from '../../../utils/logger';

type StabilizationConstraint = MediaTrackConstraintSet & {
  imageStabilization?: boolean;
  opticalStabilization?: boolean;
};

export const useCamera = (videoRef: React.RefObject<HTMLVideoElement>) => {
  const [hasLidar, setHasLidar] = useState(false);
  const [hasStabilization, setHasStabilization] = useState(false);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let videoElement: HTMLVideoElement | null = null;

    const initCamera = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        const hasDepthCamera = videoDevices.length > 2;
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

        videoTrack.applyConstraints?.({ advanced: [advancedConstraints] }).catch(() => undefined);

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

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  }, [videoRef]);

  return { hasLidar, hasStabilization };
};
