import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Message from '../components/Message';
import { useSession } from '../contexts/SessionContext';
import { submitForm } from '../lib/api';
import { messageForError } from '../lib/errors';
import { formatMoney } from '../lib/format';

export default function TransferPage() {
  const { user, refresh } = useSession();
  const accounts = user.accounts || [];
  const location = useLocation();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [recipientAccountNumber, setRecipientAccountNumber] = useState('');
  const [sourceAccountNumber, setSourceAccountNumber] = useState(
    location.state?.sourceAccountNumber || accounts[0]?.accountNumber || ''
  );
  const navigate = useNavigate();
  const sourceAccount = accounts.find((account) => account.accountNumber === sourceAccountNumber);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const requestKey = idempotencyKey || window.crypto.randomUUID();
    try {
      const result = await submitForm(
        '/includes/transfer.inc.php',
        event.currentTarget,
        'transfer-submit',
        {
          idempotencyKey: requestKey,
          sourceAccountNumber
        }
      );
      if (result.success) {
        setIdempotencyKey('');
        await refresh();
        navigate('/accounts/', { state: { flash: 'Transfer completed successfully.' } });
      } else {
        setIdempotencyKey('');
        setError(messageForError(result.error, 'The transfer could not be completed.'));
      }
    } catch (requestError) {
      setIdempotencyKey(requestKey);
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-container page-container--narrow">
      <div className="page-heading"><p className="eyebrow">Move funds</p><h1>Send a transfer</h1><p>Transfers are recorded in the shared account ledger.</p></div>
      <section className="surface-card form-card">
        <div className="transfer-from">
          <span>From account</span>
          <strong>{sourceAccount?.accountNumber || 'Account not set'}</strong>
          <b>{formatMoney(sourceAccount?.balance || 0)}</b>
        </div>
        <form className="form-stack" onSubmit={submit}>
          <label>Debit account
            <select
              name="sourceAccountNumber"
              value={sourceAccountNumber}
              onChange={(event) => {
                const nextSourceAccountNumber = event.target.value;
                setSourceAccountNumber(nextSourceAccountNumber);
                if (recipientAccountNumber === nextSourceAccountNumber) {
                  setRecipientAccountNumber('');
                }
                setIdempotencyKey('');
              }}
              required
              disabled={accounts.length === 0}
            >
              {accounts.map((account) => (
                <option key={account.accountNumber} value={account.accountNumber}>
                  {(account.name || 'Account')} · {account.accountNumber} · {formatMoney(account.balance)}
                </option>
              ))}
            </select>
          </label>
          {accounts.length > 1 && (
            <fieldset className="transfer-shortcuts">
              <legend>Quick transfer to your accounts</legend>
              <div className="transfer-shortcuts__list">
                {accounts
                  .filter((account) => account.accountNumber !== sourceAccountNumber)
                  .map((account) => (
                    <button
                      className={`transfer-shortcut${recipientAccountNumber === account.accountNumber ? ' transfer-shortcut--selected' : ''}`}
                      type="button"
                      key={account.accountNumber}
                      aria-pressed={recipientAccountNumber === account.accountNumber}
                      onClick={() => {
                        setRecipientAccountNumber(account.accountNumber);
                        setIdempotencyKey('');
                      }}
                    >
                      <strong>{account.name || 'Account'}</strong>
                      <span>{account.accountNumber}</span>
                    </button>
                  ))}
              </div>
            </fieldset>
          )}
          <label>Recipient account number
            <input
              name="destinationAccountNumber"
              type="text"
              maxLength="128"
              placeholder="Enter account number"
              value={recipientAccountNumber}
              onChange={(event) => {
                setRecipientAccountNumber(event.target.value);
                setIdempotencyKey('');
              }}
              required
            />
          </label>
          <label>Amount (USD)<input name="amount" type="number" min="0.01" max="5000" step="0.01" placeholder="0.00" onChange={() => setIdempotencyKey('')} required /></label>
          <Message>{error}</Message>
          <button className="button button--primary" type="submit" disabled={busy || !user.steamId || !sourceAccount}>{busy ? 'Sending…' : 'Send transfer'}</button>
          {accounts.length === 0 && <p className="form-footnote">No accounts are available for this profile yet.</p>}
          {!user.steamId && <p className="form-footnote">Add your SteamID64 in <Link to="/accounts/update/">profile settings</Link> before transferring.</p>}
        </form>
      </section>
    </main>
  );
}
