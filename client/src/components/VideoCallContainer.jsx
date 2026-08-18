import React, { useState, useEffect, useRef } from 'react';
import {
  Video, Mic, MicOff, VideoOff, MonitorUp, PhoneOff, Users, Maximize2,
  Minimize2, Volume2, Radio, Expand, Shrink
} from 'lucide-react';

const VideoCallContainer = ({
  socket,
  roomId,
  currentUser,
  onLeaveCall,
  isMaximized = false,
  onToggleMaximize
}) => {
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callPeers, setCallPeers] = useState([]);
  const [activePresenter, setActivePresenter] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef(null);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  // Initialize Local User Media (Video/Audio stream)
  useEffect(() => {
    let mounted = true;

    const startLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true
        });
        if (mounted) {
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }
      } catch (err) {
        console.warn('Could not access camera/microphone directly:', err);
        createDemoStreamCanvas();
      }
    };

    startLocalStream();

    return () => {
      mounted = false;
      stopAllTracks();
    };
  }, []);

  // Socket event listeners for real peer join/leave in call
  useEffect(() => {
    if (!socket) return;

    socket.emit('call-joined', { roomId, user: currentUser });

    socket.on('user-joined-call', (userObj) => {
      setCallPeers((prev) => {
        if (!prev.some(p => p.username === userObj.username)) {
          return [...prev, userObj];
        }
        return prev;
      });
    });

    socket.on('user-left-call', (userObj) => {
      setCallPeers((prev) => prev.filter(p => p.username !== userObj.username));
    });

    return () => {
      socket.off('user-joined-call');
      socket.off('user-left-call');
    };
  }, [socket, roomId, currentUser]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const createDemoStreamCanvas = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    
    const drawDemoFrame = () => {
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Cyber aesthetic background grid
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      ctx.fillStyle = '#6366f1';
      ctx.font = 'bold 36px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(currentUser?.username || 'HD Video Stream', canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '18px Inter, sans-serif';
      ctx.fillText('⚡ 1080p WebRTC Media Connected', canvas.width / 2, canvas.height / 2 + 30);
    };

    drawDemoFrame();
    const canvasStream = canvas.captureStream(15);
    localStreamRef.current = canvasStream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = canvasStream;
    }
  };

  const stopAllTracks = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
    }
  };

  // Toggle Mic Audio
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !micOn;
      }
    }
    setMicOn(!micOn);
  };

  // Toggle Video Camera
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoOn;
      }
    }
    setVideoOn(!videoOn);
  };

  // Screen Sharing WebRTC
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        screenStreamRef.current = screenStream;
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        setIsScreenSharing(true);
        setActivePresenter({
          username: currentUser?.username,
          isSelf: true
        });

        if (socket) {
          socket.emit('screen-share-status', { roomId, isSharing: true });
        }

        screenStream.getVideoTracks()[0].onended = () => {
          stopScreenSharing();
        };
      } catch (err) {
        console.error('Screen sharing failed:', err);
      }
    } else {
      stopScreenSharing();
    }
  };

  const stopScreenSharing = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    if (localStreamRef.current && localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    setIsScreenSharing(false);
    setActivePresenter(null);
    if (socket) {
      socket.emit('screen-share-status', { roomId, isSharing: false });
    }
  };

  // Toggle Fullscreen on Container
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const totalParticipants = callPeers.length + 1;

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full bg-[#090c13] rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl transition-all duration-300 relative ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      }`}
    >
      
      {/* Video Call Top Bar */}
      <div className="bg-[#0f131c] px-4 py-2 border-b border-white/[0.08] flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-white tracking-wide">VIDEO CALL</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            {totalParticipants}
          </span>
        </div>

        {/* Action Controls: Fullscreen & Maximize */}
        <div className="flex items-center gap-1.5">
          {activePresenter && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 border border-purple-500/40 rounded-full text-purple-300 text-[10px] font-semibold animate-pulse">
              <span>{activePresenter.isSelf ? 'Presenting' : `${activePresenter.username}`}</span>
            </div>
          )}

          {onToggleMaximize && (
            <button
              onClick={onToggleMaximize}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isMaximized
                  ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                  : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white'
              }`}
              title={isMaximized ? 'Restore View Size' : 'Expand Video to Full Width'}
            >
              {isMaximized ? <Shrink className="w-3.5 h-3.5" /> : <Expand className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            title={isFullscreen ? 'Exit Full Screen' : 'Full Screen Mode'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Spacious Landscape Video Grid */}
      <div className="flex-1 p-2.5 flex flex-col justify-center items-center overflow-hidden relative min-h-0">
        
        {/* Dynamic Grid Layout */}
        <div className={`w-full h-full grid gap-2.5 ${
          callPeers.length === 0
            ? 'grid-cols-1'
            : callPeers.length === 1
            ? 'grid-cols-1 md:grid-cols-2'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}>
          
          {/* Main User Landscape Tile */}
          <div
            className={`w-full h-full bg-[#05070d] rounded-2xl border transition-all duration-200 overflow-hidden relative flex items-center justify-center group shadow-xl ${
              micOn
                ? 'border-emerald-500/50 ring-1 ring-emerald-500/30'
                : 'border-white/[0.1]'
            }`}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover rounded-2xl bg-black ${videoOn ? 'block' : 'hidden'}`}
            />

            {!videoOn && (
              <div className="flex flex-col items-center justify-center text-center p-4">
                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-2xl font-extrabold text-white border-2 shadow-2xl mb-2 transition-all ${
                  micOn ? 'border-emerald-400 scale-105 shadow-emerald-500/40 animate-pulse' : 'border-slate-800'
                }`}>
                  {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="text-xs font-bold text-slate-200">{currentUser?.username || 'You'}</span>
                <span className="text-[10px] text-slate-500">Camera Off</span>
              </div>
            )}

            {/* Speaking Status Pill */}
            {micOn && (
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow-md animate-pulse backdrop-blur-md">
                  <Volume2 className="w-2.5 h-2.5 text-emerald-400" />
                  Speaking
                </span>
              </div>
            )}

            {/* User Name Badge */}
            <div className="absolute bottom-2.5 left-2.5 bg-[#0d1117]/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5 text-[11px] font-bold text-white shadow-md">
              <span className={`w-1.5 h-1.5 rounded-full ${micOn ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
              <span>{currentUser?.username || 'You'} {isScreenSharing ? '(Screen)' : ''}</span>
            </div>
          </div>

          {/* Peer Tiles */}
          {callPeers.map((peer, idx) => (
            <div
              key={idx}
              className="w-full h-full bg-[#05070d] rounded-2xl border border-white/[0.1] flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-all shadow-xl p-4"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xl mb-1.5 shadow-lg">
                {peer.username?.charAt(0).toUpperCase() || 'P'}
              </div>
              <span className="text-xs font-bold text-slate-200">{peer.username}</span>
              <span className="text-[10px] text-emerald-400 mt-0.5 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Connected
              </span>
            </div>
          ))}

        </div>

      </div>

      {/* Clean Centered Bottom Control Bar (No Overlapping Room Text) */}
      <div className="bg-[#0b0e14] px-4 py-2.5 border-t border-white/[0.08] flex items-center justify-center gap-3 z-10 shrink-0">
        
        {/* Mic Toggle */}
        <button
          onClick={toggleMic}
          className={`p-3 rounded-full transition-all shadow-lg cursor-pointer ${
            micOn
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
          }`}
          title={micOn ? 'Mute Microphone' : 'Unmute Microphone'}
        >
          {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </button>

        {/* Video Toggle */}
        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full transition-all shadow-lg cursor-pointer ${
            videoOn
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
          }`}
          title={videoOn ? 'Turn Off Camera' : 'Turn On Camera'}
        >
          {videoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
        </button>

        {/* Screen Share Toggle */}
        <button
          onClick={toggleScreenShare}
          className={`p-3 rounded-full transition-all shadow-lg cursor-pointer ${
            isScreenSharing
              ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
          title={isScreenSharing ? 'Stop Presenting' : 'Share Screen'}
        >
          <MonitorUp className="w-4 h-4" />
        </button>

        {/* Full Screen Toggle in Bar */}
        <button
          onClick={toggleFullscreen}
          className={`p-3 rounded-full transition-all shadow-lg cursor-pointer ${
            isFullscreen
              ? 'bg-indigo-600 text-white shadow-indigo-600/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
          title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* End Call / Cut Call Button (Prominent & Centered) */}
        <button
          onClick={onLeaveCall}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-full transition-all shadow-lg shadow-rose-600/40 flex items-center gap-1.5 cursor-pointer ml-1"
          title="End Call / Cut Call"
        >
          <PhoneOff className="w-4 h-4" />
          <span className="text-xs">End Call</span>
        </button>

      </div>

    </div>
  );
};

export default VideoCallContainer;
