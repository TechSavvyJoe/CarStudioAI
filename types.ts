// FIX: Add missing import for React to resolve namespace error.
import React from 'react';

export type ImageStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'paused' | 'queued' | 'retouching';


export type VehicleType = 'sedan' | 'coupe' | 'wagon' | 'suv' | 'truck' | 'minivan';

export type ShotCategory = 'Exterior' | 'Details' | 'Interior' | '360 Spin';

export interface GuideProps extends React.SVGProps<SVGSVGElement> {
  vehicleType?: VehicleType;
  category?: ShotCategory;
}

export interface ImageFile {
  id: string;
  originalFile: File;
  originalUrl: string;
  // Stored as a data URL in IndexedDB, becomes a blob URL in component state
  processedUrl: string | null;
  status: ImageStatus;
  error: string | null;
  // 360 spin specific fields
  spin360Id?: string; // Links images that belong to same 360 spin
  spin360Index?: number; // Position in the 360 sequence (0-23)
  spin360Angle?: number; // Actual angle in degrees (0-360)
}

export interface Spin360Set {
  id: string;
  name: string;
  vehicleType: VehicleType;
  timestamp: number;
  images: ImageFile[]; // Should contain 24 images in angular order
  totalAngles: number; // Typically 24
  isComplete: boolean;
}

export interface BatchHistoryEntry {
  id: string;
  name: string;
  timestamp: number;
  imageCount: number;
  images: ImageFile[];
}

export interface DealershipBackground {
  id: string;
  file: File;
  url: string;
  name: string;
  uploadedAt: number;
}