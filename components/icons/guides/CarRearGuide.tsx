import React from 'react';
import type { GuideProps } from '../../../types';
import { GuideContainer } from './GuideContainer';

export const CarRearGuide: React.FC<GuideProps> = ({ vehicleType = 'sedan', ...props }) => {
    const isTall = vehicleType === 'suv' || vehicleType === 'truck' || vehicleType === 'minivan';
    const isWide = vehicleType === 'suv' || vehicleType === 'truck';

    const height = isTall ? 340 : 280;
    const width = isWide ? 340 : 300;
    const roofHeight = isTall ? 150 : 200;
    const wheelY = 500;
    const wheelR = isTall ? 10 : 8;

    return (
        <GuideContainer {...props}>
             <g filter="url(#guide-glow)" stroke="#04a1f9" fill="none" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                {/* Ground Silhouette */}
                <path d={`M ${400-width} ${wheelY} L ${400+width} ${wheelY}`} strokeWidth="2" stroke="#04a1f9" />
                
                {/* Wheel Markers */}
                <circle cx={400 - width + 60} cy={wheelY} r={wheelR} fill="#04a1f9" className="animate-breathing-glow" />
                <circle cx={400 + width - 60} cy={wheelY} r={wheelR} fill="#04a1f9" className="animate-breathing-glow" />

                {/* Vertical Framing Lines */}
                <path d={`M ${400-width} ${wheelY} L ${400-width} ${wheelY - height}`} strokeDasharray="4 4" opacity="0.6" />
                <path d={`M ${400+width} ${wheelY} L ${400+width} ${wheelY - height}`} strokeDasharray="4 4" opacity="0.6" />
                <path d={`M ${400-width/1.5} ${wheelY - height} L ${400+width/1.5} ${wheelY - height}`} strokeDasharray="4 4" opacity="0.6" />

                {/* Key Point Markers */}
                <circle cx={400-width} cy={wheelY - height} r="5" fill="#04a1f9" className="animate-breathing-glow" />
                <circle cx={400+width} cy={wheelY - height} r="5" fill="#04a1f9" className="animate-breathing-glow" />
                <circle cx={400-width/1.5} cy={wheelY - height} r="5" fill="#04a1f9" />
                <circle cx={400+width/1.5} cy={wheelY - height} r="5" fill="#04a1f9" />
                <circle cx={400} cy={wheelY - height + (height - roofHeight)} r="5" fill="#04a1f9" className="animate-breathing-glow" />

                {/* Roof/Trunk Lines */}
                <path d={`M ${400-width/1.5} ${wheelY - height} L ${400-width/1.5 + 50} ${wheelY - height + (height - roofHeight)} L 400 ${wheelY - height + (height - roofHeight)}`} strokeDasharray="4 4" opacity="0.6" />
                <path d={`M ${400+width/1.5} ${wheelY - height} L ${400+width/1.5 - 50} ${wheelY - height + (height - roofHeight)} L 400 ${wheelY - height + (height - roofHeight)}`} strokeDasharray="4 4" opacity="0.6" />
            </g>
        </GuideContainer>
    );
};