import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, KeyRound, Cpu, Wifi, CheckCircle2, Zap, Radio } from 'lucide-react';

const InteractiveAuth3D = ({ isSubmitting, error, username }) => {
  const [rotation, setRotation] = useState({ x: 10, y: -15 });

  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const rotX = ((clientY - innerHeight / 2) / innerHeight) * -25;
    const rotY = ((clientX - innerWidth / 2) / innerWidth) * 25;
    setRotation({ x: rotX, y: rotY });
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="w-full max-w-sm h-[380px] flex flex-col items-center justify-center relative perspective-2000 select-none">
      
      {/* 3D Hologram Stage */}
      <div
        className="relative w-64 h-64 preserve-3d transition-transform duration-300 ease-out flex items-center justify-center"
        style={{
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`
        }}
      >
        {/* Outer 3D Cyber Ring */}
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-indigo-500/40 animate-spin-slow preserve-3d shadow-lg shadow-indigo-500/20"></div>

        {/* Middle Counter-rotating Glowing Ring */}
        <div 
          className="absolute inset-4 rounded-full border-2 border-purple-500/50 preserve-3d shadow-xl shadow-purple-500/30"
          style={{
            animation: 'spinSlow 12s linear infinite reverse'
          }}
        ></div>

        {/* Inner Teal Pulse Ring */}
        <div className="absolute inset-10 rounded-full border border-teal-400/60 animate-ping opacity-30"></div>

        {/* 3D Core Shield Center */}
        <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-teal-400 p-0.5 shadow-2xl glow-3d flex items-center justify-center preserve-3d translate-z-30">
          <div className="w-full h-full bg-slate-950 rounded-[22px] flex flex-col items-center justify-center p-3 text-center border border-white/20 backdrop-blur-xl">
            {isSubmitting ? (
              <div className="w-10 h-10 border-4 border-teal-400/30 border-t-teal-400 rounded-full animate-spin"></div>
            ) : error ? (
              <Lock className="w-10 h-10 text-rose-400 animate-bounce" />
            ) : (
              <ShieldCheck className="w-10 h-10 text-teal-400 animate-pulse" />
            )}
            
            <span className="text-[10px] font-mono font-extrabold text-indigo-300 mt-1 uppercase tracking-wider">
              {isSubmitting ? 'Authenticating' : error ? 'Access Locked' : 'Guard Active'}
            </span>
          </div>
        </div>

        {/* Orbiting 3D Floating Tech Badges */}
        {/* Badge 1: Top Left */}
        <div className="absolute -top-4 -left-4 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold shadow-xl translate-z-40 flex items-center gap-1.5 backdrop-blur-md animate-float-slow">
          <Wifi className="w-3 h-3 text-teal-400" />
          <span>WebSocket Sync</span>
        </div>

        {/* Badge 2: Top Right */}
        <div className="absolute -top-4 -right-4 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-purple-500/40 text-purple-300 text-[10px] font-bold shadow-xl translate-z-40 flex items-center gap-1.5 backdrop-blur-md animate-float-slow delay-300">
          <Cpu className="w-3 h-3 text-purple-400" />
          <span>AES Security</span>
        </div>

        {/* Badge 3: Bottom Left */}
        <div className="absolute -bottom-4 -left-4 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-teal-500/40 text-teal-300 text-[10px] font-bold shadow-xl translate-z-40 flex items-center gap-1.5 backdrop-blur-md animate-float-slow delay-500">
          <Zap className="w-3 h-3 text-amber-400" />
          <span>P2P Stream</span>
        </div>

        {/* Badge 4: Bottom Right */}
        <div className="absolute -bottom-4 -right-4 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-amber-500/40 text-amber-300 text-[10px] font-bold shadow-xl translate-z-40 flex items-center gap-1.5 backdrop-blur-md animate-float-slow delay-700">
          <CheckCircle2 className="w-3 h-3 text-teal-400" />
          <span>Session OK</span>
        </div>

      </div>

      {/* Dynamic Status Text */}
      <div className="mt-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-300 shadow-md">
          <Radio className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
          <span>User Status: <span className="text-teal-400 font-bold">{username || 'Guest Visitor'}</span></span>
        </div>
      </div>

    </div>
  );
};

export default InteractiveAuth3D;
