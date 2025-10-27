
import React from 'react';
import type { GuideProps } from '../../../types';
import { GuideContainer } from './GuideContainer';

export const CarRearQuarterGuide: React.FC<GuideProps> = ({ vehicleType = 'sedan', ...props }) => {
    const isTall = vehicleType === 'suv' || vehicleType === 'truck' || vehicleType === 'minivan';
    const isLong = vehicleType === 'wagon' || vehicleType === 'truck';
    
    const roofHeight = isTall ? 180 : 220;
    const bodyHeight = isTall ? 320 : 340;
    const length = isLong ? 550 : 500;
    const wheelR = isTall ? 12 : 10;
    const groundY = 500;

    return (
        <GuideContainer {...props}>
            <g transform="scale(-1, 1) translate(-800, 0)" filter="url(#guide-glow)" stroke="#04a1f9" fill="none" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                {/* Ground Silhouette */}
                <path d={`M 150 ${groundY} L 280 ${groundY - 20} L ${150 + length} ${groundY - 20} L ${120 + length} ${groundY} z`} strokeWidth="2" stroke="#04a1f9" opacity="0.9" />

                {/* Wheel Markers */}
                <circle cx="230" cy={groundY - 5} r={wheelR} fill="#04a1f9" className="animate-breathing-glow" />
                <circle cx={150 + length - 100} cy={groundY - 15} r={wheelR} fill="#04a1f9" className="animate-breathing-glow" />

                {/* Vertical Framing Lines */}
                <path d={`M 280 ${groundY-20} L 290 ${bodyHeight}`} strokeDasharray="4 4" opacity="0.6" />
                <path d={`M 290 ${bodyHeight} L 310 ${roofHeight}`} strokeDasharray="4 4" opacity="0.6" />
                <path d={`M ${150 + length - 50} ${bodyHeight} L ${150 + length - 80} ${roofHeight}`} strokeDasharray="4 4" opacity="0.6" />
                <path d={`M 310 ${roofHeight} L ${150 + length - 80} ${roofHeight}`} strokeDasharray="4 4" opacity="0.6" />

                {/* Key Point Markers */}
                <circle cx="290" cy={bodyHeight} r="5" fill="#04a1f9" className="animate-breathing-glow" />
                <circle cx="310" cy={roofHeight} r="5" fill="#04a1f9" />
                <circle cx={150 + length - 50} cy={bodyHeight} r="5" fill="#04a1f9" />
                <circle cx={150 + length - 80} cy={roofHeight} r="5" fill="#04a1f9" className="animate-breathing-glow" />
            </g>
        </GuideContainer>
    );
};