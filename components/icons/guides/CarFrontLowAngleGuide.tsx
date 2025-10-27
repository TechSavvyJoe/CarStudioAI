
import React from 'react';
import type { GuideProps } from '../../../types';
import { GuideContainer } from './GuideContainer';

export const CarFrontLowAngleGuide: React.FC<GuideProps> = ({ ...props }) => (
    <GuideContainer {...props}>
        <g filter="url(#guide-glow)" stroke="#04a1f9" fill="none" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            {/* Ground Plane */}
            <path d="M 50 550 L 350 450 L 450 450 L 750 550 z" strokeOpacity="0.7" />
            <circle cx="350" cy="450" r="5" fill="#04a1f9" className="animate-breathing-glow" />
            <circle cx="450" cy="450" r="5" fill="#04a1f9" className="animate-breathing-glow" />
            
            {/* Perspective Lines */}
            <path d="M 50 550 L 250 150" strokeDasharray="4 4" opacity="0.6" />
            <path d="M 750 550 L 550 150" strokeDasharray="4 4" opacity="0.6" />
            
            {/* Top Framing */}
            <path d="M 250 150 L 550 150" strokeWidth="1.5" />
            <circle cx="250" cy="150" r="5" fill="#04a1f9" className="animate-breathing-glow" />
            <circle cx="550" cy="150" r="5" fill="#04a1f9" className="animate-breathing-glow" />
        </g>
    </GuideContainer>
);