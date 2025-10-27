
import React from 'react';
import type { GuideProps } from '../../../types';
import { GuideContainer } from './GuideContainer';

export const CarDashboardGuide: React.FC<GuideProps> = ({ ...props }) => (
    <GuideContainer {...props}>
        <g filter="url(#guide-glow)" stroke="#04a1f9" fill="none" strokeWidth="1">
            {/* Main dashboard outline */}
            <path d="M 50 300 C 100 280, 700 280, 750 300 L 780 500 L 20 500 z" strokeDasharray="6 6" strokeOpacity="0.7" />

            {/* Steering Wheel Focus */}
            <circle cx="280" cy="380" r="80" strokeDasharray="6 6" />
            <circle cx="280" cy="380" r="5" fill="#04a1f9" className="animate-breathing-glow" />
            
            {/* Instrument Cluster / Infotainment Focus */}
            <rect x="400" y="300" width="300" height="100" rx="10" strokeDasharray="6 6" />
            <circle cx="550" cy="350" r="5" fill="#04a1f9" className="animate-breathing-glow" />
        </g>
    </GuideContainer>
);