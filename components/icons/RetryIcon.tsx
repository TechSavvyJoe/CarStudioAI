
import React from 'react';

export const RetryIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M 19.952 10.23 A 9.704 9.704 0 0 0 12 4.5 C 8.98 4.5 6.273 5.924 4.5 8.016 M 4.048 13.77 a 9.704 9.704 0 0 0 7.952 5.714 c 3.02 0 5.727 -1.424 7.5 -3.516" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M 19.5 4.5 v 6 h -6 M 4.5 19.5 v -6 h 6" />
  </svg>
);
