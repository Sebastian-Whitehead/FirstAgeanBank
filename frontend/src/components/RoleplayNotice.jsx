import React, { useEffect, useRef, useState } from 'react';

const acknowledgementKey = 'first-agean-bank-roleplay-notice-acknowledged';

function wasAcknowledged() {
  try {
    return window.localStorage.getItem(acknowledgementKey) === 'true';
  } catch (error) {
    console.warn('Unable to read the role-play notice acknowledgement.', error);
    return false;
  }
}

export default function RoleplayNotice() {
  const [open, setOpen] = useState(() => !wasAcknowledged());
  const acknowledgeButton = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    acknowledgeButton.current?.focus();
    const keepFocusInNotice = (event) => {
      if (event.key === 'Tab') {
        event.preventDefault();
        acknowledgeButton.current?.focus();
      }
    };
    document.addEventListener('keydown', keepFocusInNotice);
    return () => document.removeEventListener('keydown', keepFocusInNotice);
  }, [open]);

  function acknowledge() {
    try {
      window.localStorage.setItem(acknowledgementKey, 'true');
    } catch (error) {
      console.warn('Unable to save the role-play notice acknowledgement.', error);
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="roleplay-notice-backdrop">
      <section
        className="roleplay-notice"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="roleplay-notice-title"
        aria-describedby="roleplay-notice-description"
      >
        <p className="roleplay-notice__eyebrow">Important notice · fictional role-play only</p>
        <h1 id="roleplay-notice-title">This is not a real bank</h1>
        <p id="roleplay-notice-description">
          First Agean Bank is a fictional role-play website. All accounts, balances, transfers, and
          transactions shown here are game data and do not represent real-world money. No real
          money is held, sent, or insured by this site.
        </p>
        <p className="roleplay-notice__warning">
          Do not enter real financial, banking, or sensitive personal information.
        </p>
        <button
          className="roleplay-notice__acknowledge"
          type="button"
          ref={acknowledgeButton}
          onClick={acknowledge}
        >
          I understand — continue to the RP site
        </button>
      </section>
    </div>
  );
}
