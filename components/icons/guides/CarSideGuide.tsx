import React from 'react';
import type { GuideProps } from '../../../types';
import { GuideContainer } from './GuideContainer';

export const CarSideGuide: React.FC<GuideProps> = ({ vehicleType = 'sedan', ...props }) => {
    const isTall = vehicleType === 'suv' || vehicleType === 'truck' || vehicleType === 'minivan';
    const isLong = vehicleType === 'wagon' || vehicleType === 'truck' || vehicleType === 'minivan';
    
    const roofHeight = isTall ? 180 : 220;
    const bodyHeight = isTall ? 340 : 360;
    const length = isLong ? 700 : 650;
    const wheelR = isTall ? 15 : 12;
    const groundY = 500;
    const frontOverhang = 80;
    const rearOverhang = 80;
    const wheelBase = length - frontOverhang - rearOverhang;

    return (
        <GuideContainer {...props}>
            <g filter="url(#guide-glow)" stroke="#04a1f9" fill="none" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                {/* Ground Silhouette */}
                <path d={`M ${400 - length/2} ${groundY} L ${400 + length/2} ${groundY}`} strokeWidth="2" stroke="#04a1f9" />
                
                {/* Wheel Markers */}
                <circle cx={400 - wheelBase/2} cy={groundY} r={wheelR} fill="#04a1f9" className="animate-breathing-glow" />
                <circle cx={400 + wheelBase/2} cy={groundY} r={wheelR} fill="#04a1f9" className="animate-breathing-glow" />

                {/* Body Framing lines */}
                <path d={`M ${400 - length/2} ${groundY} L ${400 - length/2} ${bodyHeight}`} strokeDasharray="4 4" opacity="0.6" />
                <path d={`M ${400 + length/2} ${groundY} L ${400 + length/2} ${bodyHeight}`} strokeDasharray="4 4" opacity="0.6" />
                <path d={`M ${400 - length/2} ${bodyHeight} L ${400 + length/2} ${bodyHeight}`} strokeDasharray="4 4" opacity="0.6" />
                
                {/* Roofline */}
                 <path d={`M ${400 - length/2 + 150} ${roofHeight} L ${400 + length/2 - 150} ${roofHeight}`} strokeDasharray="4 4" opacity="0.6" />

                {/* Pillars */}
                <path d={`M ${400 - length/2 + 150} ${roofHeight} L ${400 - length/2 + 180} ${bodyHeight}`} strokeDasharray="4 4" opacity="0.6" />
                <path d={`M ${400 + length/2 - 150} ${roofHeight} L ${400 + length/2 - 180} ${bodyHeight}`} strokeDasharray="4 4" opacity="0.6" />

                {/* Key Point Markers */}
                <circle cx={400 - length/2} cy={bodyHeight} r="5" fill="#04a1f9" className="animate-breathing-glow" />
                <circle cx={400 + length/2} cy={bodyHeight} r="5" fill="#04a1f9" className="animate-breathing-glow" />
                <circle cx={400 - length/2 + 150} cy={roofHeight} r="5" fill="#04a1f9" />
                <circle cx={400 + length/2 - 150} cy={roofHeight} r="5" fill="#04a1f9" />
            </g>
        </GuideContainer>
    );
};