import React, { useState } from 'react';
import type { VehicleType } from '../../types';
import { VEHICLE_TYPES } from './vehicleTypes';

interface InitialVehicleSelectionProps {
    onSelect: (type: VehicleType) => void;
}

export const InitialVehicleSelection: React.FC<InitialVehicleSelectionProps> = ({ onSelect }) => {
    const [selected, setSelected] = useState<VehicleType | null>(null);

    return (
        <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center p-4 text-center animate-fadeIn">
            <h1 className="text-3xl font-bold text-white mb-2">First, Select Your Vehicle Type</h1>
            <p className="text-gray-400 mb-8 max-w-md">This helps us provide accurate guides for your photoshoot. You can change this later in the settings.</p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 max-w-2xl w-full">
                {VEHICLE_TYPES.map((type) => {
                    const isSelected = selected === type.id;
                    const Icon = type.icon;
                    return (
                        <button
                            key={type.id}
                            onClick={() => setSelected(type.id)}
                            className={`flex flex-col items-center justify-center aspect-square rounded-lg border-2 transition-all duration-200 transform p-2 hover:scale-105 ${
                                isSelected
                                    ? 'border-blue-400 bg-blue-900/50 ring-2 ring-blue-500'
                                    : 'border-gray-700 bg-gray-800'
                            }`}
                        >
                            <Icon className="w-16 h-12 text-white" />
                            <span className="text-sm font-semibold mt-2 text-white">{type.label}</span>
                        </button>
                    );
                })}
            </div>
            <button
                onClick={() => onSelect(selected!)}
                disabled={!selected}
                className="mt-8 px-8 py-3 bg-blue-600 text-white font-bold rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-blue-700 transition-all transform hover:scale-105"
            >
                Confirm & Start
            </button>
        </div>
    );
};
