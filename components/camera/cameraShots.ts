import React from 'react';
import type { GuideProps, ShotCategory } from '../../types';
import { CarFrontQuarterGuide } from '../icons/guides/CarFrontQuarterGuide';
import { CarSideGuide } from '../icons/guides/CarSideGuide';
import { CarRearQuarterGuide } from '../icons/guides/CarRearQuarterGuide';
import { CarFrontGuide } from '../icons/guides/CarFrontGuide';
import { CarRearGuide } from '../icons/guides/CarRearGuide';
import { CarWheelGuide } from '../icons/guides/CarWheelGuide';
import { CarHeadlightGuide } from '../icons/guides/CarHeadlightGuide';
import { CarTaillightGuide } from '../icons/guides/CarTaillightGuide';
import { CarGrilleGuide } from '../icons/guides/CarGrilleGuide';
import { CarMirrorGuide } from '../icons/guides/CarMirrorGuide';
import { CarDoorHandleGuide } from '../icons/guides/CarDoorHandleGuide';
import { CarDashboardGuide } from '../icons/guides/CarDashboardGuide';
import { CarCenterConsoleGuide } from '../icons/guides/CarCenterConsoleGuide';
import { CarSeatsGuide } from '../icons/guides/CarSeatsGuide';
import { CarTrunkGuide } from '../icons/guides/CarTrunkGuide';
import { CarEngineGuide } from '../icons/guides/CarEngineGuide';
import { CarOdometerGuide } from '../icons/guides/CarOdometerGuide';
import { CarInfotainmentGuide } from '../icons/guides/CarInfotainmentGuide';


export interface Shot {
  id: string;
  name: string;
  description: string;
  category: ShotCategory;
  overlay: React.FC<GuideProps>;
}

export const SHOT_LIST: Shot[] = [
  // == EXTERIOR (8 shots - Standard angles) ==
  { id: 'front-left-3-4', name: 'Front Left 3/4', description: 'Front driver-side corner - the hero shot', category: 'Exterior', overlay: CarFrontQuarterGuide },
  { id: 'front', name: 'Front', description: 'Straight-on front view', category: 'Exterior', overlay: CarFrontGuide },
  { id: 'front-right-3-4', name: 'Front Right 3/4', description: 'Front passenger-side corner', category: 'Exterior', overlay: CarFrontQuarterGuide },
  { id: 'right-side', name: 'Right Side', description: 'Passenger side profile', category: 'Exterior', overlay: CarSideGuide },
  { id: 'rear-right-3-4', name: 'Rear Right 3/4', description: 'Rear passenger-side corner', category: 'Exterior', overlay: CarRearQuarterGuide },
  { id: 'rear', name: 'Rear', description: 'Straight-on rear view', category: 'Exterior', overlay: CarRearGuide },
  { id: 'rear-left-3-4', name: 'Rear Left 3/4', description: 'Rear driver-side corner', category: 'Exterior', overlay: CarRearQuarterGuide },
  { id: 'left-side', name: 'Left Side', description: 'Driver side profile', category: 'Exterior', overlay: CarSideGuide },

  // == INTERIOR (8 shots - Key areas) ==
  { id: 'dashboard', name: 'Dashboard', description: 'Full dashboard and steering wheel view', category: 'Interior', overlay: CarDashboardGuide },
  { id: 'odometer', name: 'Odometer', description: 'Instrument cluster showing mileage', category: 'Interior', overlay: CarOdometerGuide },
  { id: 'infotainment', name: 'Infotainment', description: 'Center touchscreen display', category: 'Interior', overlay: CarInfotainmentGuide },
  { id: 'center-console', name: 'Center Console', description: 'Shifter and console controls', category: 'Interior', overlay: CarCenterConsoleGuide },
  { id: 'front-seats', name: 'Front Seats', description: 'Both front seats from rear', category: 'Interior', overlay: CarSeatsGuide },
  { id: 'rear-seats', name: 'Rear Seats', description: 'Back seat area', category: 'Interior', overlay: CarSeatsGuide },
  { id: 'trunk', name: 'Trunk', description: 'Cargo area with trunk open', category: 'Interior', overlay: CarTrunkGuide },
  { id: 'engine-bay', name: 'Engine Bay', description: 'Engine compartment', category: 'Interior', overlay: CarEngineGuide },

  // == DETAILS (6 shots - Important features) ==
  { id: 'wheels', name: 'Wheels', description: 'Close-up of wheels and tires', category: 'Details', overlay: CarWheelGuide },
  { id: 'headlights', name: 'Headlights', description: 'Front light detail', category: 'Details', overlay: CarHeadlightGuide },
  { id: 'taillights', name: 'Taillights', description: 'Rear light detail', category: 'Details', overlay: CarTaillightGuide },
  { id: 'grille', name: 'Grille', description: 'Front grille and badge', category: 'Details', overlay: CarGrilleGuide },
  { id: 'side-mirror', name: 'Side Mirror', description: 'Mirror detail', category: 'Details', overlay: CarMirrorGuide },
  { id: 'door-handle', name: 'Door Handle', description: 'Door handle close-up', category: 'Details', overlay: CarDoorHandleGuide },
];
