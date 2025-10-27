import React from 'react';
import type { GuideProps } from '../../../types';
import { GuideContainer } from './GuideContainer';

export const CarEngineGuide: React.FC<GuideProps> = ({ opacity = 0.4 }) => {
  return (
    <GuideContainer opacity={opacity}>
      <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Engine bay outline */}
        <rect x="100" y="60" width="200" height="180" stroke="white" strokeWidth="2" strokeDasharray="4 4" />
        
        {/* Hood/bonnet shape */}
        <path d="M 150 60 L 200 40 L 250 60" stroke="white" strokeWidth="2" />
        
        {/* Engine block representation */}
        <rect x="160" y="100" width="80" height="60" stroke="white" strokeWidth="2" fill="none" />
        
        {/* Belt/pulley system */}
        <circle cx="170" cy="130" r="15" stroke="white" strokeWidth="2" fill="none" />
        <circle cx="230" cy="130" r="15" stroke="white" strokeWidth="2" fill="none" />
        <line x1="185" y1="130" x2="215" y2="130" stroke="white" strokeWidth="1" />
        
        {/* Radiator cap indicator */}
        <circle cx="200" cy="200" r="12" stroke="white" strokeWidth="2" fill="none" />
        <line x1="200" y1="188" x2="200" y2="212" stroke="white" strokeWidth="2" />
        <line x1="188" y1="200" x2="212" y2="200" stroke="white" strokeWidth="2" />
        
        {/* Air intake */}
        <path d="M 120 100 L 140 100 L 140 140 L 120 140" stroke="white" strokeWidth="2" fill="none" />
        
        {/* Battery indicator */}
        <rect x="260" y="180" width="30" height="40" stroke="white" strokeWidth="2" fill="none" />
        <rect x="268" y="175" width="6" height="5" fill="white" />
        <rect x="276" y="175" width="6" height="5" fill="white" />
        
        {/* Center guideline */}
        <line x1="200" y1="40" x2="200" y2="240" stroke="white" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
      </svg>
    </GuideContainer>
  );
};
