// FIX: Add missing import for React to resolve namespace error.
import React from 'react';

export type ImageStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'paused' | 'queued' | 'retouching';


export type VehicleType = 'sedan' | 'coupe' | 'wagon' | 'suv' | 'truck' | 'minivan';

export type ShotCategory = 'Exterior' | 'Details' | 'Interior';

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