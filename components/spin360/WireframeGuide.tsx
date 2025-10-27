import React from 'react';

interface WireframeGuideProps {
  isAligned: boolean;
  guideName?: string;
}

export const WireframeGuide: React.FC<WireframeGuideProps> = ({ isAligned, guideName }) => {
  const cornerSize = 40;
  const cornerThickness = 3;
  const guideColor = isAligned ? '#10b981' : '#fbbf24';
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Corner Brackets - Top Left */}
      <svg className="absolute top-8 left-8 w-12 h-12" viewBox="0 0 48 48">
        <path
          d={`M 0 ${cornerSize} L 0 0 L ${cornerSize} 0`}
          stroke={guideColor}
          strokeWidth={cornerThickness}
          fill="none"
          strokeLinecap="round"
          className="transition-colors duration-300"
        />
      </svg>

      {/* Corner Brackets - Top Right */}
      <svg className="absolute top-8 right-8 w-12 h-12" viewBox="0 0 48 48">
        <path
          d={`M ${48 - cornerSize} 0 L 48 0 L 48 ${cornerSize}`}
          stroke={guideColor}
          strokeWidth={cornerThickness}
          fill="none"
          strokeLinecap="round"
          className="transition-colors duration-300"
        />
      </svg>

      {/* Corner Brackets - Bottom Left */}
      <svg className="absolute bottom-8 left-8 w-12 h-12" viewBox="0 0 48 48">
        <path
          d={`M 0 ${48 - cornerSize} L 0 48 L ${cornerSize} 48`}
          stroke={guideColor}
          strokeWidth={cornerThickness}
          fill="none"
          strokeLinecap="round"
          className="transition-colors duration-300"
        />
      </svg>

      {/* Corner Brackets - Bottom Right */}
      <svg className="absolute bottom-8 right-8 w-12 h-12" viewBox="0 0 48 48">
        <path
          d={`M ${48 - cornerSize} 48 L 48 48 L 48 ${48 - cornerSize}`}
          stroke={guideColor}
          strokeWidth={cornerThickness}
          fill="none"
          strokeLinecap="round"
          className="transition-colors duration-300"
        />
      </svg>

      {/* Center Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <svg className="w-32 h-32" viewBox="0 0 128 128">
          {/* Horizontal line */}
          <line
            x1="0"
            y1="64"
            x2="48"
            y2="64"
            stroke={guideColor}
            strokeWidth="2"
            strokeDasharray="4 4"
            className="transition-colors duration-300"
          />
          <line
            x1="80"
            y1="64"
            x2="128"
            y2="64"
            stroke={guideColor}
            strokeWidth="2"
            strokeDasharray="4 4"
            className="transition-colors duration-300"
          />
          
          {/* Vertical line */}
          <line
            x1="64"
            y1="0"
            x2="64"
            y2="48"
            stroke={guideColor}
            strokeWidth="2"
            strokeDasharray="4 4"
            className="transition-colors duration-300"
          />
          <line
            x1="64"
            y1="80"
            x2="64"
            y2="128"
            stroke={guideColor}
            strokeWidth="2"
            strokeDasharray="4 4"
            className="transition-colors duration-300"
          />
          
          {/* Center circle */}
          <circle
            cx="64"
            cy="64"
            r="12"
            stroke={guideColor}
            strokeWidth="2"
            fill="none"
            className={`transition-all duration-300 ${isAligned ? 'animate-pulse' : ''}`}
          />
          <circle
            cx="64"
            cy="64"
            r="4"
            fill={guideColor}
            className={`transition-all duration-300 ${isAligned ? 'animate-pulse' : ''}`}
          />
        </svg>
      </div>

      {/* Horizontal Grid Lines */}
      <svg className="absolute inset-0 w-full h-full opacity-20">
        <line x1="0" y1="33%" x2="100%" y2="33%" stroke={guideColor} strokeWidth="1" strokeDasharray="8 8" />
        <line x1="0" y1="66%" x2="100%" y2="66%" stroke={guideColor} strokeWidth="1" strokeDasharray="8 8" />
        <line x1="33%" y1="0" x2="33%" y2="100%" stroke={guideColor} strokeWidth="1" strokeDasharray="8 8" />
        <line x1="66%" y1="0" x2="66%" y2="100%" stroke={guideColor} strokeWidth="1" strokeDasharray="8 8" />
      </svg>

      {/* Guide Name Label */}
      {guideName && (
        <div className={`absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg font-semibold text-sm backdrop-blur transition-colors duration-300 ${
          isAligned 
            ? 'bg-green-500/80 text-white' 
            : 'bg-yellow-500/80 text-white'
        }`}>
          {guideName}
        </div>
      )}

      {/* Alignment Status */}
      {isAligned && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-green-500/90 text-white px-4 py-2 rounded-full text-sm font-bold animate-pulse">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          ALIGNED - READY
        </div>
      )}
    </div>
  );
};
