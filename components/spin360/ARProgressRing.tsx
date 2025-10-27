import React from 'react';

interface ARProgressRingProps {
  /** Array of captured angles (0-360) */
  capturedAngles: number[];
  /** Total number of shots needed for full 360 */
  totalShots: number;
  /** Current angle being targeted */
  currentAngle: number;
  /** Ring size in pixels */
  size?: number;
  /** Ring thickness */
  strokeWidth?: number;
}

export const ARProgressRing: React.FC<ARProgressRingProps> = ({
  capturedAngles,
  totalShots,
  currentAngle,
  size = 280,
  strokeWidth = 8,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Calculate completion percentage
  const completionPercentage = (capturedAngles.length / totalShots) * 100;

  // Generate arc segments for captured angles
  const generateArcs = () => {
    if (capturedAngles.length === 0) return null;

    // Sort angles to create continuous segments
    const sortedAngles = [...capturedAngles].sort((a, b) => a - b);
    const arcs: React.ReactElement[] = [];
    
    // Group consecutive angles into segments
    let segmentStart = sortedAngles[0];
    let segmentEnd = sortedAngles[0];
    
    for (let i = 1; i <= sortedAngles.length; i++) {
      const currentAngleVal = sortedAngles[i];
      const angleDiff = i < sortedAngles.length ? currentAngleVal - segmentEnd : Infinity;
      
      // If angles are close (within shot spacing), extend segment
      if (angleDiff <= 360 / totalShots + 5) {
        segmentEnd = currentAngleVal;
      } else {
        // Create arc for this segment
        arcs.push(createArc(segmentStart, segmentEnd, arcs.length));
        if (i < sortedAngles.length) {
          segmentStart = currentAngleVal;
          segmentEnd = currentAngleVal;
        }
      }
    }

    return arcs;
  };

  const createArc = (startAngle: number, endAngle: number, key: number) => {
    // Convert angles to radians and adjust for SVG coordinate system (start at top)
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    const pathData = `
      M ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
    `;

    // Color interpolation from red to green based on completion
    const hue = (completionPercentage / 100) * 120; // 0 (red) to 120 (green)
    const color = `hsl(${hue}, 80%, 55%)`;

    return (
      <path
        key={key}
        d={pathData}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        style={{
          filter: 'drop-shadow(0 0 8px currentColor)',
          transition: 'stroke 0.3s ease',
        }}
      />
    );
  };

  // Current target angle indicator
  const targetAngleRad = ((currentAngle - 90) * Math.PI) / 180;
  const targetX = center + radius * Math.cos(targetAngleRad);
  const targetY = center + radius * Math.sin(targetAngleRad);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <svg
        width={size}
        height={size}
        className="transition-all duration-300"
        style={{
          filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))',
        }}
      >
        {/* Background circle (unfilled portion) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray="4 4"
        />

        {/* Captured segments */}
        {generateArcs()}

        {/* Current target angle indicator (pulsing dot) */}
        <circle
          cx={targetX}
          cy={targetY}
          r={6}
          fill="#60a5fa"
          stroke="white"
          strokeWidth={2}
          className="animate-pulse"
        />

        {/* Center crosshair */}
        <g opacity={0.6}>
          <line
            x1={center - 20}
            y1={center}
            x2={center + 20}
            y2={center}
            stroke="white"
            strokeWidth={1.5}
          />
          <line
            x1={center}
            y1={center - 20}
            x2={center}
            y2={center + 20}
            stroke="white"
            strokeWidth={1.5}
          />
          <circle
            cx={center}
            cy={center}
            r={8}
            stroke="white"
            strokeWidth={1.5}
            fill="none"
          />
        </g>

        {/* Completion percentage text */}
        <text
          x={center}
          y={center + 50}
          textAnchor="middle"
          fill="white"
          fontSize="20"
          fontWeight="600"
          style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)' }}
        >
          {Math.round(completionPercentage)}%
        </text>
      </svg>

      {/* Completion status text */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
        <div className="text-white text-sm font-medium px-4 py-2 rounded-full bg-black/40 backdrop-blur-sm">
          {capturedAngles.length} / {totalShots} shots
        </div>
      </div>
    </div>
  );
};
