import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Message from '../components/Message';
import { requestJson } from '../lib/api';
import { messageForError } from '../lib/errors';

export default function SignupPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const formData = new FormData(event.currentTarget);
      formData.set('signup-submit', '1');
      const result = await requestJson('/includes/signup.inc.php', { method: 'POST', body: formData });
      if (result.success) setSuccess(true);
      else setError(messageForError(result.error, 'Signup could not be completed.'));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <main className="form-page">
        <section className="surface-card form-card">
          <p className="eyebrow">Welcome aboard</p><h1>Account created</h1>
          <Message success>Your account is ready. You can now sign in.</Message>
          <button className="button button--primary" onClick={() => navigate('/')}>Go to sign in</button>
        </section>
      </main>
    );
  }

  return (
    <main className="form-page">
      <section className="surface-card form-card form-card--wide">
        <p className="eyebrow">Get started</p><h1>Create your account</h1>
        <p className="muted">New accounts start with a $500 balance. One account is created per user.</p>
        <form className="form-stack" onSubmit={submit}>
          <div className="form-row">
            <label>First name<input name="firstname" maxLength="35" autoComplete="given-name" required /></label>
            <label>Last name<input name="lastname" maxLength="35" autoComplete="family-name" required /></label>
          </div>
          <label>Username<input name="uid" autoComplete="username" pattern="[A-Za-z0-9]+" required /></label>
          <label>Password<input name="pwd" type="password" minLength="6" autoComplete="new-password" required /></label>
          <label>Confirm password<input name="pwd-repeat" type="password" minLength="6" autoComplete="new-password" required /></label>
          <div className="form-row">
            <label>SteamID64<input name="steamid" inputMode="numeric" pattern="[0-9]{17}" minLength="17" maxLength="17" placeholder="17 digits" required /></label>
            <label>Discord ID<input name="discordid" inputMode="numeric" pattern="[0-9]{17,20}" minLength="17" maxLength="20" placeholder="17–20 digits" required /></label>
          </div>
          <Message>{error}</Message>
          <button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
          <p className="form-footnote">Already have an account? <Link to="/">Sign in</Link></p>
        </form>
      </section>
    </main>
  );
}
