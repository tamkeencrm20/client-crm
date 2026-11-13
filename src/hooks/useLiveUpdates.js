import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../lib/socket.js';

/**
 * Keeps open lists honest: when the server broadcasts that a lead was created,
 * assigned, or moved, the affected caches are invalidated so the screen catches
 * up without the user reloading.
 *
 * @param {string[]} keys top-level query keys to invalidate
 */
export function useLiveUpdates(keys = ['leads']) {
  const qc = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const refresh = () => keys.forEach((key) => qc.invalidateQueries({ queryKey: [key] }));

    const events = ['lead:created', 'lead:assigned', 'lead:status'];
    events.forEach((e) => socket.on(e, refresh));

    return () => events.forEach((e) => socket.off(e, refresh));
    // keys is a literal array at every call site; stringify keeps the effect stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc, JSON.stringify(keys)]);
}
