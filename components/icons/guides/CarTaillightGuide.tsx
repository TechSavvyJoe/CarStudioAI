import React from 'react';
import type { GuideProps } from '../../../types';
import { GuideContainer } from './GuideContainer';

export const CarTaillightGuide: React.FC<GuideProps> = ({ ...props }) => (
    <GuideContainer {...props}>
        <g transform="scale(-1, 1) translate(-800, 0)" filter="url(#guide-glow)" stroke="#04a1f9" strokeWidth="1" fill="none" strokeLinecap="round">
            {/* Bounding Box */}
            <rect x="200" y="150" width="400" height="300" rx="10" strokeDasharray="6 6" strokeOpacity="0.7" />

            {/* Corner Brackets */}
            <path d="M 250 150 L 200 150 L 200 200" strokeWidth="1.5" />
            <path d="M 550 150 L 600 150 L 600 200" strokeWidth="1.5" />
            <path d="M 550 450 L 600 450 L 600 400" strokeWidth="1.5" />
            <path d="M 250 450 L 200 450 L 200 400" strokeWidth="1.5" />
            
            {/* Center Focus */}
            <circle cx="400" cy="300" r="5" fill="#04a1f9" className="animate-breathing-glow" />
            <circle cx="400" cy="300" r="30" strokeDasharray="5 5" />
        </g>
    </GuideContainer>
);