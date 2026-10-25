import React from 'react';
import { TradingViewWidget, WidgetCard } from '../components/TradingViewWidget';

const marketTabs = [
  {
    title: 'Global indices',
    symbols: [
      { s: 'FOREXCOM:SPXUSD', d: 'S&P 500' },
      { s: 'INDEX:DEU40', d: 'DAX' },
      { s: 'INDEX:UKX', d: 'FTSE 100' },
      { s: 'INDEX:NKY', d: 'Nikkei 225' },
      { s: 'INDEX:HSI', d: 'Hang Seng' },
      { s: 'INDEX:CAC40', d: 'CAC 40' },
      { s: 'NSE:NIFTY', d: 'Nifty 50' }
    ]
  },
  {
    title: 'Forex',
    symbols: [
      { s: 'FX:EURUSD', d: 'EUR/USD' }, { s: 'FX:GBPUSD', d: 'GBP/USD' },
      { s: 'FX:USDJPY', d: 'USD/JPY' }, { s: 'FX:USDCHF', d: 'USD/CHF' },
      { s: 'FX:AUDUSD', d: 'AUD/USD' }, { s: 'FX:USDCAD', d: 'USD/CAD' }
    ]
  },
  {
    title: 'Bonds',
    symbols: [
      { s: 'CBOT:ZB1!', d: 'U.S. Treasury Bond' }, { s: 'CBOT:UB1!', d: 'Ultra Treasury Bond' },
      { s: 'EUREX:FGBL1!', d: 'Euro Bund' }, { s: 'EUREX:FBTP1!', d: 'Euro BTP' },
      { s: 'EUREX:FGBM1!', d: 'Euro Bobl' }
    ]
  },
  {
    title: 'Futures',
    symbols: [
      { s: 'COMEX:GC1!', d: 'Gold' }, { s: 'NYMEX:CL1!', d: 'WTI Crude Oil' },
      { s: 'ICEEUR:BRN1!', d: 'Brent Crude Oil' }, { s: 'CME_MINI:ES1!', d: 'S&P 500 E-mini' },
      { s: 'EUREX:FESX1!', d: 'Euro Stoxx 50' }
    ]
  }
];

const ticker = {
  symbols: [
    { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500' },
    { proName: 'INDEX:DEU40', title: 'DAX' },
    { proName: 'INDEX:UKX', title: 'FTSE 100' },
    { proName: 'INDEX:NKY', title: 'Nikkei 225' },
    { proName: 'INDEX:HSI', title: 'Hang Seng' },
    { proName: 'FX:EURUSD', title: 'EUR/USD' },
    { proName: 'COMEX:GC1!', title: 'Gold' }
  ],
  colorTheme: 'light', isTransparent: true, displayMode: 'adaptive', locale: 'en'
};

const overview = {
  colorTheme: 'light', dateRange: '1D', showChart: true, locale: 'en',
  isTransparent: true, showSymbolLogo: true, showFloatingTooltip: true,
  width: '100%', height: '520', tabs: marketTabs
};

const hotlists = {
  colorTheme: 'light', dateRange: '1D', exchange: 'World', showChart: true,
  locale: 'en', isTransparent: true, showSymbolLogo: false, showFloatingTooltip: true,
  width: '100%', height: '520', plotLineColorGrowing: 'rgba(0, 193, 31, 1)',
  plotLineColorFalling: 'rgba(255, 0, 0, 1)', gridLineColor: 'rgba(42, 46, 57, 0)',
  scaleFontColor: 'rgba(19, 23, 34, 1)', symbolActiveColor: 'rgba(41, 98, 255, 0.12)'
};

const heatmap = {
  exchanges: [], dataSource: 'AllWorld', grouping: 'sector',
  blockSize: 'market_cap_basic', blockColor: 'change', locale: 'en',
  symbolUrl: '', colorTheme: 'light', hasTopBar: false, isTransparent: true,
  isZoomEnabled: true, hasSymbolTooltip: true, width: '100%', height: '520'
};

const screener = {
  width: '100%', height: 550, defaultColumn: 'overview',
  defaultScreen: 'most_capitalized', market: 'world', showToolbar: true,
  colorTheme: 'light', locale: 'en', isTransparent: true, enableScrolling: true
};

export default function InvestmentsPage() {
  return (
    <main className="page-container investments-page">
      <header className="investments-intro">
        <p className="eyebrow">First Agean Bank</p>
        <h1>Investment Center</h1>
        <p>Follow global indices, currencies, bonds, futures, and stocks.</p>
        <p className="disclaimer">Market information is provided by TradingView for informational and role-play purposes only. It is not investment advice or a banking service.</p>
      </header>
      <div className="ticker-card"><TradingViewWidget widget="ticker-tape" config={ticker} /></div>
      <div className="widgets-grid">
        <WidgetCard eyebrow="Global snapshot" title="Markets" note="Live market data">
          <TradingViewWidget widget="market-overview" config={overview} />
        </WidgetCard>
        <WidgetCard eyebrow="Global equities" title="Active, gainers & losers worldwide" note="Daily market movers">
          <TradingViewWidget widget="hotlists" config={hotlists} />
        </WidgetCard>
        <WidgetCard eyebrow="Global equities" title="Worldwide stock heatmap" note="Companies grouped by sector">
          <TradingViewWidget widget="stock-heatmap" config={heatmap} />
        </WidgetCard>
        <WidgetCard eyebrow="Global equities" title="Worldwide stock screener" note="Filter and compare companies" className="widget-card--wide">
          <TradingViewWidget widget="screener" config={screener} />
        </WidgetCard>
      </div>
      <p className="attribution">Market data and widgets by <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer">TradingView</a>.</p>
    </main>
  );
}
