import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ActivityTable from '../components/ActivityTable';
import Message from '../components/Message';
import { useSession } from '../contexts/SessionContext';
import { submitForm } from '../lib/api';
import { messageForError } from '../lib/errors';
import { formatMoney } from '../lib/format';

export default function AccountsPage() {
  const { user, session, refresh } = useSession();
  const location = useLocation();
  const accounts = user.accounts || [];
  const activities = session.activities || [];
  const [accountName, setAccountName] = useState('');
  const [accountMessage, setAccountMessage] = useState(location.state?.flash || '');
  const [accountError, setAccountError] = useState('');
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manageDialog, setManageDialog] = useState(null);
  const [manageError, setManageError] = useState('');
  const [accountActionBusy, setAccountActionBusy] = useState(false);
  const [accountMenu, setAccountMenu] = useState('');
  const menuRef = useRef(null);

  useEffect(() => {
    if (!dialogOpen && !manageDialog && !accountMenu) return undefined;
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      setAccountMenu('');
      if (!creatingAccount && !accountActionBusy) {
        setDialogOpen(false);
        setManageDialog(null);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [dialogOpen, manageDialog, accountMenu, creatingAccount, accountActionBusy]);

  useEffect(() => {
    if (!accountMenu) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setAccountMenu('');
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [accountMenu]);

  async function createAccount(event) {
    event.preventDefault();
    setAccountMessage('');
    setAccountError('');
    setCreatingAccount(true);
    try {
      const result = await submitForm('/includes/create-account.inc.php', event.currentTarget, 'create-account-submit');
      if (result.success) {
        setAccountName('');
        setDialogOpen(false);
        setAccountMessage('Account created. You can move money into it with a transfer.');
        await refresh();
      } else {
        setAccountError(messageForError(result.error, 'The account could not be created.'));
      }
    } catch (requestError) {
      setAccountError(requestError.message);
    } finally {
      setCreatingAccount(false);
    }
  }

  function openRenameDialog(account) {
    setAccountMenu('');
    setAccountName(account.name || '');
    setManageError('');
    setManageDialog({ type: 'rename', account });
  }

  function openDeleteDialog(account) {
    setAccountMenu('');
    setManageError('');
    setManageDialog({ type: 'delete', account });
  }

  async function manageAccount(event) {
    event.preventDefault();
    if (!manageDialog) return;
    setAccountMessage('');
    setManageError('');
    setAccountActionBusy(true);
    try {
      const result = await submitForm(
        '/includes/account-action.inc.php',
        event.currentTarget,
        'account-action-submit',
        {
          action: manageDialog.type,
          accountNumber: manageDialog.account.accountNumber
        }
      );
      if (result.success) {
        const action = manageDialog.type;
        setManageDialog(null);
        setAccountMessage(action === 'rename' ? 'Account renamed.' : 'Account deleted.');
        await refresh();
      } else {
        setManageError(messageForError(result.error, 'The account could not be updated.'));
      }
    } catch (requestError) {
      setManageError(requestError.message);
    } finally {
      setAccountActionBusy(false);
    }
  }

  return (
    <main className="page-container">
      <div className="page-heading page-heading--accounts">
        <div>
          <p className="eyebrow">Your banking</p>
          <h1>Accounts</h1>
          <p>Welcome, {user.firstname} {user.lastname}.</p>
        </div>
        {user.steamId && (
          <button
            className="add-account-button"
            type="button"
            aria-label="Add account"
            title="Add account"
            onClick={() => {
              setAccountError('');
              setAccountName('');
              setDialogOpen(true);
            }}
          >
            <span aria-hidden="true">+</span>
          </button>
        )}
      </div>
      <Message success={Boolean(accountMessage)}>{accountMessage}</Message>
      {!dialogOpen && <Message>{accountError}</Message>}
      <section className="accounts-grid" aria-label="Available accounts">
        {accounts.map((account) => {
          const isMainAccount = (account.name || '').trim().toLowerCase() === 'main';
          const canDelete = accounts.length > 1 && Number(account.balance) === 0 && !isMainAccount;
          return (
            <article className="account-card surface-card" key={account.accountNumber}>
              <div className="account-card__heading">
                <div>
                  <p className="eyebrow">{account.type || 'Player'} account</p>
                  <h2>{account.name || 'Account'}</h2>
                </div>
                <span className="account-card__type">{account.type || 'Player'}</span>
              </div>
              <p className="account-number">{account.accountNumber}</p>
              <p className="muted">Account number</p>
              <div className="account-balance"><span>Available balance</span><strong>{formatMoney(account.balance)}</strong></div>
              <div className="account-card__footer">
                <Link
                  className="button button--primary"
                  to="/transfer/"
                  state={{ sourceAccountNumber: account.accountNumber }}
                >
                  Transfer from this account
                </Link>
                <div className="account-menu" ref={accountMenu === account.accountNumber ? menuRef : null}>
                  <button
                    className="account-menu__trigger"
                    type="button"
                    aria-label={`Manage ${account.name || 'account'}`}
                    aria-haspopup="menu"
                    aria-expanded={accountMenu === account.accountNumber}
                    title="Manage account"
                    onClick={() => setAccountMenu(accountMenu === account.accountNumber ? '' : account.accountNumber)}
                  >
                    <span aria-hidden="true">⋮</span>
                  </button>
                  {accountMenu === account.accountNumber && (
                    <div className="account-menu__items" role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        disabled={isMainAccount}
                        onClick={() => openRenameDialog(account)}
                      >
                        Rename account
                      </button>
                      <button
                        className="account-menu__delete"
                        type="button"
                        role="menuitem"
                        disabled={!canDelete}
                        onClick={() => openDeleteDialog(account)}
                      >
                        Delete account
                      </button>
                      {(isMainAccount || accounts.length <= 1 || Number(account.balance) !== 0) && (
                        <p className="account-menu__hint">
                          {isMainAccount
                            ? 'The Main account is protected.'
                            : accounts.length <= 1
                              ? 'You must keep at least one player account.'
                              : 'Only zero-balance accounts can be deleted.'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
        {accounts.length === 0 && (
          <p className="muted">No player accounts are linked to this profile yet. Add your SteamID in profile settings.</p>
        )}
      </section>
      <section className="content-section">
        <div className="section-title"><h2>Recent activity</h2><Link to="/activities/">View all activity</Link></div>
        <ActivityTable activities={activities.slice(0, 5)} />
      </section>
      {dialogOpen && (
        <div
          className="dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !creatingAccount) setDialogOpen(false);
          }}
        >
          <section
            className="add-account-dialog surface-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-account-title"
          >
            <button
              className="add-account-dialog__close"
              type="button"
              aria-label="Close dialog"
              onClick={() => setDialogOpen(false)}
              disabled={creatingAccount}
            >
              ×
            </button>
            <p className="eyebrow">Organize your funds</p>
            <h2 id="add-account-title">Add an account</h2>
            <p className="muted">Create an account to separate your funds. You can transfer money into it after it’s created.</p>
            <form className="form-stack" onSubmit={createAccount}>
              <label>Account name
                <input
                  name="accountName"
                  value={accountName}
                  onChange={(event) => setAccountName(event.target.value)}
                  maxLength="40"
                  placeholder="Savings, Checking, or Credit"
                  autoFocus
                  required
                />
              </label>
              <Message>{accountError}</Message>
              <button className="button button--primary" type="submit" disabled={creatingAccount}>
                {creatingAccount ? 'Creating…' : 'Create account'}
              </button>
            </form>
          </section>
        </div>
      )}
      {manageDialog && (
        <div
          className="dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !accountActionBusy) setManageDialog(null);
          }}
        >
          <section
            className="add-account-dialog surface-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manage-account-title"
          >
            <button
              className="add-account-dialog__close"
              type="button"
              aria-label="Close dialog"
              onClick={() => setManageDialog(null)}
              disabled={accountActionBusy}
            >
              ×
            </button>
            <p className="eyebrow">Manage your funds</p>
            <h2 id="manage-account-title">
              {manageDialog.type === 'rename' ? 'Rename account' : 'Delete account'}
            </h2>
            {manageDialog.type === 'rename' ? (
              <form className="form-stack" onSubmit={manageAccount}>
                <label>Account name
                  <input
                    name="accountName"
                    value={accountName}
                    onChange={(event) => setAccountName(event.target.value)}
                    maxLength="40"
                    autoFocus
                    required
                  />
                </label>
                <Message>{manageError}</Message>
                <button className="button button--primary" type="submit" disabled={accountActionBusy}>
                  {accountActionBusy ? 'Saving…' : 'Save name'}
                </button>
              </form>
            ) : (
              <>
                <p className="muted">
                  Delete <strong>{manageDialog.account.name}</strong> ({manageDialog.account.accountNumber})?
                  It will no longer appear as an active account or be available for transfers. Its transaction history will be preserved. Keep at least one player account and transfer out the full balance first.
                </p>
                <form className="form-stack" onSubmit={manageAccount}>
                  <Message>{manageError}</Message>
                  <div className="account-delete-dialog__actions">
                    <button className="button button--secondary" type="button" onClick={() => setManageDialog(null)} disabled={accountActionBusy}>
                      Cancel
                    </button>
                    <button className="button button--danger" type="submit" disabled={accountActionBusy}>
                      {accountActionBusy ? 'Deleting…' : 'Delete account'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
