import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import ActivityTable from '../components/ActivityTable';
import Message from '../components/Message';
import { useSession } from '../contexts/SessionContext';
import { formatMoney } from '../lib/format';

export default function AccountsPage() {
  const { user, session } = useSession();
  const location = useLocation();
  const activities = session.activities || [];
  const flash = location.state?.flash || '';

  return (
    <main className="page-container">
      <div className="page-heading"><p className="eyebrow">Your banking</p><h1>Accounts</h1><p>Welcome, {user.firstname} {user.lastname}.</p></div>
      <Message success={Boolean(flash)}>{flash}</Message>
      <section className="account-summary surface-card">
        <div><p className="eyebrow">Personal account</p><p className="account-number">{user.steamId || 'Set SteamID in profile'}</p><p className="muted">Account number · SteamID64</p></div>
        <div className="account-balance"><span>Available balance</span><strong>{formatMoney(user.balance)}</strong></div>
        <Link className="button button--primary" to="/transfer/">Send a transfer</Link>
      </section>
      <section className="content-section">
        <div className="section-title"><h2>Recent activity</h2><Link to="/activities/">View all activity</Link></div>
        <ActivityTable activities={activities.slice(0, 5)} />
      </section>
    </main>
  );
}
