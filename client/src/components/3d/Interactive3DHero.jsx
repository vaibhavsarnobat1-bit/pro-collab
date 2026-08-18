import React, { useState, useEffect } from 'react';
import { Code2, Video, MessageSquare, ShieldAlert, Cpu, Sparkles, Zap, Layers, Globe } from 'lucide-react';

const TECH_NODES = [
  { icon: Code2, label: 'Monaco Editor', color: 'from-indigo-500 to-purple-600', pos: 'top-2 left-6' },
  { icon: Video, label: 'WebRTC HD Call', color: 'from-purple-500 to-pink-600', pos: 'top-10 right-4' },
  { icon: MessageSquare, label: 'Socket Chat', color: 'from-teal-500 to-cyan-600', pos: 'bottom-8 left-8' },
  { icon: ShieldAlert, label: 'Admin Telemetry', color: 'from-amber-500 to-orange-600', pos: 'bottom-4 right-6' }
];

const Interactive3DHero = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = ((clientX - innerWidth / 2) / innerWidth) * 30;
    const y = ((clientY - innerHeight / 2) / innerHeight) * -30;
    setMousePos({ x, y });
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="w-full max-w-lg h-[400px] relative mx-auto flex items-center justify-center perspective-2000 select-none py-6">
      
      {/* 3D Orbiting Core Stage */}
      <div
        className="relative w-80 h-80 preserve-3d transition-transform duration-300 ease-out flex items-center justify-center"
        style={{
          transform: `rotateX(${mousePos.y}deg) rotateY(${mousePos.x}deg)`
        }}
      >
        {/* Outer 3D Gyroscope Ring 1 */}
        <div 
          className="absolute inset-0 rounded-full border-2 border-indigo-500/30 preserve-3d shadow-2xl shadow-indigo-500/20"
          style={{ transform: 'rotateX(65deg) rotateY(20deg)' }}
        ></div>

        {/* Outer 3D Gyroscope Ring 2 */}
        <div 
          className="absolute inset-4 rounded-full border-2 border-purple-500/30 preserve-3d shadow-2xl shadow-purple-500/20"
          style={{ transform: 'rotateX(-65deg) rotateY(-40deg)' }}
        ></div>

        {/* Outer 3D Gyroscope Ring 3 */}
        <div 
          className="absolute inset-8 rounded-full border-2 border-teal-500/30 preserve-3d shadow-2xl shadow-teal-500/20"
          style={{ transform: 'rotateX(0deg) rotateY(65deg)' }}
        ></div>

        {/* Glowing Central 3D Core Sphere */}
        <div className="w-36 h-36 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-teal-400 p-1 shadow-2xl glow-3d flex items-center justify-center preserve-3d translate-z-40">
          <div className="w-full h-full bg-slate-950 rounded-full flex flex-col items-center justify-center text-center p-4 border border-white/20 backdrop-blur-xl">
            <Globe className="w-10 h-10 text-indigo-400 animate-spin-slow" />
            <span className="text-[11px] font-mono font-extrabold text-white mt-1 uppercase tracking-widest gradient-text">
              PRO-COLLAB
            </span>
            <span className="text-[9px] text-teal-400 font-bold">REAL-TIME CORE</span>
          </div>
        </div>

        {/* Orbiting 3D Nodes */}
        {TECH_NODES.map((node, idx) => {
          const Icon = node.icon;
          return (
            <div
              key={idx}
              className={`absolute ${node.pos} p-3 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-2xl backdrop-blur-xl preserve-3d translate-z-50 hover:scale-110 transition-transform cursor-pointer group`}
            >
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl bg-gradient-to-r ${node.color} text-white shadow-md`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-extrabold text-white group-hover:text-teal-300 transition-colors">{node.label}</span>
                  <span className="text-[9px] text-slate-400 font-mono">Sync Active</span>
                </div>
              </div>
            </div>
          );
        })}

      </div>

    </div>
  );
};

export default Interactive3DHero;
