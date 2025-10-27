import React from 'react';

interface GuideContainerProps extends React.SVGProps<SVGSVGElement> {
  children: React.ReactNode;
}

export const GuideContainer: React.FC<GuideContainerProps> = ({ children, ...props }) => {
  return (
    <svg viewBox="0 0 800 600" fill="none" stroke="currentColor" xmlns="http://www.w.org/2000/svg" {...props}>
      <defs>
        <filter id="guide-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" result="blur" />
          <feFlood floodColor="#04a1f9" result="flood" />
          <feComposite in="flood" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {children}
    </svg>
  );
};