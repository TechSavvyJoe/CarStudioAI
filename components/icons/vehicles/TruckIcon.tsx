


import React from 'react';

export const TruckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 64 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M 2 29 h 8 v -9 H 14 l 4 -8 h 10 v 17 h 30 V 15 H 40" />
    <path d="M 2 29 a 4 4 0 0 0 -2 3 v 1 h 64 v -1 a 4 4 0 0 0 -2 -3 H 2 z" />
    <circle cx="14" cy="29" r="5" />
    <circle cx="50" cy="29" r="5" />
  </svg>
);
