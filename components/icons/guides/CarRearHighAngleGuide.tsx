
import React from 'react';
import type { GuideProps } from '../../../types';
import { GuideContainer } from './GuideContainer';

export const CarRearHighAngleGuide: React.FC<GuideProps> = ({ ...props }) => (
    <GuideContainer {...props}>
        <g filter="url(#guide-glow)" stroke="#04a1f9" fill="none" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            {/* Top Plane (Roof/Trunk) */}
            <path d="M 150 150 L 650 150 L 750 250 L 50 250 z" strokeOpacity="0.7" />
            <circle cx="150" cy="150" r="5" fill="#04a1f9" className="animate-breathing-glow" />
            <circle cx="650" cy="150" r="5" fill="#04a1f9" className="animate-breathing-glow" />

            {/* Perspective Lines */}
            <path d="M 50 250 L 150 500" strokeDasharray="4 4" opacity="0.6" />
            <path d="M 750 250 L 650 500" strokeDasharray="4 4" opacity="0.6" />
            
            {/* Bottom Framing */}
            <path d="M 150 500 L 650 500" strokeWidth="1.5" />
            <circle cx="150" cy="500" r="5" fill="#04a1f9" className="animate-breathing-glow" />
            <circle cx="650" cy="500" r="5" fill="#04a1f9" className="animate-breathing-glow" />
        </g>
    </GuideContainer>
);