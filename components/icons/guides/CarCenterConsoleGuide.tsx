
import React from 'react';
import type { GuideProps } from '../../../types';
import { GuideContainer } from './GuideContainer';

export const CarCenterConsoleGuide: React.FC<GuideProps> = ({ ...props }) => (
    <GuideContainer {...props}>
        <g filter="url(#guide-glow)" stroke="#04a1f9" strokeOpacity="0.8">
            {/* Infotainment Screen Focus */}
            <rect x="275" y="100" width="250" height="150" rx="10" strokeWidth="1" fill="none" strokeDasharray="6 6" />
            <circle cx="400" cy="175" r="5" fill="#04a1f9" className="animate-breathing-glow" />

            {/* Shifter Area Focus */}
            <path d="M 325 320 L 475 320 L 525 500 L 275 500 z" strokeWidth="1" fill="none" strokeDasharray="6 6" />
            <circle cx="400" cy="410" r="5" fill="#04a1f9" className="animate-breathing-glow" />

            {/* Connecting Lines */}
            <line x1="400" y1="250" x2="400" y2="320" strokeWidth="1" strokeDasharray="3 5" strokeOpacity="0.5" />
        </g>
    </GuideContainer>
);