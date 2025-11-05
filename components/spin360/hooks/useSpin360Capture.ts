import { useState, useEffect, useRef, useCallback } from 'react';
import type { ImageFile, Spin360Set, VehicleType } from '../../../types';
import {
  TOTAL_ANGLES,
  getTargetAngle,
  getNextUncapturedIndex,
} from '../angleHelper';
import { logger } from '../../../utils/logger';
import { shutterSoundDataUrl } from '../../../assets/shutterSound';

export const useSpin360Capture = (
  vehicleType: VehicleType,
  onComplete: (spin360Set: Spin360Set) => void,
  targetIndex: number,
  setTargetIndex: React.Dispatch<React.SetStateAction<number>>,
) => {
  const [capturedImages, setCapturedImages] = useState<ImageFile[]>([]);
  const [capturedIndices, setCapturedIndices] = useState<Set<number>>(new Set());
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shutterAudioRef = useRef<HTMLAudioElement | null>(null);
  const spin360Id = useRef<string>(`spin360-${Date.now()}`);

  useEffect(() => {
    const audio = new Audio(shutterSoundDataUrl);
    shutterAudioRef.current = audio;
    return () => {
      shutterAudioRef.current = null;
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
  }, [capturedImages, capturedIndices, completeSpin360, isCapturing, targetIndex, setTargetIndex]);

  const handleComplete = () => {
    if (capturedImages.length >= 8) {
      completeSpin360(capturedImages);
    }
  };

  return {
    videoRef,
    canvasRef,
    capturedImages,
    capturedIndices,
    isCapturing,
    captureImage,
    handleComplete,
  };
};
