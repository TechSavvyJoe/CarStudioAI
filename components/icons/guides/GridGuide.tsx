
import React from 'react';

export const GridGuide: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 800 600" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
        <g strokeWidth="1" strokeOpacity="0.7">
            {/* Vertical Lines */}
            <line x1="267" y1="0" x2="267" y2="600" />
            <line x1="533" y1="0" x2="533" y2="600" />
            {/* Horizontal Lines */}
            <line x1="0" y1="200" x2="800" y2="200" />
            <line x1="0" y1="400" x2="800" y2="400" />
        </g>
    </svg>
);