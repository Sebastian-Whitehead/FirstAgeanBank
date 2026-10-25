import React from 'react';
import ActivityTable from '../components/ActivityTable';
import { useSession } from '../contexts/SessionContext';

export default function ActivitiesPage() {
  const { session } = useSession();
  return (
    <main className="page-container">
      <div className="page-heading"><p className="eyebrow">Account history</p><h1>Recent activities</h1><p>Your latest 15 account activity records.</p></div>
      <section className="surface-card table-card"><ActivityTable activities={(session.activities || []).slice(0, 15)} /></section>
    </main>
  );
}
