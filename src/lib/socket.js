import { io } from 'socket.io-client';
import { API_ORIGIN } from './api.js';

/**
 * One shared socket for the session. Reconnects on its own; the caller only
 * has to hand it a fresh access token when the user signs in or out.
 */
let socket = null;

export function connectSocket(token) {
  if (!token) return null;

  if (socket) {
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = io(API_ORIGIN || undefined, {
    auth: { token },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export const getSocket = () => socket;
