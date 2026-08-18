import React, { useEffect, useRef } from 'react';

const FloatingOrbs = ({ count = 5, colors = ['#6366f1', '#8b5cf6', '#14b8a6', '#f59e0b', '#ec4899'] }) => {
  const orbsRef = useRef([]);

  useEffect(() => {
    orbsRef.current = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 200 + 150,
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 5
    }));
  }, [count, colors]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {orbsRef.current.map((orb) => (
        <div
          key={orb.id}
          className="absolute rounded-full blur-[150px] animate-blob"
          style={{
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            width: `${orb.size}px`,
            height: `${orb.size}px`,
            background: orb.color,
            opacity: 0.08,
            animationDuration: `${orb.duration}s`,
            animationDelay: `${orb.delay}s`,
            transformOrigin: 'center center'
          }}
        />
      ))}
      <style jsx global>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
          25% { transform: translate(3%, -5%) scale(1.1) rotate(90deg); }
          50% { transform: translate(-5%, 3%) scale(0.9) rotate(180deg); }
          75% { transform: translate(2%, 4%) scale(1.05) rotate(270deg); }
        }
        .animate-blob { animation: blob ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default FloatingOrbs;