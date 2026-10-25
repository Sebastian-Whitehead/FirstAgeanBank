import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Message from '../components/Message';
import { useSession } from '../contexts/SessionContext';
import { submitForm } from '../lib/api';
import { messageForError } from '../lib/errors';
import { formatMoney } from '../lib/format';

export default function TransferPage() {
  const { user, refresh } = useSession();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await submitForm('/includes/transfer.inc.php', event.currentTarget, 'transfer-submit');
      if (result.success) {
        await refresh();
        navigate('/accounts/', { state: { flash: 'Transfer completed successfully.' } });
      } else {
        setError(messageForError(result.error, 'The transfer could not be completed.'));
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-container page-container--narrow">
      <div className="page-heading"><p className="eyebrow">Move funds</p><h1>Send a transfer</h1><p>Transfers are recorded in both accounts with a timestamp.</p></div>
      <section className="surface-card form-card">
        <div className="transfer-from"><span>From account</span><strong>{user.steamId || 'SteamID not set'}</strong><b>{formatMoney(user.balance)}</b></div>
        <form className="form-stack" onSubmit={submit}>
          <label>Recipient SteamID64<input name="destinationAccountNumber" type="text" inputMode="numeric" pattern="[0-9]{17}" minLength="17" maxLength="17" placeholder="17-digit SteamID64" required /></label>
          <label>Amount (USD)<input name="amount" type="number" min="0.01" max="5000" step="0.01" placeholder="0.00" required /></label>
          <Message>{error}</Message>
          <button className="button button--primary" type="submit" disabled={busy || !user.steamId}>{busy ? 'Sending…' : 'Send transfer'}</button>
          {!user.steamId && <p className="form-footnote">Add your SteamID64 in <Link to="/accounts/update/">profile settings</Link> before transferring.</p>}
        </form>
      </section>
    </main>
  );
}
