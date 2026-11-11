import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { requestJson } from '../lib/api';
import { signOut } from '../lib/auth';
import { getSupabaseClient } from '../lib/supabaseClient';
import { messageForError } from '../lib/errors';

const SessionContext = createContext(null);
const emptySession = { loading: true, authenticated: false, user: null, activities: [] };

export function SessionProvider({ children }) {
  const [session, setSession] = useState(emptySession);
  const [error, setError] = useState('');
  const hadAuthenticatedSession = useRef(false);
  const manualLogout = useRef(false);
  const lastActivityPing = useRef(Date.now());
  const lastUserActivity = useRef(Date.now());
  const location = useLocation();
  const navigate = useNavigate();
  const isPasswordRecoveryRoute = ['/forgot-password', '/reset-password']
    .includes(location.pathname.replace(/\/+$/, ''));

  const clearSession = useCallback(() => {
    setSession({ loading: false, authenticated: false, user: null, activities: [] });
  }, []);

  const refresh = useCallback(async () => {
    const { data: { session: authSession }, error: sessionError } =
      await getSupabaseClient().auth.getSession();
    if (sessionError) throw sessionError;
    if (!authSession) {
      hadAuthenticatedSession.current = false;
      clearSession();
      setError('');
      return { authenticated: false };
    }
    const previouslyAuthenticated = hadAuthenticatedSession.current;
    const data = await requestJson('/api/state.php');
    setSession({ loading: false, ...data });
    hadAuthenticatedSession.current = Boolean(data.authenticated);
    if (data.error === 'loggedout') {
      manualLogout.current = true;
      try {
        await getSupabaseClient().auth.signOut({ scope: 'local' });
      } finally {
        manualLogout.current = false;
      }
    }
    setError(
      data.authenticated
        ? ''
        : previouslyAuthenticated && data.error
          ? messageForError(data.error)
          : ''
    );
    return data;
  }, [clearSession]);

  const logout = useCallback(async () => {
    manualLogout.current = true;
    try {
      await signOut();
      clearSession();
      setError('');
    } finally {
      manualLogout.current = false;
      hadAuthenticatedSession.current = false;
    }
  }, [clearSession]);

  useEffect(() => {
    let active = true;
    if (isPasswordRecoveryRoute) {
      clearSession();
    } else {
      refresh().catch((requestError) => {
        if (!active) return;
        setError(hadAuthenticatedSession.current ? requestError.message : '');
        setSession({ loading: false, authenticated: false, user: null, activities: [] });
      });
    }
    let subscription;
    try {
      const { data } = getSupabaseClient().auth.onAuthStateChange((event) => {
        if (isPasswordRecoveryRoute) return;
        if (event === 'SIGNED_OUT') {
          if (active) {
            const expired = hadAuthenticatedSession.current && !manualLogout.current;
            hadAuthenticatedSession.current = false;
            clearSession();
            setError(expired ? 'Your session expired. Please sign in again.' : '');
          }
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          setTimeout(() => {
            if (active) refresh().catch((requestError) => setError(requestError.message));
          }, 0);
        }
      });
      subscription = data.subscription;
    } catch (requestError) {
      if (active) {
        setError(requestError.message);
        setSession({ loading: false, authenticated: false, user: null, activities: [] });
      }
    }
    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [clearSession, isPasswordRecoveryRoute, refresh]);

  useEffect(() => {
    if (!session.authenticated) return undefined;
    lastActivityPing.current = Date.now();
    lastUserActivity.current = Date.now();
    const pingForActivity = () => {
      const now = Date.now();
      if (document.hidden) return;
      if (now - lastUserActivity.current >= 900000) {
        logout()
          .then(() => setError('Your session expired. Please sign in again.'))
          .catch((requestError) => setError(requestError.message));
        navigate('/');
        return;
      }
      lastUserActivity.current = now;
      if (now - lastActivityPing.current < 60000) return;
      lastActivityPing.current = now;
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
  }, [session.authenticated, refresh, logout, navigate]);

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
