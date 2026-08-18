import React, { useState, useRef } from 'react';

const Card3D = ({ children, className = '', depth = 20, glowColor = 'indigo' }) => {
  const [transform, setTransform] = useState('rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50, opacity: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const cardRef = useRef(null);

  const glowColors = {
    indigo: 'rgba(99, 102, 241, 0.4)',
    purple: 'rgba(139, 92, 246, 0.4)',
    teal: 'rgba(20, 184, 166, 0.4)',
    amber: 'rgba(245, 158, 11, 0.4)',
    rose: 'rgba(244, 63, 94, 0.4)'
  };

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -depth;
    const rotateY = ((x - centerX) / centerX) * depth;

    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setTransform(`rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02) translateZ(20px)`);
    setGlarePosition({ x: glareX, y: glareY, opacity: 0.2 });
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setTransform('rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1) translateZ(0px)');
    setGlarePosition((prev) => ({ ...prev, opacity: 0 }));
    setIsHovering(false);
  };

  const glowShadow = isHovering 
    ? `0 30px 60px -12px ${glowColors[glowColor]}, 0 0 60px -10px ${glowColors[glowColor]}, 0 0 100px -20px ${glowColors[glowColor]}`
    : '0 10px 40px -10px rgba(0, 0, 0, 0.3)';

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      className={`perspective-1000 transition-transform duration-300 ease-out cursor-pointer relative ${className}`}
      style={{
        transform,
        transformStyle: 'preserve-3d',
        boxShadow: glowShadow,
        transition: 'transform 0.1s linear, box-shadow 0.3s ease'
      }}
    >
      {/* Dynamic 3D Glare Overlay */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300 z-20"
        style={{
          background: `radial-gradient(ellipse at ${glarePosition.x}% ${glarePosition.y}%, rgba(255, 255, 255, 0.15) 0%, transparent 60%)`,
          opacity: glarePosition.opacity
        }}
      />

      {/* Animated border glow */}
      {isHovering && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl animate-pulse-glow" 
          style={{ 
            boxShadow: `0 0 30px 5px ${glowColors[glowColor]}`,
            zIndex: -1 
          }}
        />
      )}

      <div className="preserve-3d h-full transition-all duration-300">
        {children}
      </div>
    </div>
  );
};

export default Card3D;