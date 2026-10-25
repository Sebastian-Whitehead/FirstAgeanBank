import React, { useEffect, useRef } from 'react';

export function TradingViewWidget({ widget, config, className = '' }) {
  const containerRef = useRef(null);
  const configKey = JSON.stringify(config);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    container.replaceChildren();
    const target = document.createElement('div');
    target.className = 'tradingview-widget-container__widget';
    container.append(target);
    const script = document.createElement('script');
    script.src = `https://s3.tradingview.com/external-embedding/embed-widget-${widget}.js`;
    script.async = true;
    script.textContent = configKey;
    container.append(script);
    return () => container.replaceChildren();
  }, [widget, configKey]);
  return <div className={`tradingview-widget-container ${className}`} ref={containerRef} />;
}

export function WidgetCard({ eyebrow, title, note, children, className = '' }) {
  return (
    <section className={`widget-card ${className}`}>
      <div className="widget-card__heading">
        <div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>
        {note && <span>{note}</span>}
      </div>
      {children}
    </section>
  );
}
