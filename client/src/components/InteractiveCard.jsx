import React, { useState, useRef, useEffect } from 'react';

const InteractiveCard = ({ 
  children, 
  className = '', 
  depth = 15,
  glow = false,
  glowColor = 'indigo',
  onClick,
  href,
  style = {}
}) => {
  const [transform, setTransform] = useState('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const cardRef = useRef(null);

  const glowColors = {
    indigo: 'rgba(99, 102, 241, 0.35)',
    purple: 'rgba(139, 92, 246, 0.35)',
    teal: 'rgba(20, 184, 166, 0.35)',
    amber: 'rgba(245, 158, 11, 0.35)',
    rose: 'rgba(244, 63, 94, 0.35)',
    slate: 'rgba(100, 116, 139, 0.25)'
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

    setTransform(`perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02) translateZ(${isPressed ? 10 : 20}px)`);
    setGlare({ x: glareX, y: glareY, opacity: 0.12 });
  };

  const handleMouseEnter = () => setIsHovering(true);
  const handleMouseLeave = () => {
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1) translateZ(0px)');
    setGlare(p => ({ ...p, opacity: 0 }));
    setIsHovering(false);
    setIsPressed(false);
  };
  const handleMouseDown = () => setIsPressed(true);
  const handleMouseUp = () => setIsPressed(false);

  const boxShadow = isHovering && glow
    ? `0 25px 50px -12px ${glowColors[glowColor]}, 0 0 40px -10px ${glowColors[glowColor]}, 0 10px 30px -10px rgba(0, 0, 0, 0.1)`
    : isHovering
      ? '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 10px 30px -10px rgba(0, 0, 0, 0.1)'
      : '0 4px 20px -4px rgba(0, 0, 0, 0.08), 0 2px 10px -2px rgba(0, 0, 0, 0.06)';

  const Component = href ? 'a' : onClick ? 'button' : 'div';

  return (
    <Component
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onClick={onClick}
      href={href}
      className={`relative group perspective-1000 transition-all duration-300 ease-out cursor-pointer ${className}`}
      style={{
        transform,
        transformStyle: 'preserve-3d',
        boxShadow,
        transition: 'transform 0.1s linear, box-shadow 0.3s ease',
        ...style
      }}
      tabIndex={onClick || href ? 0 : -1}
      role={onClick || href ? 'button' : undefined}
    >
      {/* Glare overlay */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300 z-10"
        style={{
          background: `radial-gradient(ellipse at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, 0.25) 0%, transparent 60%)`,
          opacity: glare.opacity
        }}
      />

      {/* Glow ring */}
      {glow && isHovering && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl z-0 animate-pulse-glow"
          style={{ 
            boxShadow: `0 0 40px 10px ${glowColors[glowColor]}`,
            zIndex: -1 
          }}
        />
      )}

      {/* Border highlight */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl border border-white/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative rounded-2xl preserve-3d bg-white overflow-hidden" style={{ transformStyle: 'preserve-3d' }}>
        {children}
      </div>

      {/* Pressed state */}
      {isPressed && (
        <div className="absolute inset-0 bg-black/5 rounded-2xl pointer-events-none z-20" />
      )}
    </Component>
  );
};

export default InteractiveCard;