import axios from 'axios';

/**
 * The single axios instance the whole app uses.
 *
 * Two responsibilities beyond plain fetching:
 *   1. attach the access token to every request
 *   2. transparently refresh it once on a 401, replaying the failed request,
 *      so a 15-minute token expiry is invisible to the user
 */

const STORAGE_KEY = 'tamkeen.auth';

export function readAuth() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? null;
  } catch {
    return null;
  }
}

export function writeAuth(auth) {
  if (auth) localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
  else localStorage.removeItem(STORAGE_KEY);
}

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || '') + '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const auth = readAuth();
  if (auth?.accessToken) config.headers.Authorization = `Bearer ${auth.accessToken}`;
  return config;
});

// Callback installed by AuthContext so a failed refresh can clear app state.
let onAuthLost = () => {};
export const setAuthLostHandler = (fn) => {
  onAuthLost = fn;
};

// While one refresh is in flight, every other 401 waits for it rather than
// firing its own — otherwise a dashboard that loads six panels at once would
// burn six refresh tokens and invalidate itself.
let refreshing = null;

async function refreshAccessToken() {
  const auth = readAuth();
  if (!auth?.refreshToken) throw new Error('No refresh token');

  const { data } = await axios.post(
    (import.meta.env.VITE_API_URL || '') + '/api/auth/refresh',
    { refreshToken: auth.refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );

  writeAuth(data.data);
  return data.data.accessToken;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const code = error.response?.data?.error?.code;

    const isExpired = status === 401 && code !== 'BAD_CREDENTIALS';
    const canRetry = original && !original._retried && !original.url?.includes('/auth/refresh');

    if (isExpired && canRetry) {
      original._retried = true;
      try {
        refreshing = refreshing ?? refreshAccessToken().finally(() => {
          refreshing = null;
        });
        const token = await refreshing;
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        writeAuth(null);
        onAuthLost();
      }
    }

    return Promise.reject(error);
  },
);

/** Pull the human-readable message out of an axios error. */
export function errorMessage(error, fallback = 'Something went wrong') {
  return error?.response?.data?.error?.message ?? error?.message ?? fallback;
}

/** Validation issues, when the server sent any. */
export function errorDetails(error) {
  return error?.response?.data?.error?.details ?? null;
}

export default api;
