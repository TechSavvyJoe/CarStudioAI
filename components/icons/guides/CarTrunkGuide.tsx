
import React from 'react';
import type { GuideProps } from '../../../types';
import { GuideContainer } from './GuideContainer';

export const CarTrunkGuide: React.FC<GuideProps> = ({ ...props }) => (
    <GuideContainer {...props}>
        <g filter="url(#guide-glow)" stroke="#04a1f9" fill="none" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            {/* Cargo Area Outline */}
            <path d="M 100 500 L 250 200 L 550 200 L 700 500 z" strokeDasharray="6 6" strokeOpacity="0.8" />
            
            {/* Center Focus */}
            <circle cx="400" cy="350" r="5" fill="#04a1f9" className="animate-breathing-glow" />

            {/* Corner Brackets */}
            <path d="M 120 480 L 100 500 L 120 520" transform="translate(0 -20)"/>
            <path d="M 680 480 L 700 500 L 680 520" transform="translate(0 -20)"/>
            <path d="M 270 220 L 250 200 L 270 180" transform="translate(0 20)"/>
            <path d="M 530 220 L 550 200 L 530 180" transform="translate(0 20)"/>
        </g>
    </GuideContainer>
);