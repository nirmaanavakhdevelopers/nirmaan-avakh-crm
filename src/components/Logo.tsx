/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface LogoProps {
  className?: string; // sizes: e.g. h-10, h-16, h-24
  showText?: boolean;
  minimal?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = 'h-16', showText = true, minimal = false }) => {
  if (minimal) {
    return (
      <svg
        className={className}
        viewBox="0 0 400 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        referrerPolicy="no-referrer"
      >
        {/* Glowing Sun Sunrise (Right Side) */}
        <path
          d="M210,120 L270,100 M210,120 L275,120 M210,120 L265,140 M210,120 L250,165 M210,120 L230,175 M210,120 L205,180 M210,120 L270,80 M210,120 L255,60 M210,120 L235,50 M210,120 L210,45"
          stroke="#D29E2E"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.8"
        />
        <circle cx="210" cy="120" r="30" fill="#D29E2E" opacity="0.9" />

        {/* Skyscrapers Navy Blue Towers */}
        {/* Tower 4 (Rightmost) */}
        <rect x="225" y="90" width="22" height="60" fill="#0F2942" />
        <path d="M225,90 L247,100 L247,150 L225,150 Z" fill="#132c45" />

        {/* Tower 3 */}
        <rect x="200" y="65" width="22" height="90" fill="#0F2942" />
        <path d="M200,65 L222,75 L222,155 L200,155 Z" fill="#132c45" />

        {/* Tower 2 (Tallest Center-left) */}
        <rect x="175" y="45" width="22" height="110" fill="#0F2942" />
        <path d="M175,45 L197,55 L197,155 L175,155 Z" fill="#132c45" />

        {/* Tower 1 (Leftmost) */}
        <rect x="150" y="75" width="22" height="80" fill="#0F2942" />
        <path d="M150,75 L172,85 L172,155 L150,155 Z" fill="#132c45" />

        {/* Gold Roof Gable House Structure */}
        {/* Double-sloped sweep */}
        <path
          d="M110,185 C140,185 160,170 195,140 C200,135 200,135 205,140 C240,170 260,185 290,185 C270,180 250,170 220,145 C205,130 195,130 180,145 C150,170 130,180 110,185 Z"
          fill="#D29E2E"
        />
        
        {/* Inner Gable Windows */}
        <rect x="187" y="157" width="10" height="10" fill="#D29E2E" />
        <rect x="201" y="157" width="10" height="10" fill="#D29E2E" />
        <rect x="187" y="171" width="10" height="10" fill="#D29E2E" />
        <rect x="201" y="171" width="10" height="10" fill="#D29E2E" />
      </svg>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Upper Border Accent (as in the logo card) */}
      <div className="w-full h-1 bg-[#D29E2E] mb-2 rounded-full opacity-40"></div>
      
      {/* Brand SVG Emblem */}
      <svg
        className="w-auto h-full"
        viewBox="0 0 400 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        referrerPolicy="no-referrer"
      >
        {/* Glowing Sun Sunrise (Right Side) */}
        <path
          d="M210,120 L270,100 M210,120 L275,120 M210,120 L265,140 M210,120 L250,165 M210,120 L230,175 M210,120 L205,180 M210,120 L270,80 M210,120 L255,60 M210,120 L235,50 M210,120 L210,45"
          stroke="#D29E2E"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.8"
        />
        <circle cx="210" cy="120" r="30" fill="#D29E2E" opacity="0.9" />

        {/* Skyscrapers Navy Blue Towers */}
        {/* Tower 4 (Rightmost) */}
        <rect x="225" y="90" width="22" height="60" fill="#0F2942" />
        <path d="M225,90 L247,100 L247,150 L225,150 Z" fill="#132c45" />

        {/* Tower 3 */}
        <rect x="200" y="65" width="22" height="90" fill="#0F2942" />
        <path d="M200,65 L222,75 L222,155 L200,155 Z" fill="#132c45" />

        {/* Tower 2 (Tallest Center-left) */}
        <rect x="175" y="45" width="22" height="110" fill="#0F2942" />
        <path d="M175,45 L197,55 L197,155 L175,155 Z" fill="#132c45" />

        {/* Tower 1 (Leftmost) */}
        <rect x="150" y="75" width="22" height="80" fill="#0F2942" />
        <path d="M150,75 L172,85 L172,155 L150,155 Z" fill="#132c45" />

        {/* Gold Roof Gable House Structure */}
        {/* Double-sloped sweep */}
        <path
          d="M110,185 C140,185 160,170 195,140 C200,135 200,135 205,140 C240,170 260,185 290,185 C270,180 250,170 220,145 C205,130 195,130 180,145 C150,170 130,180 110,185 Z"
          fill="#D29E2E"
        />
        
        {/* Inner Gable Windows */}
        <rect x="187" y="157" width="10" height="10" fill="#D29E2E" />
        <rect x="201" y="157" width="10" height="10" fill="#D29E2E" />
        <rect x="187" y="171" width="10" height="10" fill="#D29E2E" />
        <rect x="201" y="171" width="10" height="10" fill="#D29E2E" />
      </svg>

      {showText && (
        <div className="text-center mt-2">
          <h1 className="font-serif text-[#0F2942] text-xl font-bold tracking-widest leading-none">
            NIRMAAN AVAKH
          </h1>
          <h2 className="font-sans text-[#0F2942] text-base font-medium tracking-[0.25em] mt-1 leading-none">
            DEVELOPERS
          </h2>
          <span className="block font-sans text-xs text-black font-semibold uppercase tracking-[0.15em] mt-2 opacity-80">
            DISCOVER, INVEST AND GROW
          </span>
        </div>
      )}

      {/* Lower Border Accent */}
      <div className="w-full h-1 bg-[#D29E2E] mt-2 rounded-full opacity-40"></div>
    </div>
  );
};
export default Logo;
