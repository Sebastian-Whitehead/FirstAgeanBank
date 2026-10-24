<?php
    $root = realpath($_SERVER["DOCUMENT_ROOT"]);
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
    if (!isset($_SESSION['userId'])) {
        header("Location: /");
        exit();
    }

    require $root.'/includes/inactivity.php';
    $pageTitle = 'Investments | First Agean Bank';
    require $root.'/head.php';
    require $root.'/navbar.php';
?>
<main class="investments-page">
    <header class="investments-header">
        <p class="investments-eyebrow">First Agean Bank</p>
        <h1>Investment Center</h1>
        <p>Explore market activity and follow major indices, currencies, and stocks.</p>
        <p class="investments-disclaimer">Market information is provided by TradingView for informational and role-play purposes only. It is not investment advice or a banking service.</p>
    </header>

    <section class="investments-ticker" aria-label="Market ticker">
        <div class="tradingview-widget-container">
            <div class="tradingview-widget-container__widget"></div>
            <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js" async>
            {
              "symbols": [
                { "proName": "FOREXCOM:SPXUSD", "title": "S&P 500" },
                { "proName": "INDEX:DEU40", "title": "DAX" },
                { "proName": "INDEX:UKX", "title": "FTSE 100" },
                { "proName": "INDEX:NKY", "title": "Nikkei 225" },
                { "proName": "INDEX:HSI", "title": "Hang Seng" },
                { "proName": "FX:EURUSD", "title": "EUR/USD" },
                { "proName": "COMEX:GC1!", "title": "Gold" }
              ],
              "colorTheme": "light",
              "isTransparent": true,
              "displayMode": "adaptive",
              "locale": "en"
            }
            </script>
        </div>
    </section>

    <div class="investments-grid">
        <section class="investment-card investment-card--markets">
            <div class="investment-card__heading">
                <div>
                    <p class="investments-eyebrow">Global snapshot</p>
                    <h2>Markets</h2>
                </div>
                <span>Live market data</span>
            </div>
            <div class="tradingview-widget-container">
                <div class="tradingview-widget-container__widget"></div>
                <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js" async>
                {
                  "colorTheme": "light",
                  "dateRange": "1D",
                  "showChart": true,
                  "locale": "en",
                  "isTransparent": true,
                  "showSymbolLogo": true,
                  "showFloatingTooltip": true,
                  "width": "100%",
                  "height": "520",
                  "tabs": [
                    {
                      "title": "Indices",
                      "symbols": [
                        { "s": "FOREXCOM:SPXUSD", "d": "S&P 500" },
                        { "s": "NASDAQ:NDX", "d": "Nasdaq 100" },
                        { "s": "FOREXCOM:DJI", "d": "Dow Jones" },
                        { "s": "INDEX:NKY", "d": "Nikkei 225" },
                        { "s": "INDEX:DEU40", "d": "DAX" },
                        { "s": "INDEX:UKX", "d": "FTSE 100" },
                        { "s": "INDEX:HSI", "d": "Hang Seng" },
                        { "s": "INDEX:CAC40", "d": "CAC 40" },
                        { "s": "NSE:NIFTY", "d": "Nifty 50" }
                      ]
                    },
                    {
                      "title": "Forex",
                      "symbols": [
                        { "s": "FX:EURUSD", "d": "EUR/USD" },
                        { "s": "FX:GBPUSD", "d": "GBP/USD" },
                        { "s": "FX:USDJPY", "d": "USD/JPY" },
                        { "s": "FX:USDCHF", "d": "USD/CHF" }
                      ]
                    },
                    {
                      "title": "Bonds",
                      "symbols": [
                        { "s": "CBOT:ZB1!", "d": "U.S. Treasury Bond" },
                        { "s": "CBOT:UB1!", "d": "Ultra Treasury Bond" },
                        { "s": "EUREX:FGBL1!", "d": "Euro Bund" },
                        { "s": "EUREX:FBTP1!", "d": "Euro BTP" },
                        { "s": "EUREX:FGBM1!", "d": "Euro Bobl" }
                      ]
                    },
                    {
                      "title": "Futures",
                      "symbols": [
                        { "s": "COMEX:GC1!", "d": "Gold" },
                        { "s": "NYMEX:CL1!", "d": "WTI Crude Oil" },
                        { "s": "ICEEUR:BRN1!", "d": "Brent Crude Oil" },
                        { "s": "CME_MINI:ES1!", "d": "S&P 500 E-mini" },
                        { "s": "EUREX:FESX1!", "d": "Euro Stoxx 50" }
                      ]
                    }
                  ]
                }
                </script>
            </div>
        </section>

        <section class="investment-card investment-card--hotlists">
            <div class="investment-card__heading">
                <div>
                    <p class="investments-eyebrow">Global equities</p>
                    <h2>Active, gainers &amp; losers worldwide</h2>
                </div>
                <span>Daily market movers</span>
            </div>
            <div class="tradingview-widget-container">
                <div class="tradingview-widget-container__widget"></div>
                <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-hotlists.js" async>
                {
                  "colorTheme": "light",
                  "dateRange": "1D",
                  "exchange": "World",
                  "showChart": true,
                  "locale": "en",
                  "isTransparent": true,
                  "showSymbolLogo": false,
                  "showFloatingTooltip": true,
                  "width": "100%",
                  "height": "520",
                  "plotLineColorGrowing": "rgba(0, 193, 31, 1)",
                  "plotLineColorFalling": "rgba(255, 0, 0, 1)",
                  "gridLineColor": "rgba(42, 46, 57, 0)",
                  "scaleFontColor": "rgba(19, 23, 34, 1)",
                  "belowLineFillColorGrowing": "rgba(41, 98, 255, 0.12)",
                  "belowLineFillColorFalling": "rgba(41, 98, 255, 0.12)",
                  "belowLineFillColorGrowingBottom": "rgba(41, 98, 255, 0)",
                  "belowLineFillColorFallingBottom": "rgba(41, 98, 255, 0)",
                  "symbolActiveColor": "rgba(41, 98, 255, 0.12)"
                }
                </script>
            </div>
        </section>

        <section class="investment-card investment-card--global-heatmap">
            <div class="investment-card__heading">
                <div>
                    <p class="investments-eyebrow">Global equities</p>
                    <h2>Worldwide stock heatmap</h2>
                </div>
                <span>Companies grouped by sector</span>
            </div>
            <div class="tradingview-widget-container">
                <div class="tradingview-widget-container__widget"></div>
                <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js" async>
                {
                  "exchanges": [],
                  "dataSource": "AllWorld",
                  "grouping": "sector",
                  "blockSize": "market_cap_basic",
                  "blockColor": "change",
                  "locale": "en",
                  "symbolUrl": "",
                  "colorTheme": "light",
                  "hasTopBar": false,
                  "isTransparent": true,
                  "isZoomEnabled": true,
                  "hasSymbolTooltip": true,
                  "width": "100%",
                  "height": "520"
                }
                </script>
            </div>
        </section>

        <section class="investment-card investment-card--screener">
            <div class="investment-card__heading">
                <div>
                    <p class="investments-eyebrow">Global equities</p>
                    <h2>Worldwide stock screener</h2>
                </div>
                <span>Filter and compare listed companies</span>
            </div>
            <div class="tradingview-widget-container">
                <div class="tradingview-widget-container__widget"></div>
                <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-screener.js" async>
                {
                  "width": "100%",
                  "height": 550,
                  "defaultColumn": "overview",
                  "defaultScreen": "most_capitalized",
                  "market": "world",
                  "showToolbar": true,
                  "colorTheme": "light",
                  "locale": "en",
                  "isTransparent": true,
                  "enableScrolling": true
                }
                </script>
            </div>
        </section>
    </div>

    <p class="investments-attribution">Market data and widgets by <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer">TradingView</a>.</p>
</main>
<?php require $root.'/footer.php'; ?>
</body>
</html>
