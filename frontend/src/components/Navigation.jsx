import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';

function Brand() {
  return (
    <Link className="brand" to="/">
      <img src="/assets/png/first-agean-bank.png" alt="" />
      <span>First Agean <b>Bank</b></span>
    </Link>
  );
}

export default function Navigation() {
  const { user, logout, setError } = useSession();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="site-header">
      <div className="header-main">
        <Brand />
        {user && <Link className="profile-shortcut" to="/accounts/update/">{user.firstname} {user.lastname}</Link>}
      </div>
      <nav className="site-nav" aria-label="Main navigation">
        <div className="site-nav__inner">
          <NavLink to="/" end>Home</NavLink>
          {user ? (
            <>
              <NavLink to="/accounts/">Accounts</NavLink>
              <NavLink to="/transfer/">Transfer</NavLink>
              <NavLink to="/investments/">Investments</NavLink>
              <NavLink to="/activities/">Activities</NavLink>
              <button className="site-nav__logout" type="button" onClick={handleLogout} disabled={loggingOut}>
                {loggingOut ? 'Logging out…' : 'Logout'}
              </button>
            </>
          ) : (
            <>
              <a href="/#fraud">Fraud Awareness</a>
              <a href="/#banks">Three Islands</a>
              <NavLink to="/signup/">Join Us</NavLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
