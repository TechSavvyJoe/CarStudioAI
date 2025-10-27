import React from 'react';
import type { GuideProps } from '../../../types';
import { GuideContainer } from './GuideContainer';

export const CarWheelGuide: React.FC<GuideProps> = ({ ...props }) => (
    <GuideContainer {...props}>
        <g filter="url(#guide-glow)" stroke="#04a1f9" strokeWidth="1" fill="none" strokeLinecap="round">
            {/* Main Circle */}
            <circle cx="400" cy="300" r="250" strokeDasharray="8 8" strokeOpacity="0.7" />
            
            {/* Corner Brackets */}
            <path d="M 150 100 A 250 250 0 0 1 200 50" />
            <path d="M 650 100 A 250 250 0 0 0 600 50" />
            <path d="M 150 500 A 250 250 0 0 0 200 550" />
            <path d="M 650 500 A 250 250 0 0 1 600 550" />

            {/* Center Crosshair */}
            <line x1="400" y1="280" x2="400" y2="320" strokeWidth="1.5" />
            <line x1="380" y1="300" x2="420" y2="300" strokeWidth="1.5" />
            <circle cx="400" cy="300" r="15" strokeDasharray="4 4" />
            <circle cx="400" cy="300" r="4" fill="#04a1f9" className="animate-breathing-glow" />
        </g>
    </GuideContainer>
);