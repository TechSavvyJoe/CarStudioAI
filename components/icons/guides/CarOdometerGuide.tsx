import React from 'react';
import type { GuideProps } from '../../../types';
import { GuideContainer } from './GuideContainer';

export const CarOdometerGuide: React.FC<GuideProps> = ({ opacity = 0.4 }) => {
  return (
    <GuideContainer opacity={opacity}>
      <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Instrument cluster outline */}
        <rect x="80" y="100" width="240" height="100" rx="10" stroke="white" strokeWidth="2" strokeDasharray="4 4" />
        
        {/* Left gauge (speedometer/tachometer) */}
        <circle cx="140" cy="150" r="35" stroke="white" strokeWidth="2" fill="none" />
        <path d="M 140 115 A 35 35 0 0 1 175 150" stroke="white" strokeWidth="1" fill="none" />
        <line x1="140" y1="150" x2="160" y2="135" stroke="white" strokeWidth="2" />
        
        {/* Right gauge (speedometer/tachometer) */}
        <circle cx="260" cy="150" r="35" stroke="white" strokeWidth="2" fill="none" />
        <path d="M 225 150 A 35 35 0 0 1 260 185" stroke="white" strokeWidth="1" fill="none" />
        <line x1="260" y1="150" x2="240" y2="165" stroke="white" strokeWidth="2" />
        
        {/* Center digital display area */}
        <rect x="185" y="135" width="30" height="30" stroke="white" strokeWidth="1.5" fill="none" />
        
        {/* Odometer digits representation */}
        <text x="200" y="155" textAnchor="middle" fill="white" fontSize="12" fontFamily="monospace">000000</text>
        
        {/* Warning lights area */}
        <circle cx="200" cy="110" r="4" stroke="white" strokeWidth="1" fill="none" />
        <circle cx="215" cy="110" r="4" stroke="white" strokeWidth="1" fill="none" />
        <circle cx="185" cy="110" r="4" stroke="white" strokeWidth="1" fill="none" />
        
        {/* Fuel gauge indicator */}
        <text x="200" y="190" textAnchor="middle" fill="white" fontSize="10">E ━━━━━ F</text>
        
        {/* Center alignment line */}
        <line x1="200" y1="90" x2="200" y2="210" stroke="white" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
      </svg>
    </GuideContainer>
  );
};
