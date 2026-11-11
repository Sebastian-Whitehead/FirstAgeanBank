import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Message from '../components/Message';
import { updatePassword } from '../lib/auth';
import { getSupabaseClient } from '../lib/supabaseClient';

export default function ResetPasswordPage() {
  const location = useLocation();
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [checkingRecovery, setCheckingRecovery] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const recoveryRedirect = new URLSearchParams(location.search).has('code')
      || new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery';
    const client = getSupabaseClient();
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session && active) {
        setRecoveryReady(true);
        setCheckingRecovery(false);
      }
    });

    client.auth.getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) throw sessionError;
        setRecoveryReady(Boolean(data.session && recoveryRedirect));
        setCheckingRecovery(false);
      })
      .catch(() => {
        if (!active) return;
        setError('This password reset link is invalid or has expired. Request a new one to continue.');
        setCheckingRecovery(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [location.hash, location.search]);

  async function submit(event) {
    event.preventDefault();
    setError('');
    const formData = new FormData(event.currentTarget);
    if (formData.get('password') !== formData.get('confirmPassword')) {
      setError('The passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      await updatePassword(formData.get('password'));
      const { error: signOutError } = await getSupabaseClient().auth.signOut({ scope: 'local' });
      if (signOutError) throw signOutError;
      setCompleted(true);
    } catch {
      setError('We could not update your password. The reset link may have expired; request a new one and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="form-page">
      <section className="surface-card form-card">
        <p className="eyebrow">Account access</p>
        <h1>Set a new password</h1>
        {checkingRecovery ? (
          <p className="muted">Checking your reset link…</p>
        ) : completed ? (
          <>
            <Message success>Your password has been updated. You can now sign in with your new password.</Message>
            <Link className="button button--primary" to="/">Back to sign in</Link>
          </>
        ) : recoveryReady ? (
          <form className="form-stack" onSubmit={submit}>
            <label>New password<input name="password" type="password" autoComplete="new-password" minLength="6" required /></label>
            <label>Repeat new password<input name="confirmPassword" type="password" autoComplete="new-password" minLength="6" required /></label>
            <Message>{error}</Message>
            <button className="button button--primary" type="submit" disabled={busy}>
              {busy ? 'Updating…' : 'Update password'}
            </button>
          </form>
        ) : (
          <>
            <Message>{error || 'This password reset link is invalid or has expired. Request a new one to continue.'}</Message>
            <Link className="button button--primary" to="/forgot-password/">Request a new link</Link>
          </>
        )}
      </section>
    </main>
  );
}
