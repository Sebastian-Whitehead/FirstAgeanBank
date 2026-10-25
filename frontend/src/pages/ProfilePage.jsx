import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Message from '../components/Message';
import { useSession } from '../contexts/SessionContext';
import { submitForm } from '../lib/api';
import { messageForError } from '../lib/errors';

export default function ProfilePage() {
  const { user, refresh, clearSession } = useSession();
  const [profileMessage, setProfileMessage] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [steamId, setSteamId] = useState(user.steamId || '');
  const [discordId, setDiscordId] = useState(user.discordId || '');
  const [busyProfile, setBusyProfile] = useState(false);
  const [busyPassword, setBusyPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setSteamId(user.steamId || '');
    setDiscordId(user.discordId || '');
  }, [user.steamId, user.discordId]);

  async function submitProfile(event) {
    event.preventDefault();
    setProfileMessage('');
    setBusyProfile(true);
    try {
      const result = await submitForm('/includes/update.inc.php', event.currentTarget, 'profile-ids-submit');
      if (result.success) {
        setProfileSuccess(true);
        setProfileMessage('Your IDs have been saved.');
        await refresh();
      } else {
        setProfileSuccess(false);
        setProfileMessage(messageForError(result.error, 'Could not save your IDs.'));
      }
    } catch (error) {
      setProfileSuccess(false);
      setProfileMessage(error.message);
    } finally {
      setBusyProfile(false);
    }
  }

  async function submitPassword(event) {
    event.preventDefault();
    setPasswordMessage('');
    setBusyPassword(true);
    try {
      const result = await submitForm('/includes/update.inc.php', event.currentTarget, 'update-submit');
      if (result.success) {
        clearSession();
        navigate('/');
      } else {
        setPasswordMessage(messageForError(result.error, 'Could not update the password.'));
      }
    } catch (error) {
      setPasswordMessage(error.message);
    } finally {
      setBusyPassword(false);
    }
  }

  return (
    <main className="page-container page-container--wide">
      <div className="page-heading"><p className="eyebrow">Account preferences</p><h1>Profile settings</h1><p>Keep your Steam and Discord IDs up to date.</p></div>
      <div className="profile-grid">
        <section className="surface-card form-card">
          <p className="eyebrow">Connected accounts</p><h2>Platform IDs</h2>
          <p className="muted">Your SteamID64 is also your account number.</p>
          <form className="form-stack" onSubmit={submitProfile}>
            <label>SteamID64<input name="steamid" inputMode="numeric" pattern="[0-9]{17}" minLength="17" maxLength="17" value={steamId} onChange={(event) => { setSteamId(event.target.value); setProfileSuccess(false); }} required /></label>
            <small>Enter your 17-digit Steam account ID.</small>
            <label>Discord ID<input name="discordid" inputMode="numeric" pattern="[0-9]{17,20}" minLength="17" maxLength="20" value={discordId} onChange={(event) => { setDiscordId(event.target.value); setProfileSuccess(false); }} required /></label>
            <small>Enter your 17–20 digit Discord user ID.</small>
            <Message success={profileSuccess}>{profileMessage}</Message>
            <button className="button button--primary" disabled={busyProfile}>{busyProfile ? 'Saving…' : 'Save IDs'}</button>
          </form>
        </section>
        <section className="surface-card form-card">
          <p className="eyebrow">Security</p><h2>Change password</h2>
          <p className="muted">Choose a strong password you do not use elsewhere.</p>
          <form className="form-stack" onSubmit={submitPassword}>
            <label>Current password<input name="oldpassword" type="password" autoComplete="current-password" required /></label>
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
