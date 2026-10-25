import React from 'react';
import { formatMoney } from '../lib/format';

export default function ActivityTable({ activities }) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead><tr><th>Account</th><th>Date &amp; Time</th><th>Description</th><th>Amount</th></tr></thead>
        <tbody>
          {activities.length === 0 ? (
            <tr><td colSpan="4" className="empty-row">No recent activity.</td></tr>
          ) : activities.map((activity, index) => {
            const positive = Boolean(Number(activity.is_positive));
            const timestamp = new Date(String(activity.created_at).replace(' ', 'T'));
            return (
              <tr key={`${activity.created_at}-${index}`}>
                <td>{activity.steamId || 'SteamID not set'}</td>
                <td><time dateTime={Number.isNaN(timestamp.getTime()) ? undefined : timestamp.toISOString()}>{Number.isNaN(timestamp.getTime()) ? activity.created_at : timestamp.toLocaleString()}</time></td>
                <td>{activity.description}</td>
                <td><span className={`amount-pill${positive ? ' amount-pill--positive' : ' amount-pill--negative'}`}>{positive ? '+' : '-'}{formatMoney(activity.amount)}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
