import React from 'react';
import type { GuideProps } from '../../../types';
import { GuideContainer } from './GuideContainer';

export const CarGrilleGuide: React.FC<GuideProps> = ({ ...props }) => (
    <GuideContainer {...props}>
        <g filter="url(#guide-glow)" stroke="#04a1f9" strokeWidth="1" fill="none" strokeLinecap="round">
            {/* Bounding Box */}
            <rect x="200" y="200" width="400" height="200" rx="10" strokeDasharray="6 6" strokeOpacity="0.7" />

            {/* Corner Brackets */}
            <path d="M 230 200 L 200 200 L 200 230" />
            <path d="M 570 200 L 600 200 L 600 230" />
            <path d="M 230 400 L 200 400 L 200 370" />
            <path d="M 570 400 L 600 400 L 600 370" />

            {/* Center Focus Crosshair */}
            <line x1="400" y1="280" x2="400" y2="320" strokeWidth="1.5" />
            <line x1="380" y1="300" x2="420" y2="300" strokeWidth="1.5" />
            <circle cx="400" cy="300" r="10" strokeDasharray="4 4" />
            <circle cx="400" cy="300" r="3" fill="#04a1f9" className="animate-breathing-glow" />
        </g>
    </GuideContainer>
);