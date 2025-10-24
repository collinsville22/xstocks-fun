import React from 'react';

export const LandscapeBackground: React.FC = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-0 pointer-events-none">
      <svg
        width="100%"
        height="200"
        viewBox="0 0 1200 200"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Grass Hills */}
        <path d="M0 120 Q 150 80 300 120 T 600 120 T 900 120 T 1200 120 L 1200 200 L 0 200 Z" fill="#7EC850"/>
        <path d="M0 140 Q 200 100 400 140 T 800 140 T 1200 140 L 1200 200 L 0 200 Z" fill="#6DB33F"/>

        {/* Grass Blades */}
        {[...Array(20)].map((_, i) => (
          <rect
            key={i}
            x={i * 60 + Math.random() * 20}
            y={170 + Math.random() * 10}
            width="4"
            height={15 + Math.random() * 10}
            fill="#5A9E2E"
            transform={`rotate(${-10 + Math.random() * 20} ${i * 60 + 2} 180)`}
          />
        ))}

        {/* Rocks */}
        <ellipse cx="100" cy="185" rx="40" ry="20" fill="#808080"/>
        <ellipse cx="120" cy="190" rx="30" ry="15" fill="#696969"/>
        <ellipse cx="900" cy="188" rx="35" ry="18" fill="#808080"/>
        <ellipse cx="1000" cy="192" rx="25" ry="12" fill="#696969"/>

        {/* Flowers */}
        <circle cx="300" cy="170" r="5" fill="#FFD700"/>
        <circle cx="500" cy="165" r="5" fill="#FF69B4"/>
        <circle cx="700" cy="172" r="5" fill="#FFA500"/>
      </svg>
    </div>
  );
};
