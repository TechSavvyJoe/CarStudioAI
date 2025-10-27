
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
  name: string;
  description: string;
  category: ShotCategory;
  overlay: React.FC<GuideProps>;
}

export const SHOT_LIST: Shot[] = [
  // == EXTERIOR (8 shots - Standard angles) ==
  { name: 'Front Left 3/4', description: 'Front driver-side corner - the hero shot', category: 'Exterior', overlay: CarFrontQuarterGuide },
  { name: 'Front', description: 'Straight-on front view', category: 'Exterior', overlay: CarFrontGuide },
  { name: 'Front Right 3/4', description: 'Front passenger-side corner', category: 'Exterior', overlay: CarFrontQuarterGuide },
  { name: 'Right Side', description: 'Passenger side profile', category: 'Exterior', overlay: CarSideGuide },
  { name: 'Rear Right 3/4', description: 'Rear passenger-side corner', category: 'Exterior', overlay: CarRearQuarterGuide },
  { name: 'Rear', description: 'Straight-on rear view', category: 'Exterior', overlay: CarRearGuide },
  { name: 'Rear Left 3/4', description: 'Rear driver-side corner', category: 'Exterior', overlay: CarRearQuarterGuide },
  { name: 'Left Side', description: 'Driver side profile', category: 'Exterior', overlay: CarSideGuide },

  // == INTERIOR (8 shots - Key areas) ==
  { name: 'Dashboard', description: 'Full dashboard and steering wheel view', category: 'Interior', overlay: CarDashboardGuide },
  { name: 'Odometer', description: 'Instrument cluster showing mileage', category: 'Interior', overlay: CarOdometerGuide },
  { name: 'Infotainment', description: 'Center touchscreen display', category: 'Interior', overlay: CarInfotainmentGuide },
  { name: 'Center Console', description: 'Shifter and console controls', category: 'Interior', overlay: CarCenterConsoleGuide },
  { name: 'Front Seats', description: 'Both front seats from rear', category: 'Interior', overlay: CarSeatsGuide },
  { name: 'Rear Seats', description: 'Back seat area', category: 'Interior', overlay: CarSeatsGuide },
  { name: 'Trunk', description: 'Cargo area with trunk open', category: 'Interior', overlay: CarTrunkGuide },
  { name: 'Engine Bay', description: 'Engine compartment', category: 'Interior', overlay: CarEngineGuide },

  // == DETAILS (6 shots - Important features) ==
  { name: 'Wheels', description: 'Close-up of wheels and tires', category: 'Details', overlay: CarWheelGuide },
  { name: 'Headlights', description: 'Front light detail', category: 'Details', overlay: CarHeadlightGuide },
  { name: 'Taillights', description: 'Rear light detail', category: 'Details', overlay: CarTaillightGuide },
  { name: 'Grille', description: 'Front grille and badge', category: 'Details', overlay: CarGrilleGuide },
  { name: 'Side Mirror', description: 'Mirror detail', category: 'Details', overlay: CarMirrorGuide },
  { name: 'Door Handle', description: 'Door handle close-up', category: 'Details', overlay: CarDoorHandleGuide },
];