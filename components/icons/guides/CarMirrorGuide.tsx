
import React from 'react';
import type { GuideProps } from '../../../types';
import { GuideContainer } from './GuideContainer';

export const CarMirrorGuide: React.FC<GuideProps> = ({ ...props }) => (
    <GuideContainer {...props}>
        <g filter="url(#guide-glow)" stroke="#04a1f9" fill="none">
            {/* Mirror Shape */}
            <path d="M 300 250 C 300 180, 400 150, 550 200 L 550 400 C 400 450, 300 420, 300 350 z" strokeWidth="1" strokeDasharray="6 6" strokeOpacity="0.7" />
            
            {/* Center Focus */}
            <circle cx="425" cy="300" r="5" fill="#04a1f9" className="animate-breathing-glow" />

            {/* Corner Brackets */}
            <g strokeWidth="1" strokeLinecap="round">
                <path d="M 320 230 L 300 230 L 300 250" />
                <path d="M 530 200 L 550 200 L 550 220" />
                <path d="M 530 400 L 550 400 L 550 380" />
                <path d="M 320 370 L 300 370 L 300 350" />
            </g>
        </g>
    </GuideContainer>
);