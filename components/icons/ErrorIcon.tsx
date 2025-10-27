import React from 'react';

export const ErrorIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M 12 9 v 3.75 m -9.303 3.376 c -0.866 1.5 .217 3.374 1.948 3.374 h 14.71 c 1.73 0 2.813 -1.874 1.948 -3.374 L 13.949 3.378 c -0.866 -1.5 -3.032 -1.5 -3.898 0 L 2.697 16.126 z M 12 15.75 h .007 v .008 H 12 v -0.008 z" />
  </svg>
);
