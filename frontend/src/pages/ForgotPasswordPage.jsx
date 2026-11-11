import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Message from '../components/Message';
import { requestPasswordReset } from '../lib/auth';

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const formData = new FormData(event.currentTarget);
      await requestPasswordReset(formData.get('email'));
      setSubmitted(true);
    } catch {
      setError('We could not request a password reset right now. Please try again later.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="form-page">
      <section className="surface-card form-card">
        <p className="eyebrow">Account access</p>
        <h1>Forgot password?</h1>
        <p className="muted">Enter the email address on your account and we’ll send password reset instructions if an account matches.</p>
        <form className="form-stack" onSubmit={submit}>
          <label>Email address<input name="email" type="email" autoComplete="email" maxLength="254" required /></label>
          {submitted && (
            <Message success>
              If an account exists for that email, password reset instructions have been sent.
            </Message>
          )}
          <Message>{error}</Message>
          <button className="button button--primary" type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset instructions'}
          </button>
          <p className="form-footnote"><Link to="/">Back to sign in</Link></p>
        </form>
      </section>
    </main>
  );
}
