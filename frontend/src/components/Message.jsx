import React from 'react';

export default function Message({ children, success = false }) {
  if (!children) return null;
  return <p className={`form-message${success ? ' form-message--success' : ''}`} role={success ? 'status' : 'alert'}>{children}</p>;
}
