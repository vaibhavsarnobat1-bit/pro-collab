import { useCallback, useEffect, useRef, useState } from 'react';

/*
 * Peer-to-peer mesh for one room.
 *
 * Every participant holds an RTCPeerConnection to every other participant.
 * Negotiation follows the "perfect negotiation" pattern: a polite peer rolls
 * back when it receives an offer while its own is in flight, so two people
 * joining at the same moment do not deadlock. Politeness is decided by socket
 * id order, which every peer can compute the same way.
 *
 * ICE servers come from VITE_TURN_URL so a deployment that needs a relay can
 * add one without touching this file. Without TURN, peers behind symmetric NAT
 * will not connect — the UI reports that rather than pretending the call works.
 */
const RTC_CONFIG = {
  iceServers: (() => {
    const servers = [{ urls: ['stun:stun.l.google.com:19302', 'stun:global.stun.twilio.com:3478'] }];
    const turnUrl = import.meta.env.VITE_TURN_URL;
    if (turnUrl) {
      servers.push({
        urls: turnUrl,
        username: import.meta.env.VITE_TURN_USERNAME,
        credential: import.meta.env.VITE_TURN_CREDENTIAL
      });
    }
    return servers;
  })()
};

export function useWebRTC({ socket, roomId }) {
  const [peers, setPeers] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [mediaError, setMediaError] = useState(null);
  const [isRequestingShare, setIsRequestingShare] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [iceCandidateTypes, setIceCandidateTypes] = useState([]);

  const peersRef = useRef(new Map());
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const pendingIce = useRef(new Map());
  const makingOffer = useRef(new Map());
  const ignoreOffer = useRef(new Map());

  localStreamRef.current = localStream;
  screenStreamRef.current = screenStream;

  const myId = socket?.id;
  const polite = useCallback((otherId) => String(otherId) < String(myId), [myId]);

  const publishPeers = useCallback(() => {
    const rows = [];
    peersRef.current.forEach((peer, socketId) => {
      rows.push({
        socketId,
        username: peer.username,
        stream: peer.stream,
        screen: peer.screen,
        micOn: peer.micOn,
        cameraOn: peer.cameraOn,
        connectionState: peer.pc?.connectionState || 'new',
        iceState: peer.pc?.iceConnectionState || 'new'
      });
    });
    setPeers(rows);
  }, []);

  /* ------------------------------------------------------ peer plumbing */

  const ensurePeer = useCallback((socketId, username) => {
    if (peersRef.current.has(socketId)) {
      const existing = peersRef.current.get(socketId);
      if (username) existing.username = username;
      return existing;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    const stream = new MediaStream();

    const peer = {
      pc,
      stream,
      username: username || 'Peer',
      screen: null,
      micOn: true,
      cameraOn: true,
      remoteVideoTracks: [],
      remoteAudioTracks: []
    };
    peersRef.current.set(socketId, peer);
    pendingIce.current.set(socketId, []);
    makingOffer.current.set(socketId, false);
    ignoreOffer.current.set(socketId, false);

    pc.ontrack = (event) => {
      const track = event.track;
      // A single connection can carry both the camera and the screen-share
      // video track, so label them rather than assuming one stream each.
      if (track.kind === 'video' && track.label.toLowerCase().includes('screen')) {
        peer.screen = new MediaStream([track]);
      } else if (track.kind === 'video') {
        peer.remoteVideoTracks = [track];
        stream.addTrack(track);
      } else {
        peer.remoteAudioTracks = [track];
        stream.addTrack(track);
      }
      publishPeers();
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const type = event.candidate.type || event.candidate.candidate?.match(/typ (\w+)/)?.[1];
        if (type) {
          setIceCandidateTypes((prev) => (prev.includes(type) ? prev : [...prev, type]));
        }
        socket?.emit('webrtc-signal', { to: socketId, type: 'ice', payload: event.candidate.toJSON() });
      }
    };

    pc.onnegotiationneeded = async () => {
      try {
        makingOffer.current.set(socketId, true);
        await pc.setLocalDescription();
        socket?.emit('webrtc-signal', { to: socketId, type: 'description', payload: pc.localDescription });
      } catch (error) {
        console.warn('[webrtc] negotiation failed:', error.message);
      } finally {
        makingOffer.current.set(socketId, false);
      }
    };

    const restate = () => publishPeers();
    pc.onconnectionstatechange = restate;
    pc.oniceconnectionstatechange = restate;

    const source = localStreamRef.current;
    if (source) {
      for (const track of source.getTracks()) {
        pc.addTrack(track, source);
      }
    }

    return peer;
  }, [socket, publishPeers]);

  const removePeer = useCallback((socketId) => {
    const peer = peersRef.current.get(socketId);
    if (!peer) return;
    try { peer.pc.onnegotiationneeded = null; peer.pc.close(); } catch { /* already closed */ }
    peersRef.current.delete(socketId);
    pendingIce.current.delete(socketId);
    makingOffer.current.delete(socketId);
    ignoreOffer.current.delete(socketId);
    publishPeers();
  }, [publishPeers]);

  /* --------------------------------------------------------- signalling */

  useEffect(() => {
    if (!socket || !roomId) return;

    const onSignal = async ({ from, type, payload }) => {
      if (!from || from === myId) return;
      const peer = ensurePeer(from);
      const pc = peer.pc;
      const isPolite = polite(from);

      if (type === 'description') {
        const isOffer = payload?.type === 'offer';
        const offerCollision = isOffer && (makingOffer.current.get(from) || pc.signalingState !== 'stable');

        ignoreOffer.current.set(from, !isPolite && offerCollision);
        if (ignoreOffer.current.get(from)) return;

        if (offerCollision) {
          await Promise.all([
            pc.setLocalDescription({ type: 'rollback' }),
            pc.setRemoteDescription(payload)
          ]);
        } else {
          await pc.setRemoteDescription(payload);
        }

        if (isOffer) {
          await pc.setLocalDescription();
          socket.emit('webrtc-signal', { to: from, type: 'description', payload: pc.localDescription });
        }

        const queue = pendingIce.current.get(from) || [];
        pendingIce.current.set(from, []);
        for (const candidate of queue) {
          try { await pc.addIceCandidate(candidate); } catch { /* race, safe to drop */ }
        }
        return;
      }

      if (type === 'ice') {
        try {
          if (!pc.remoteDescription) {
            pendingIce.current.set(from, [...(pendingIce.current.get(from) || []), payload]);
            return;
          }
          await pc.addIceCandidate(payload);
        } catch (error) {
          if (!ignoreOffer.current.get(from)) console.warn('[webrtc] ice rejected:', error.message);
        }
        return;
      }

      // A peer attached new tracks after we connected; renegotiate from our side.
      if (type === 'restart') {
        try { await pc.setLocalDescription({ type: 'offer' }); } catch { /* fall back below */ }
        try {
          makingOffer.current.set(from, true);
          await pc.setLocalDescription();
          socket.emit('webrtc-signal', { to: from, type: 'description', payload: pc.localDescription });
        } catch (error) {
          console.warn('[webrtc] restart failed:', error.message);
        } finally {
          makingOffer.current.set(from, false);
        }
        return;
      }

      if (type === 'bye') {
        removePeer(from);
      }
    };

    const onJoined = ({ socketId, username }) => {
      if (!socketId || socketId === myId) return;
      ensurePeer(socketId, username);
    };

    // The roster the server hands a newcomer so it can open a connection to
    // everyone already in the call, not just the person who joined last.
    const onRoster = (participants = []) => {
      for (const entry of participants) {
        if (entry.socketId && entry.socketId !== myId) ensurePeer(entry.socketId, entry.username);
      }
    };

    const onLeft = ({ socketId }) => {
      if (socketId) removePeer(socketId);
    };

    socket.on('webrtc-signal', onSignal);
    socket.on('user-joined-call', onJoined);
    socket.on('user-left-call', onLeft);
    socket.on('call-participants', onRoster);
    socket.on('call-roster', onRoster);

    return () => {
      socket.off('webrtc-signal', onSignal);
      socket.off('user-joined-call', onJoined);
      socket.off('user-left-call', onLeft);
      socket.off('call-participants', onRoster);
      socket.off('call-roster', onRoster);
      socket.emit('leave-call', { roomId });
      peersRef.current.forEach((_, socketId) => socket.emit('webrtc-signal', { to: socketId, type: 'bye' }));
      peersRef.current.forEach((peer) => { try { peer.pc.close(); } catch { /* noop */ } });
      peersRef.current.clear();
    };
  }, [socket, roomId, myId, polite, ensurePeer, removePeer]);

  /* ------------------------------------------------------------ media */

  const start = useCallback(async ({ audio = true, video = true } = {}) => {
    setMediaError(null);
    if (localStreamRef.current) return localStreamRef.current;

    if (!navigator.mediaDevices?.getUserMedia) {
      const message = 'This browser has no media capture API. Video needs a secure (https) context.';
      setMediaError(message);
      throw new Error(message);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
      });
      setLocalStream(stream);

      // Existing connections need the new tracks attached before they can send.
      peersRef.current.forEach((peer, socketId) => {
        for (const track of stream.getTracks()) peer.pc.addTrack(track, stream);
        socket.emit('webrtc-signal', { to: socketId, type: 'restart' });
      });

      socket.emit('join-call', { roomId });
      return stream;
    } catch (error) {
      const reason = error.name === 'NotAllowedError'
        ? 'Camera and microphone access was declined. Allow them in the browser prompt, then try again.'
        : error.name === 'NotFoundError'
          ? 'No camera or microphone was found on this device.'
          : `Could not open the capture devices (${error.message}).`;
      setMediaError(reason);
      // Audio-only is still useful when the camera is missing or busy.
      if ((error.name === 'NotFoundError' || error.name === 'NotReadableError') && audio) {
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          setLocalStream(audioOnly);
          setCameraOn(false);
          socket.emit('join-call', { roomId });
          setMediaError('Joined with audio only — no camera available.');
          return audioOnly;
        } catch { /* fall through to the thrown error below */ }
      }
      throw new Error(reason);
    }
  }, [socket, roomId]);

  const stop = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    setLocalStream(null);
    setScreenStream(null);
    socket?.emit('leave-call', { roomId });
    peersRef.current.forEach((peer, socketId) => {
      socket?.emit('webrtc-signal', { to: socketId, type: 'bye' });
      try { peer.pc.close(); } catch { /* noop */ }
    });
    peersRef.current.clear();
    publishPeers();
  }, [socket, roomId, publishPeers]);

  const toggleMic = useCallback(() => {
    const next = !micOn;
    localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = next; });
    setMicOn(next);
    socket?.emit('call-state', { roomId, micOn: next, cameraOn });
    return next;
  }, [micOn, cameraOn, socket, roomId]);

  const toggleCamera = useCallback(() => {
    const next = !cameraOn;
    localStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = next; });
    setCameraOn(next);
    socket?.emit('call-state', { roomId, micOn, cameraOn: next });
    return next;
  }, [cameraOn, micOn, socket, roomId]);

  const restoreCamera = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    setScreenStream(null);
    const camera = localStreamRef.current?.getVideoTracks()[0];
    if (camera) {
      peersRef.current.forEach((peer) => {
        const sender = peer.pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(camera);
      });
    }
    socket?.emit('screen-share-status', { roomId, isSharing: false });
  }, [socket, roomId]);

  // Replacing the track keeps the connection alive, so a peer does not see the
  // whole call drop the moment someone starts or stops sharing.
  const toggleScreenShare = useCallback(async () => {
    if (screenStreamRef.current) {
      restoreCamera();
      return false;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setMediaError('This browser cannot capture the screen. Try Chrome or Edge.');
      return false;
    }

    // The picker is a user-gated promise that can sit unresolved for a while;
    // without this the button looks dead while the OS dialog is open.
    setIsRequestingShare(true);
    try {
      const capture = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false });
      const track = capture.getVideoTracks()[0];
      // Label is how remote peers tell a screen feed from the camera feed.
      track.label = 'screen';
      track.onended = () => restoreCamera();

      setScreenStream(capture);
      peersRef.current.forEach((peer) => {
        const sender = peer.pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(track);
      });
      socket?.emit('screen-share-status', { roomId, isSharing: true });
      return true;
    } catch (error) {
      if (error.name !== 'NotAllowedError') setMediaError(`Screen capture failed: ${error.message}`);
      return false;
    } finally {
      setIsRequestingShare(false);
    }
  }, [socket, roomId, restoreCamera]);

  return {
    peers,
    localStream,
    screenStream,
    mediaError,
    isRequestingShare,
    micOn,
    cameraOn,
    isSharing: !!screenStream,
    iceCandidateTypes,
    start,
    stop,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    stopScreenShare: restoreCamera,
    clearError: () => setMediaError(null)
  };
}
