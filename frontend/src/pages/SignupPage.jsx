import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Message from '../components/Message';
import { useSession } from '../contexts/SessionContext';
import {
  beginSignup,
  completePendingSignup,
  resendPendingSignupConfirmation
} from '../lib/auth';
import { messageForError } from '../lib/errors';

export default function SignupPage() {
  const [error, setError] = useState('');
  const [awaitingEmail, setAwaitingEmail] = useState(false);
  const [confirmationResent, setConfirmationResent] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { refresh } = useSession();

  useEffect(() => {
    let active = true;
    completePendingSignup()
      .then(async (result) => {
        if (!active) return;
        if (result === 'awaiting-email') setAwaitingEmail(true);
        if (result === 'completed') {
          await refresh();
          navigate('/', { replace: true });
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });
    return () => { active = false; };
  }, [navigate, refresh]);

  async function submit(event) {
    event.preventDefault();
    setError('');
    const formData = new FormData(event.currentTarget);
    const password = formData.get('pwd');
    if (password !== formData.get('confirmPwd')) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const completed = await beginSignup(
        formData.get('uid'),
        formData.get('email'),
        password,
        formData.get('displayName'),
        formData.get('discordid')
      );
      setAwaitingEmail(!completed);
    } catch (requestError) {
      setError(messageForError(requestError.message, requestError.message || 'Signup could not be completed.'));
    } finally {
      setBusy(false);
    }
  }

  async function resendConfirmation() {
    setError('');
    setBusy(true);
    try {
      await resendPendingSignupConfirmation();
      setConfirmationResent(true);
    } catch (requestError) {
      setError(requestError.message || 'Could not resend the confirmation email.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="form-page">
      <section className="surface-card form-card form-card--wide">
        <p className="eyebrow">Get started</p><h1>Create your account</h1>
        <p className="muted">Choose a username and password, provide your email, then verify the Discord account already linked to your player identity.</p>
        <form className="form-stack" onSubmit={submit}>
          <label>Username<input name="uid" autoComplete="username" pattern="[A-Za-z0-9]+" maxLength="64" required /></label>
          <label>Name<input name="displayName" autoComplete="name" maxLength="100" required /></label>
          <label>Email address<input name="email" type="email" autoComplete="email" maxLength="254" required /></label>
          <label>Password<input name="pwd" type="password" minLength="6" autoComplete="new-password" required /></label>
          <label>Repeat password<input name="confirmPwd" type="password" minLength="6" autoComplete="new-password" required /></label>
          <label>Discord ID<input name="discordid" inputMode="numeric" pattern="[0-9]{17,19}" minLength="17" maxLength="19" placeholder="Your Discord user ID" required /></label>
          <small>Discord will ask you to authorize the link. The entered ID must match your verified Discord account.</small>
          {awaitingEmail && (
            <>
              <Message success>
                Check your email and confirm your address. Then return here to connect Discord.
                {confirmationResent && ' A new confirmation email was requested.'}
              </Message>
              <button className="button button--secondary" type="button" onClick={resendConfirmation} disabled={busy}>
                {busy ? 'Sending…' : 'Resend confirmation email'}
              </button>
            </>
          )}
          <Message>{error}</Message>
          <button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
          <p className="form-footnote">Already have an account? <Link to="/">Sign in</Link></p>
        </form>
      </section>
    </main>
  );
}
