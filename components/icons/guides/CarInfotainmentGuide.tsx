import React from 'react';
import type { GuideProps } from '../../../types';
import { GuideContainer } from './GuideContainer';

export const CarInfotainmentGuide: React.FC<GuideProps> = ({ opacity = 0.4 }) => {
  return (
    <GuideContainer opacity={opacity}>
      <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Screen outline */}
        <rect x="100" y="80" width="200" height="140" rx="8" stroke="white" strokeWidth="2" strokeDasharray="4 4" />
        
        {/* Screen border */}
        <rect x="105" y="85" width="190" height="130" rx="4" stroke="white" strokeWidth="1.5" fill="none" />
        
        {/* Top status bar */}
        <line x1="110" y1="100" x2="290" y2="100" stroke="white" strokeWidth="1" />
        
        {/* Navigation/map icon area */}
        <circle cx="150" cy="140" r="25" stroke="white" strokeWidth="1.5" fill="none" />
        <path d="M 150 125 L 150 155 M 135 140 L 165 140" stroke="white" strokeWidth="1.5" />
        
        {/* Media/radio controls */}
        <circle cx="250" cy="140" r="8" stroke="white" strokeWidth="1.5" fill="none" />
        <circle cx="250" cy="160" r="8" stroke="white" strokeWidth="1.5" fill="none" />
        <circle cx="250" cy="180" r="8" stroke="white" strokeWidth="1.5" fill="none" />
        
        {/* Climate controls */}
        <rect x="110" y="190" width="70" height="20" rx="4" stroke="white" strokeWidth="1" fill="none" />
        <text x="145" y="204" textAnchor="middle" fill="white" fontSize="10">CLIMATE</text>
        
        {/* Home button */}
        <circle cx="200" cy="200" r="10" stroke="white" strokeWidth="1.5" fill="none" />
        <path d="M 195 200 L 200 195 L 205 200 L 205 205 L 195 205 Z" stroke="white" strokeWidth="1" fill="none" />
        
        {/* Center alignment guides */}
        <line x1="200" y1="70" x2="200" y2="230" stroke="white" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
        <line x1="90" y1="150" x2="310" y2="150" stroke="white" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
      </svg>
    </GuideContainer>
  );
};
