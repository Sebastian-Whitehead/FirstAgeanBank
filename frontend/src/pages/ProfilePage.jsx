import React, { useState } from 'react';
import Message from '../components/Message';
import { useSession } from '../contexts/SessionContext';
import { updatePassword } from '../lib/auth';
import { messageForError } from '../lib/errors';

export default function ProfilePage() {
  const { user } = useSession();
  const [passwordMessage, setPasswordMessage] = useState('');
  const [busyPassword, setBusyPassword] = useState(false);
  async function submitPassword(event) {
    event.preventDefault();
    setPasswordMessage('');
    setBusyPassword(true);
    try {
      const formData = new FormData(event.currentTarget);
      if (formData.get('newpassword') !== formData.get('confirmpassword')) {
        throw new Error('The new passwords do not match.');
      }
      await updatePassword(formData.get('newpassword'));
      setPasswordMessage('Your password has been updated.');
    } catch (error) {
      setPasswordMessage(messageForError(error.message, error.message || 'Could not update the password.'));
    } finally {
      setBusyPassword(false);
    }
  }

  return (
    <main className="page-container page-container--wide">
      <div className="page-heading"><p className="eyebrow">Account preferences</p><h1>Profile settings</h1><p>View your linked identity and manage your password.</p></div>
      <div className="profile-grid">
        <section className="surface-card form-card">
          <p className="eyebrow">Linked identity</p><h2>Platform IDs</h2>
          <p className="muted">These IDs are read from your existing shared player identity and are not changed by this app.</p>
          <dl><dt>SteamID64</dt><dd>{user.steamId || 'Not linked'}</dd><dt>Discord ID</dt><dd>{user.discordId || 'Not linked'}</dd></dl>
        </section>
        <section className="surface-card form-card">
          <p className="eyebrow">Security</p><h2>Change password</h2>
          <p className="muted">Your password is managed by Supabase Auth.</p>
          <form className="form-stack" onSubmit={submitPassword}>
            <label>New password<input name="newpassword" type="password" autoComplete="new-password" minLength="6" required /></label>
            <label>Confirm new password<input name="confirmpassword" type="password" autoComplete="new-password" minLength="6" required /></label>
            <Message>{passwordMessage}</Message>
            <button className="button button--primary" disabled={busyPassword}>{busyPassword ? 'Updating…' : 'Update password'}</button>
          </form>
        </section>
      </div>
    </main>
  );
}
