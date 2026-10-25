import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestJson } from '../lib/api';

const SessionContext = createContext(null);
const emptySession = { loading: true, authenticated: false, user: null, activities: [] };

export function SessionProvider({ children }) {
  const [session, setSession] = useState(emptySession);
  const [error, setError] = useState('');
  const lastActivityPing = useRef(Date.now());
  const navigate = useNavigate();

  const refresh = useCallback(async () => {
    const data = await requestJson('/api/state.php');
    setSession({ loading: false, ...data });
    if (data.error === 'sessionexpired') setError('Your session expired. Please sign in again.');
    return data;
  }, []);

  const clearSession = useCallback(() => {
    setSession({ loading: false, authenticated: false, user: null, activities: [] });
  }, []);

  const logout = useCallback(async () => {
    await requestJson('/includes/logout.inc.php', { method: 'POST' });
    clearSession();
  }, [clearSession]);

  useEffect(() => {
    refresh().catch((requestError) => {
      setError(requestError.message);
      setSession({ loading: false, authenticated: false, user: null, activities: [] });
    });
  }, [refresh]);

  useEffect(() => {
    if (!session.authenticated) return undefined;
    const pingForActivity = () => {
      if (document.hidden || Date.now() - lastActivityPing.current < 60000) return;
      lastActivityPing.current = Date.now();
      refresh()
        .then((data) => {
          if (!data.authenticated) {
            setError('Your session expired. Please sign in again.');
            navigate('/');
          }
        })
        .catch((requestError) => setError(requestError.message));
    };
    document.addEventListener('pointerdown', pingForActivity);
    document.addEventListener('keydown', pingForActivity);
    document.addEventListener('scroll', pingForActivity, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', pingForActivity);
      document.removeEventListener('keydown', pingForActivity);
      document.removeEventListener('scroll', pingForActivity);
    };
  }, [session.authenticated, refresh, navigate]);

  const value = {
    session,
    user: session.authenticated ? session.user : null,
    error,
    setError,
    refresh,
    logout,
    clearSession
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === null) throw new Error('useSession must be used inside SessionProvider.');
  return context;
}
