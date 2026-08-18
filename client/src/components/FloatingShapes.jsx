import React, { useEffect, useRef, useState } from 'react';

const FloatingShapes = ({ 
  count = 8, 
  colors = ['#6366f1', '#8b5cf6', '#14b8a6', '#f59e0b', '#ec4899'],
  className = ''
}) => {
  const shapesRef = useRef([]);

  useEffect(() => {
    shapesRef.current = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 120 + 60,
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: Math.random() * 15 + 15,
      delay: Math.random() * 5,
      shape: Math.floor(Math.random() * 4), // 0=circle, 1=square, 2=triangle, 3=blob
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 30,
      opacity: Math.random() * 0.08 + 0.04
    }));
  }, [count, colors]);

  return (
    <div className={`fixed inset-0 pointer-events-none z-0 overflow-hidden ${className}`} aria-hidden="true">
      {shapesRef.current.map((shape) => (
        <div
          key={shape.id}
          className="absolute"
          style={{
            left: `${shape.x}%`,
            top: `${shape.y}%`,
            width: `${shape.size}px`,
            height: `${shape.size}px`,
            background: shape.color,
            opacity: shape.opacity,
            animationDuration: `${shape.duration}s`,
            animationDelay: `${shape.delay}s`,
            transformOrigin: 'center center',
            borderRadius: shape.shape === 0 ? '50%' : shape.shape === 1 ? '20%' : shape.shape === 2 ? '0' : '30% 70% 70% 30% / 30% 30% 70% 70%',
            clipPath: shape.shape === 2 ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'none'
          }}
        >
          <div 
            className="absolute inset-0"
            style={{
              animation: `rotate ${20 + shape.rotationSpeed}s linear infinite`,
              transformOrigin: 'center center'
            }}
          />
        </div>
      ))}
      <style jsx global>{`
        @keyframes floatShape {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(2%, -3%) scale(1.05); }
          50% { transform: translate(-2%, 2%) scale(0.95); }
          75% { transform: translate(1%, 3%) scale(1.02); }
        }
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default FloatingShapes;