
import React from 'react';
import type { VehicleType } from '../../types';
import { VEHICLE_TYPES } from './vehicleTypes';

interface VehicleTypeSelectorProps {
  selectedType: VehicleType;
  onSelectType: (type: VehicleType) => void;
}

export const VehicleTypeSelector: React.FC<VehicleTypeSelectorProps> = ({ selectedType, onSelectType }) => {
  return (
    <div className="w-full grid grid-cols-3 gap-2">
        {VEHICLE_TYPES.map((type) => {
            const isSelected = selectedType === type.id;
            const Icon = type.icon;
            return (
                <button
                    key={type.id}
                    onClick={() => onSelectType(type.id)}
                    className={`flex-shrink-0 flex flex-col items-center justify-center aspect-square rounded-lg border-2 transition-all duration-200 transform p-1 ${
                        isSelected
                            ? 'border-blue-400 bg-gray-600/80'
                            : 'border-gray-700 bg-gray-900/60 hover:border-blue-500'
                    }`}
                    aria-pressed={isSelected}
                >
                    <Icon className={`w-10 h-8 ${isSelected ? 'text-white' : 'text-gray-300'}`} />
                    <span className={`text-[10px] font-semibold mt-1 text-center ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                        {type.label}
                    </span>
                </button>
            );
        })}
    </div>
  );
};
