
// FIX: Added missing import for React to resolve namespace error.
import React from 'react';
import type { VehicleType } from '../../types';
import { SedanIcon } from '../icons/vehicles/SedanIcon';
import { CoupeIcon } from '../icons/vehicles/CoupeIcon';
import { SuvIcon } from '../icons/vehicles/SuvIcon';
import { TruckIcon } from '../icons/vehicles/TruckIcon';
import { WagonIcon } from '../icons/vehicles/WagonIcon';
import { MinivanIcon } from '../icons/vehicles/MinivanIcon';

export const VEHICLE_TYPES: { id: VehicleType; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
    { id: 'sedan', label: 'Sedan', icon: SedanIcon },
    { id: 'coupe', label: 'Coupe', icon: CoupeIcon },
    { id: 'suv', label: 'SUV', icon: SuvIcon },
    { id: 'truck', label: 'Truck', icon: TruckIcon },
    { id: 'wagon', label: 'Wagon', icon: WagonIcon },
    { id: 'minivan', label: 'Minivan', icon: MinivanIcon },
];