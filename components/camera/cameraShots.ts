
import React from 'react';
import type { GuideProps, ShotCategory } from '../../types';
import { CarFrontQuarterGuide } from '../icons/guides/CarFrontQuarterGuide';
import { CarSideGuide } from '../icons/guides/CarSideGuide';
import { CarRearQuarterGuide } from '../icons/guides/CarRearQuarterGuide';
import { CarFrontGuide } from '../icons/guides/CarFrontGuide';
import { CarRearGuide } from '../icons/guides/CarRearGuide';
import { CarWheelGuide } from '../icons/guides/CarWheelGuide';
import { CarFrontLowAngleGuide } from '../icons/guides/CarFrontLowAngleGuide';
import { CarRearHighAngleGuide } from '../icons/guides/CarRearHighAngleGuide';
import { CarHeadlightGuide } from '../icons/guides/CarHeadlightGuide';
import { CarTaillightGuide } from '../icons/guides/CarTaillightGuide';
import { CarGrilleGuide } from '../icons/guides/CarGrilleGuide';
import { CarMirrorGuide } from '../icons/guides/CarMirrorGuide';
import { CarDoorHandleGuide } from '../icons/guides/CarDoorHandleGuide';
import { CarDashboardGuide } from '../icons/guides/CarDashboardGuide';
import { CarCenterConsoleGuide } from '../icons/guides/CarCenterConsoleGuide';
import { CarSeatsGuide } from '../icons/guides/CarSeatsGuide';
import { CarTrunkGuide } from '../icons/guides/CarTrunkGuide';


export interface Shot {
  name: string;
  description: string;
  category: ShotCategory;
  overlay: React.FC<GuideProps>;
}

export const SHOT_LIST: Shot[] = [
  // == EXTERIOR ==
  { name: 'Driver Front Quarter', description: 'Align front driver-side corner. The classic hero shot.', category: 'Exterior', overlay: CarFrontQuarterGuide },
  { name: 'Front View', description: 'Capture the car head-on. Center the grille.', category: 'Exterior', overlay: CarFrontGuide },
  { name: 'Passenger Front Quarter', description: 'Align front passenger-side corner.', category: 'Exterior', overlay: CarFrontQuarterGuide },
  { name: 'Driver Side Profile', description: 'Capture the full driver side, parallel to the car.', category: 'Exterior', overlay: CarSideGuide },
  { name: 'Passenger Side Profile', description: 'Capture the full passenger side, parallel to the car.', category: 'Exterior', overlay: CarSideGuide },
  { name: 'Driver Rear Quarter', description: 'Align rear driver-side corner.', category: 'Exterior', overlay: CarRearQuarterGuide },
  { name: 'Rear View', description: 'Capture the car directly from behind.', category: 'Exterior', overlay: CarRearGuide },
  { name: 'Passenger Rear Quarter', description: 'Align rear passenger-side corner.', category: 'Exterior', overlay: CarRearQuarterGuide },
  { name: 'Low Angle Front', description: 'Crouch down and shoot upwards at the front.', category: 'Exterior', overlay: CarFrontLowAngleGuide },
  { name: 'High Angle Rear', description: 'Shoot down towards the rear for a unique view.', category: 'Exterior', overlay: CarRearHighAngleGuide },

  // == DETAILS ==
  { name: 'Front Wheel (Driver)', description: 'Fill the frame with the front driver-side wheel.', category: 'Details', overlay: CarWheelGuide },
  { name: 'Rear Wheel (Driver)', description: 'Fill the frame with the rear driver-side wheel.', category: 'Details', overlay: CarWheelGuide },
  { name: 'Front Wheel (Passenger)', description: 'Fill the frame with the front passenger-side wheel.', category: 'Details', overlay: CarWheelGuide },
  { name: 'Rear Wheel (Passenger)', description: 'Fill the frame with the rear passenger-side wheel.', category: 'Details', overlay: CarWheelGuide },
  { name: 'Headlight Detail', description: 'Get a close-up of the driver-side headlight.', category: 'Details', overlay: CarHeadlightGuide },
  { name: 'Taillight Detail', description: 'Get a close-up of the driver-side taillight.', category: 'Details', overlay: CarTaillightGuide },
  { name: 'Grille & Badge', description: 'Focus on the main front grille and brand emblem.', category: 'Details', overlay: CarGrilleGuide },
  { name: 'Side Mirror', description: 'Capture the driver-side mirror.', category: 'Details', overlay: CarMirrorGuide },
  { name: 'Door Handle', description: 'Close-up of the driver\'s door handle.', category: 'Details', overlay: CarDoorHandleGuide },

  // == INTERIOR ==
  { name: 'Dashboard & Steering Wheel', description: 'From driver\'s seat, show the full dashboard.', category: 'Interior', overlay: CarDashboardGuide },
  { name: 'Center Console & Shifter', description: 'View of the gear shifter, cupholders, and controls.', category: 'Interior', overlay: CarCenterConsoleGuide },
  { name: 'Front Seats', description: 'From the back seat, capture both front seats.', category: 'Interior', overlay: CarSeatsGuide },
  { name: 'Rear Seats', description: 'From the front, show the rear seating area.', category: 'Interior', overlay: CarSeatsGuide },
  { name: 'Driver Door Panel', description: 'Show the inside of the driver\'s door.', category: 'Interior', overlay: CarDoorHandleGuide },
  { name: 'Trunk / Cargo Space', description: 'Open the trunk and show the available space.', category: 'Interior', overlay: CarTrunkGuide },
];