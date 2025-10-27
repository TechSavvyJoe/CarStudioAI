import React from 'react';

export const CameraIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M 6.827 6.175 A 2.31 2.31 0 0 1 5.186 7.23 c -0.38 .054 -0.757 .112 -1.134 .175 C 2.999 7.58 2.25 8.507 2.25 9.574 V 18 a 2.25 2.25 0 0 0 2.25 2.25 h 15 A 2.25 2.25 0 0 0 21.75 18 V 9.574 c 0 -1.067 -0.75 -1.994 -1.802 -2.169 a 47.865 47.865 0 0 0 -1.134 -0.175 a 2.31 2.31 0 0 1 -1.64 -1.055 l -0.822 -1.316 a 2.192 2.192 0 0 0 -1.736 -1.039 a 48.776 48.776 0 0 0 -5.232 0 a 2.192 2.192 0 0 0 -1.736 1.039 l -0.821 1.316 z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M 16.5 12.75 a 4.5 4.5 0 1 1 -9 0 a 4.5 4.5 0 0 1 9 0 z M 18.75 10.5 h .008 v .008 h -0.008 V 10.5 z" />
  </svg>
);
