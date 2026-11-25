'use client';

import { useEffect, useRef } from 'react';

const SCRIPT = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';

/** One week, one month, six months, one year and five years, each with its candle size. */
const DATE_RANGES = ['1w|60', '1m|1D', '6m|120', '12m|1D', '60m|1W'];

interface Props {
  /** TradingView symbol with its exchange, e.g. NASDAQ:NVDA. */
  symbol: string;
  name: string;
}

/**
 * TradingView's Symbol Overview widget in the brand's colors. The script loads only once
 * the chart is near the viewport, so it costs nothing on first paint.
 */
export default function TvChart({ symbol, name }: Props) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const mount = () => {
      const widget = document.createElement('div');
      widget.className = 'tradingview-widget-container__widget';
      widget.style.height = '100%';
      widget.style.width = '100%';
      const script = document.createElement('script');
      script.src = SCRIPT;
      script.type = 'text/javascript';
      script.async = true;
      script.innerHTML = JSON.stringify({
        symbols: [[name, `${symbol}|1M`]],
        chartOnly: false,
        width: '100%',
        height: '100%',
        autosize: true,
        locale: 'en',
        colorTheme: 'dark',
        isTransparent: false,
        backgroundColor: 'rgba(0, 0, 0, 1)',
        gridLineColor: 'rgba(0, 255, 0, 0.07)',
        fontColor: '#808080',
        widgetFontColor: '#ffffff',
        fontFamily: 'JetBrains Mono, ui-monospace, Menlo, Consolas, monospace',
        fontSize: '10',
        headerFontSize: 'medium',
        showVolume: false,
        showMA: false,
        hideDateRanges: false,
        hideMarketStatus: false,
        hideSymbolLogo: true,
        scalePosition: 'right',
        scaleMode: 'Normal',
        noTimeScale: false,
        valuesTracking: '1',
        changeMode: 'price-and-percent',
        chartType: 'candlesticks',
        dateRanges: DATE_RANGES,
        upColor: '#00ff00',
        downColor: '#ff0000',
        borderUpColor: '#00ff00',
        borderDownColor: '#ff0000',
        wickUpColor: '#00ff00',
        wickDownColor: '#ff0000',
      });
      el.replaceChildren(widget, script);
    };

    const seen = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        seen.disconnect();
        mount();
      },
      { rootMargin: '400px' },
    );
    seen.observe(el);

    return () => {
      seen.disconnect();
      el.replaceChildren();
    };
  }, [symbol, name]);

  return <div ref={host} className="tradingview-widget-container h-full w-full" />;
}
