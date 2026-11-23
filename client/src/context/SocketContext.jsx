import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

const TOKEN_KEY = 'pro_collab_token';
const readToken = () => localStorage.getItem(TOKEN_KEY) || '';

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  // One socket for the whole app. The handshake carries the JWT so the server
  // can attribute activity to a real account instead of an anonymous id.
  useEffect(() => {
    const url = import.meta.env.VITE_SOCKET_URL || window.location.origin;

    const instance = io(url, {
      transports: ['websocket', 'polling'],
      auth: { token: readToken() },
      reconnectionDelay: 600,
      reconnectionDelayMax: 6000
    });

    socketRef.current = instance;
    setSocket(instance);

    instance.on('connect', () => setIsConnected(true));
    instance.on('disconnect', () => setIsConnected(false));
    instance.on('connect_error', () => setIsConnected(false));

    return () => {
      instance.removeAllListeners();
      instance.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Signing in or out mid-session: swap the credential and reconnect so the
  // server re-runs its handshake auth.
  useEffect(() => {
    const instance = socketRef.current;
    if (!instance) return;
    const token = readToken();
    if ((instance.auth?.token || '') === token) return;
    instance.auth = { token };
    instance.disconnect();
    instance.connect();
  }, [user?.id, user?.username]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
