import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Message from '../components/Message';
import { useSession } from '../contexts/SessionContext';
import { submitForm } from '../lib/api';
import { errorMessages, messageForError } from '../lib/errors';

function LoginForm() {
  const { refresh, setError } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setLoginError] = useState(() => {
    const code = new URLSearchParams(location.search).get('error');
    return code === 'sessionexpired'
      ? 'Your session expired. Please sign in again.'
      : (errorMessages[code] || '');
  });
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoginError('');
    setBusy(true);
    try {
      const result = await submitForm('/includes/login.inc.php', event.currentTarget, 'login-submit');
      if (result.success) {
        await refresh();
        navigate('/accounts/');
      } else {
        setLoginError(messageForError(result.error, 'Unable to log in. Please try again.'));
      }
    } catch (requestError) {
      setLoginError(requestError.message);
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <label>Username<input name="username" type="text" autoComplete="username" required /></label>
      <label>Password<input name="pwd" type="password" autoComplete="current-password" required /></label>
      <Message>{error}</Message>
      <button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Log in'}</button>
      <Link className="button button--secondary" to="/signup/">Join us today</Link>
    </form>
  );
}

export default function HomePage() {
  const { user } = useSession();
  return (
    <>
      <main>
        <section className="home-hero">
          <div className="home-hero__copy">
            <p className="eyebrow">One federation. Three islands.</p>
            <h1>{user ? `Welcome back, ${user.username}` : 'A brighter future across the Aegean Sea.'}</h1>
            <p>First Agean Bank is proud to help keep our island communities connected, one neighbor and one voyage at a time.</p>
            {user && <Link className="button button--primary" to="/accounts/">Go to your accounts</Link>}
          </div>
          {!user && (
            <section className="surface-card login-card">
              <p className="eyebrow">Secure online banking</p><h2>Sign in</h2>
              <LoginForm />
            </section>
          )}
        </section>
        <section className="home-section">
          <div className="section-inner">
            <p className="eyebrow">A federation connected by the sea</p>
            <h2>Three islands, one shared future</h2>
            <p>From Altis to Stratis and Malden, every island and every community has a place in our common story.</p>
          </div>
        </section>
        <section className="home-section home-section--blue" id="accounts">
          <div className="section-inner">
            <p className="eyebrow">Federation prosperity</p><h2>Official prosperity figures</h2>
            <div className="prosperity-grid">
              <article><h3>Islandwide Prosperity</h3><strong>128%</strong><p>So prosperous, we found an extra 28% prosperity.</p></article>
              <article><h3>Harbor Efficiency</h3><strong>1,000%</strong><p>Ten times more efficient than a perfectly efficient harbor.</p></article>
              <article><h3>Federation Unity</h3><strong>300%</strong><p>One hundred percent for each of our three united islands.</p></article>
            </div>
            <p className="muted">Figures are official, mathematically enthusiastic, and absolutely not exaggerated.</p>
          </div>
        </section>
        <section className="home-section" id="fraud">
          <div className="section-inner section-inner--narrow">
            <p className="eyebrow">Stay safe</p><h2>Keep your account in safe harbor</h2>
            <p>Your account is yours alone. Never share your password or one-time codes. First Agean Bank will never ask you to pay a fee with gift cards or send money to “protect” your balance. If a request feels suspicious, pause and verify it independently.</p>
          </div>
        </section>
        <section className="home-section home-section--blue" id="banks">
          <div className="section-inner">
            <p className="eyebrow">Three islands, one federation</p><h2>Our island communities</h2>
            <div className="island-grid">
              {[
                ['Altis', 'altis-silhouette.png', 'Our largest island: a lively capital, busy harbors, and the heart of Federation trade.'],
                ['Stratis', 'stratis-silhouette.png', 'A close-knit island where clear waters and a proud maritime tradition meet.'],
                ['Malden', 'malden-silhouette.png', 'Known for rugged coastlines, hillside villages, and resilient communities.']
              ].map(([name, image, description]) => (
                <article className="island-card" key={name}>
                  <img src={`/assets/png/${image}`} alt="" /><h3>{name}</h3><p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      {!user && <div className="mobile-signup"><Link className="button button--secondary" to="/signup/">Create an account</Link></div>}
    </>
  );
}
