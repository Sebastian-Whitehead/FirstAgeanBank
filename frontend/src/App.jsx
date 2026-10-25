import React from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Footer from './components/Footer';
import Navigation from './components/Navigation';
import { useSession } from './contexts/SessionContext';
import AccountsPage from './pages/AccountsPage';
import ActivitiesPage from './pages/ActivitiesPage';
import HomePage from './pages/HomePage';
import InvestmentsPage from './pages/InvestmentsPage';
import ProfilePage from './pages/ProfilePage';
import SignupPage from './pages/SignupPage';
import TransferPage from './pages/TransferPage';

function PrivateRoutes() {
  const { session } = useSession();
  if (session.loading) return <div className="app-loading">Loading your account…</div>;
  if (!session.authenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}

function AppLayout() {
  const { session, error } = useSession();
  return (
    <>
      <Navigation />
      {error && <p className="global-error" role="alert">{error}</p>}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route element={<PrivateRoutes />}>
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/accounts/update" element={<ProfilePage />} />
          <Route path="/transfer" element={<TransferPage />} />
          <Route path="/activities" element={<ActivitiesPage />} />
          <Route path="/investments" element={<InvestmentsPage />} />
        </Route>
        <Route path="*" element={<Navigate to={session.authenticated ? '/accounts/' : '/'} replace />} />
      </Routes>
      <Footer />
    </>
  );
}

export default function App() {
  return <AppLayout />;
}
