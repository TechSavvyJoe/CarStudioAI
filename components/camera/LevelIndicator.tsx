import React from 'react';
import { isDeviceLevel, type TiltReading } from '../../utils/orientation';

interface LevelIndicatorProps {
  tilt: TiltReading;
  isAligned: boolean;
}

const Bar: React.FC<{ value: number; isAligned: boolean }> = ({ value, isAligned }) => {
  const clampedValue = Math.max(-100, Math.min(100, value * 5));
  const barColor = isAligned ? 'bg-green-400' : 'bg-yellow-400';

  return (
    <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-200 ease-in-out ${barColor}`}
        style={{
          width: `${Math.abs(clampedValue)}%`,
          transform: `translateX(${clampedValue < 0 ? `${100 - Math.abs(clampedValue)}%` : '0%'})`,
          margin: '0 auto',
        }}
      />
    </div>
  );
};

export const LevelIndicator: React.FC<LevelIndicatorProps> = ({ tilt, isAligned }) => {
  const { roll, pitch } = tilt;
  const isLevel = isDeviceLevel(tilt, { rollThreshold: 2.5, pitchThreshold: 3.5 });
  const indicatorColor = isLevel ? 'text-green-400' : 'text-yellow-400';

  return (
    <div
      className={`absolute bottom-24 left-1/2 -translate-x-1/2 w-48 p-2 bg-black/40 backdrop-blur-md rounded-lg transition-opacity duration-300 ${
        isAligned ? 'opacity-100' : 'opacity-50'
      }`}
    >
      <div className="flex flex-col space-y-2">
        <div className="flex items-center">
          <span className="text-xs font-bold text-white w-12">Roll</span>
          <Bar value={roll} isAligned={isLevel} />
        </div>
        <div className="flex items-center">
          <span className="text-xs font-bold text-white w-12">Pitch</span>
          <Bar value={pitch} isAligned={isLevel} />
        </div>
      </div>
      <div className={`mt-2 text-center text-xs font-bold ${indicatorColor}`}>
        {isLevel ? 'Device Level' : 'Adjust to Level'}
      </div>
    </div>
  );
};
