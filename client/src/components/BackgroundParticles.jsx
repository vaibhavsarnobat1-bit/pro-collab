import React, { useMemo } from 'react';

const BackgroundParticles = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      size: Math.random() * 4 + 2,
      left: Math.random() * 100,
      top: Math.random() * 100,
      opacity: Math.random() * 0.5 + 0.2,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 5,
      color: i % 3 === 0 ? '#818cf8' : i % 3 === 1 ? '#c084fc' : '#2dd4bf'
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-indigo-600/15 rounded-full blur-[160px] animate-pulse"></div>
      <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[150px]"></div>
      <div className="absolute -bottom-20 -left-20 w-[600px] h-[600px] bg-teal-600/12 rounded-full blur-[150px]"></div>

      {/* Grid lines overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.4) 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}
      ></div>

      {/* Floating particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-float-slow"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            left: `${p.left}%`,
            top: `${p.top}%`,
            backgroundColor: p.color,
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`
          }}
        />
      ))}
    </div>
  );
};

export default BackgroundParticles;
