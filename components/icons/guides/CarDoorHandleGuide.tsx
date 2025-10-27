import React from 'react';
import type { GuideProps } from '../../../types';
import { GuideContainer } from './GuideContainer';

export const CarDoorHandleGuide: React.FC<GuideProps> = ({ ...props }) => (
    <GuideContainer {...props}>
        <g filter="url(#guide-glow)" stroke="#04a1f9" strokeWidth="1" fill="none" strokeLinecap="round">
            {/* Bounding Box */}
            <rect x="250" y="250" width="300" height="100" rx="5" strokeDasharray="6 6" strokeOpacity="0.7" />

            {/* Corner Brackets */}
            <path d="M 270 250 L 250 250 L 250 270" />
            <path d="M 530 250 L 550 250 L 550 270" />
            <path d="M 270 350 L 250 350 L 250 330" />
            <path d="M 530 350 L 550 350 L 550 330" />

            {/* Center Focus */}
            <circle cx="400" cy="300" r="5" fill="#04a1f9" className="animate-breathing-glow" />
        </g>
    </GuideContainer>
);