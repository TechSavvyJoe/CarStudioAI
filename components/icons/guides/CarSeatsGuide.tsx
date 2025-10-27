
import React from 'react';
import type { GuideProps } from '../../../types';
import { GuideContainer } from './GuideContainer';

const SeatOutline: React.FC<{transform?: string}> = ({ transform }) => (
    <g transform={transform}>
        {/* Headrest */}
        <rect x="170" y="150" width="60" height="40" rx="5" strokeDasharray="6 6" strokeOpacity="0.7"/>
        <circle cx="200" cy="170" r="4" fill="#04a1f9" className="animate-breathing-glow" />
        {/* Seat Back */}
        <path d="M 150 200 L 250 200 L 250 400 L 150 400 z" strokeDasharray="6 6" strokeOpacity="0.7"/>
        {/* Seat Bottom */}
        <path d="M 150 400 L 250 400 L 270 500 L 130 500 z" strokeDasharray="6 6" strokeOpacity="0.7"/>
    </g>
);


export const CarSeatsGuide: React.FC<GuideProps> = ({ ...props }) => (
    <GuideContainer {...props}>
        <g filter="url(#guide-glow)" stroke="#04a1f9" strokeWidth="1" fill="none">
            {/* Left Seat */}
            <SeatOutline transform="translate(150, 0)" />
            {/* Right Seat */}
            <SeatOutline transform="translate(300, 0)" />
        </g>
    </GuideContainer>
);