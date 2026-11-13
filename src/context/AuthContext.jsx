import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import api, { readAuth, writeAuth, setAuthLostHandler } from '../lib/api.js';
import { connectSocket, disconnectSocket } from '../lib/socket.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readAuth()?.user ?? null);
  // Blocks the first render until the stored token has been checked against
  // the server, so a page refresh does not flash the login screen.
  const [booting, setBooting] = useState(() => Boolean(readAuth()?.accessToken));
  const [expired, setExpired] = useState(false);

  const signOutLocal = useCallback(() => {
    writeAuth(null);
    disconnectSocket();
    setUser(null);
  }, []);

  // The api interceptor calls this when a refresh attempt fails for good.
  useEffect(() => {
    setAuthLostHandler(() => {
      signOutLocal();
      setExpired(true);
    });
  }, [signOutLocal]);

  // Revalidate the stored session on mount.
  useEffect(() => {
    const auth = readAuth();
    if (!auth?.accessToken) {
      setBooting(false);
      return;
    }

    let cancelled = false;
    api
      .get('/auth/me')
      .then(({ data }) => {
        if (cancelled) return;
        setUser(data.data);
        writeAuth({ ...readAuth(), user: data.data });
        connectSocket(readAuth()?.accessToken);
      })
      .catch(() => {
        if (!cancelled) signOutLocal();
      })
      .finally(() => {
        if (!cancelled) setBooting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [signOutLocal]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    writeAuth(data.data);
    setUser(data.data.user);
    setExpired(false);
    connectSocket(data.data.accessToken);
    return data.data.user;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = readAuth()?.refreshToken;
    // Best effort: the local session goes either way.
    try {
      if (refreshToken) await api.post('/auth/logout', { refreshToken });
    } catch {
      /* ignore */
    }
    signOutLocal();
  }, [signOutLocal]);

  /** Merge a fresh copy of the signed-in user into both state and storage. */
  const patchUser = useCallback((changes) => {
    setUser((prev) => {
      const next = { ...prev, ...changes };
      const auth = readAuth();
      if (auth) writeAuth({ ...auth, user: next });
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ user, booting, expired, login, logout, patchUser, dismissExpired: () => setExpired(false) }),
    [user, booting, expired, login, logout, patchUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
