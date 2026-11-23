import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, MonitorUp, PhoneOff, PhoneCall,
  Maximize2, Minimize2, Users, Volume2, AlertTriangle
} from 'lucide-react';
import { useWebRTC } from '../lib/useWebRTC';
import '../styles/videocall.css';

/* Assigns a live MediaStream to a <video>. React cannot set srcObject as an
 * attribute, so the stream is attached through the ref and the element is asked
 * to replay whenever a track is added or removed (the mesh reuses one stream
 * object and calls addTrack as media arrives). */
function StreamVideo({ stream, muted = false, mirrored = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!stream) { el.srcObject = null; return undefined; }
    const attach = () => {
      if (el.srcObject !== stream) el.srcObject = stream;
      const play = el.play();
      if (play && play.catch) play.catch(() => {});
    };
    attach();
    stream.addEventListener('addtrack', attach);
    stream.addEventListener('removetrack', attach);
    return () => {
      stream.removeEventListener('addtrack', attach);
      stream.removeEventListener('removetrack', attach);
    };
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted={muted} className={`vc-video${mirrored ? ' vc-mirror' : ''}`} />;
}

/* Real active-speaker detection: an AnalyserNode per remote audio track. When
 * the browser has no Web Audio API the hook reports canMeasure=false so the UI
 * omits the indicator instead of inventing it from the mic toggle. */
function useActiveSpeaker(peers) {
  const [activeIds, setActiveIds] = useState([]);
  const [canMeasure, setCanMeasure] = useState(false);
  const ctxRef = useRef(null);
  const nodesRef = useRef(new Map());
  const signature = useMemo(
    () => peers.map((p) => `${p.socketId}:${p.stream ? p.stream.getAudioTracks().map((t) => t.id).join('.') : ''}`).join('|'),
    [peers]
  );

  useEffect(() => {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) { setCanMeasure(false); return undefined; }
    if (!ctxRef.current) {
      try { ctxRef.current = new AudioCtor(); } catch { setCanMeasure(false); return undefined; }
    }
    const ctx = ctxRef.current;
    setCanMeasure(true);
    const nodes = nodesRef.current;
    const live = new Set();
    for (const peer of peers) {
      const track = peer.stream && peer.stream.getAudioTracks()[0];
      if (!track) continue;
      live.add(peer.socketId);
      const key = `${peer.socketId}:${track.id}`;
      const existing = nodes.get(peer.socketId);
      if (existing && existing.key === key) continue;
      if (existing) { try { existing.source.disconnect(); } catch { /* noop */ } }
      const source = ctx.createMediaStreamSource(new MediaStream([track]));
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      nodes.set(peer.socketId, { key, source, analyser, buf: new Uint8Array(analyser.fftSize) });
    }
    for (const [id, entry] of nodes) {
      if (!live.has(id)) { try { entry.source.disconnect(); } catch { /* noop */ } nodes.delete(id); }
    }
  }, [signature, peers]);

  useEffect(() => {
    if (!canMeasure) return undefined;
    let frame;
    const sample = () => {
      if (ctxRef.current && ctxRef.current.state === 'suspended') ctxRef.current.resume().catch(() => {});
      const talking = [];
      nodesRef.current.forEach((entry, id) => {
        entry.analyser.getByteTimeDomainData(entry.buf);
        let sum = 0;
        for (let i = 0; i < entry.buf.length; i += 1) { const v = (entry.buf[i] - 128) / 128; sum += v * v; }
        if (Math.sqrt(sum / entry.buf.length) > 0.06) talking.push(id);
      });
      setActiveIds((prev) => (
        prev.length === talking.length && prev.every((x, i) => x === talking[i]) ? prev : talking
      ));
      frame = requestAnimationFrame(sample);
    };
    frame = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(frame);
  }, [canMeasure]);

  useEffect(() => () => {
    nodesRef.current.forEach((entry) => { try { entry.source.disconnect(); } catch { /* noop */ } });
    nodesRef.current.clear();
    if (ctxRef.current) { try { ctxRef.current.close(); } catch { /* noop */ } ctxRef.current = null; }
  }, []);

  return { activeIds, canMeasure };
}

function peerStatus(peer) {
  const { connectionState, iceState } = peer;
  if (connectionState === 'failed' || iceState === 'failed') return { label: 'Failed', tone: 'bad' };
  if (connectionState === 'disconnected' || connectionState === 'closed' || iceState === 'disconnected') return { label: 'Disconnected', tone: 'bad' };
  if (connectionState === 'connected' || iceState === 'connected' || iceState === 'completed') return { label: 'Connected', tone: 'ok' };
  return { label: 'Connecting', tone: 'wait' };
}

const isConnected = (peer) => (
  peer.connectionState === 'connected' || peer.iceState === 'connected' || peer.iceState === 'completed'
);
const initial = (name) => (name || '?').trim().charAt(0).toUpperCase() || '?';

function TileOverlay({ name, isSelf, isSharing, micOn, cameraOn, status, speaking, showSpeaker }) {
  return (
    <>
      {status && (
        <div className={`vc-status vc-status--${status.tone}`}>
          <i />{status.label}
        </div>
      )}
      {showSpeaker && speaking && (
        <div className="vc-speaker"><Volume2 />Speaking</div>
      )}
      {!cameraOn && (
        <div className="vc-off">
          <div className="vc-avatar">{initial(name)}</div>
          <div className="vc-off-label">{isSelf ? 'Your camera is off' : `${name}'s camera is off`}</div>
        </div>
      )}
      <div className="vc-namebar">
        <span className="trunc">{name}{isSelf ? ' (you)' : ''}</span>
        {!micOn && <MicOff size={12} />}
        {isSharing && <span className="vc-tag vc-tag--screen">Screen</span>}
      </div>
    </>
  );
}

function RemoteTile({ peer, speaking, showSpeaker }) {
  const status = peerStatus(peer);
  return (
    <div className={`vc-tile${speaking ? ' vc-speaking' : ''}`}>
      <StreamVideo stream={peer.stream} />
      <TileOverlay name={peer.username} isSelf={false} isSharing={false} micOn={peer.micOn}
        cameraOn={peer.cameraOn} status={status} speaking={speaking} showSpeaker={showSpeaker} />
    </div>
  );
}

function LocalTile({ stream, username, micOn, cameraOn, isSharing }) {
  return (
    <div className="vc-tile vc-self">
      <StreamVideo stream={stream} muted mirrored />
      <TileOverlay name={username || 'You'} isSelf isSharing={isSharing} micOn={micOn}
        cameraOn={cameraOn} status={null} speaking={false} showSpeaker={false} />
    </div>
  );
}

const VideoCallContainer = ({
  socket, roomId, username, activeUsers = [], theme = 'dark',
  isMaximized = false, onToggleMaximize, onClose, floating = false
}) => {
  const {
    peers, localStream, screenStream, mediaError, micOn, cameraOn, isSharing, isRequestingShare, clearError,
    start, stop, toggleMic, toggleCamera, toggleScreenShare
  } = useWebRTC({ socket, roomId });

  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const hasJoined = !!localStream;
  const { activeIds, canMeasure } = useActiveSpeaker(peers);
  const speakingSet = useMemo(() => new Set(activeIds), [activeIds]);

  const canShareScreen = typeof navigator !== 'undefined'
    && !!navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function';

  const connectedCount = useMemo(() => peers.filter(isConnected).length, [peers]);
  const failedCount = useMemo(
    () => peers.filter((p) => p.connectionState === 'failed' || p.iceState === 'failed').length, [peers]
  );
  const everyoneConnected = peers.length > 0 && connectedCount === peers.length;
  const activeCount = Math.max(activeUsers.length, peers.length + 1);

  const spotlight = useMemo(() => {
    if (isSharing && screenStream) return { key: 'local-screen', name: username || 'You', stream: screenStream, self: true };
    const peerScreen = peers.find((p) => p.screen);
    if (peerScreen) return { key: `screen-${peerScreen.socketId}`, name: peerScreen.username, stream: peerScreen.screen, self: false };
    return null;
  }, [isSharing, screenStream, peers, username]);

  const handleJoin = useCallback(async () => {
    setJoinError(null);
    setIsJoining(true);
    try {
      await start({ audio: true, video: true });
    } catch (error) {
      setJoinError(error.message || 'Could not start the call.');
    } finally {
      setIsJoining(false);
    }
  }, [start]);

  const handleLeave = useCallback(() => {
    stop();
    if (typeof onClose === 'function') onClose();
  }, [stop, onClose]);

  // Release the camera/microphone on unmount and when the room changes. The
  // hook owns the socket listeners and peer teardown; it does not stop local
  // media tracks, so that cleanup is done here via the latest stop().
  const stopRef = useRef(stop);
  stopRef.current = stop;
  useEffect(() => () => { stopRef.current(); }, [roomId]);

  const tileCount = peers.length + 1;
  const gridCols = tileCount <= 1 ? 1 : tileCount === 2 ? 2 : tileCount <= 4 ? 2 : tileCount <= 6 ? 3 : 4;

  const rootClass = [
    'vc-root', `vc-theme-${theme}`,
    isMaximized ? 'vc-max' : '',
    floating && !isMaximized ? 'vc-floating' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={rootClass}>
      <div className="vc-header">
        <div className="vc-header-left">
          <span className={`vc-live-dot${hasJoined && everyoneConnected ? '' : ' vc-live-dot--idle'}`} />
          <span className="vc-title">Video call</span>
          <span className="vc-count"><Users />{activeCount}</span>
          {hasJoined && peers.length > 0 && (
            <span className="vc-net">
              {connectedCount}/{peers.length} connected
              {failedCount > 0 ? ` · ${failedCount} failed` : ''}
            </span>
          )}
        </div>
        <div className="vc-header-actions">
          {onToggleMaximize && (
            <button
              type="button"
              className="vc-iconbtn"
              onClick={onToggleMaximize}
              aria-label={isMaximized ? 'Restore size' : 'Expand video'}
              title={isMaximized ? 'Restore size' : 'Expand video'}
            >
              {isMaximized ? <Minimize2 /> : <Maximize2 />}
            </button>
          )}
          {onClose && (
            <button type="button" className="vc-iconbtn" onClick={handleLeave} aria-label="Leave call" title="Leave call">
              <PhoneOff />
            </button>
          )}
        </div>
      </div>

      <div className="vc-body">
        {!hasJoined ? (
          <div className="vc-join">
            <div className="vc-join-card">
              <div className="vc-join-head">
                <PhoneCall />
                <span className="vc-title" style={{ fontSize: 16 }}><strong>Join the call</strong></span>
              </div>
              <p className="vc-join-desc">
                This connects your camera and microphone to the other people in this room over a
                direct peer-to-peer (WebRTC) connection. Nothing is sent until you join.
              </p>
              <div className="vc-join-list">
                <div><VideoIcon />Your browser will ask for camera and microphone access.</div>
                <div><Users />Everyone already in the room appears once you connect.</div>
                <div><MonitorUp />You can share your screen after joining.</div>
              </div>
              {joinError && (
                <div className="vc-join-error">
                  <AlertTriangle />
                  <span>{joinError}</span>
                </div>
              )}
              <button type="button" className="vc-join-btn" onClick={handleJoin} disabled={isJoining || !socket || !roomId}>
                <VideoIcon />{isJoining ? 'Connecting...' : 'Join call'}
              </button>
              {(!socket || !roomId) && (
                <p className="vc-join-desc" style={{ color: 'var(--ink-faint)' }}>
                  Waiting for the connection to the room to be ready.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="vc-stage">
            {spotlight ? (
              <>
                <div className="vc-spotlight">
                  <StreamVideo stream={spotlight.stream} />
                  <div className="vc-namebar">
                    <span className="vc-tag vc-tag--screen">Screen</span>
                    <span className="trunc">
                      {spotlight.self ? 'You are sharing your screen' : `${spotlight.name} is sharing their screen`}
                    </span>
                  </div>
                </div>
                <div className="vc-strip">
                  <LocalTile stream={localStream} username={username} micOn={micOn} cameraOn={cameraOn} isSharing={isSharing} />
                  {peers.map((peer) => (
                    <RemoteTile
                      key={peer.socketId}
                      peer={peer}
                      speaking={canMeasure && speakingSet.has(peer.socketId)}
                      showSpeaker={canMeasure}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="vc-tiles" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
                {peers.length === 0 ? (
                  <>
                    <LocalTile stream={localStream} username={username} micOn={micOn} cameraOn={cameraOn} isSharing={isSharing} />
                    <div className="vc-waiting" style={{ gridColumn: `span ${gridCols - 1}` }}>
                      <Users />
                      <div className="vc-waiting-title">Waiting for others to join</div>
                      <div className="vc-waiting-sub">
                        You are the only one on the call. When teammates enter this room their video
                        will appear here automatically.
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {peers.map((peer) => (
                      <RemoteTile
                        key={peer.socketId}
                        peer={peer}
                        speaking={canMeasure && speakingSet.has(peer.socketId)}
                        showSpeaker={canMeasure}
                      />
                    ))}
                    <LocalTile stream={localStream} username={username} micOn={micOn} cameraOn={cameraOn} isSharing={isSharing} />
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {mediaError && (
        <div className="vc-banner">
          <AlertTriangle />
          <span>{mediaError}</span>
          <button type="button" className="vc-banner-x" onClick={clearError} aria-label="Dismiss message">
            <X />
          </button>
        </div>
      )}

      {hasJoined && (
        <div className="vc-controls">
          <button
            type="button"
            className={`vc-btn${micOn ? '' : ' vc-btn--off'}`}
            onClick={toggleMic}
            aria-pressed={!micOn}
            title={micOn ? 'Mute microphone' : 'Unmute microphone'}
          >
            {micOn ? <Mic /> : <MicOff />}
            <span>{micOn ? 'Mute' : 'Unmute'}</span>
          </button>

          <button
            type="button"
            className={`vc-btn${cameraOn ? '' : ' vc-btn--off'}`}
            onClick={toggleCamera}
            aria-pressed={!cameraOn}
            title={cameraOn ? 'Turn camera off' : 'Turn camera on'}
          >
            {cameraOn ? <VideoIcon /> : <VideoOff />}
            <span>{cameraOn ? 'Stop video' : 'Start video'}</span>
          </button>

          <button
            type="button"
            className={`vc-btn${isSharing ? ' vc-btn--on-brand' : ''}`}
            onClick={toggleScreenShare}
            disabled={!canShareScreen || isRequestingShare}
            aria-pressed={isSharing}
            title={canShareScreen ? (isSharing ? 'Stop sharing screen' : 'Share your screen') : 'Screen sharing is not supported in this browser'}
          >
            <MonitorUp />
            <span>{isSharing ? 'Stop share' : isRequestingShare ? 'Choose a window…' : 'Share screen'}</span>
          </button>

          <button type="button" className="vc-btn vc-leave" onClick={handleLeave} title="Leave call">
            <PhoneOff />
            <span>Leave call</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoCallContainer;
