import React, { useEffect, useState, useRef } from 'react';

type Coin = { id: string; symbol: string; name: string };

const SYMBOLS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  USDC: 'usd-coin',
  BNB: 'binancecoin',
  ADA: 'cardano',
  SOL: 'solana',
  DOGE: 'dogecoin',
};

const DEFAULT_FROM = 'USDT';
const DEFAULT_TO = 'BTC';

function useInterval(callback: () => void, delay: number | null) {
  const savedRef = useRef(callback);
  useEffect(() => {
    savedRef.current = callback;
  }, [callback]);
  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => savedRef.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

const COIN_CACHE_KEY = 'coingecko_coins_v1';

async function fetchCoinList(): Promise<Coin[]> {
  const res = await fetch('https://api.coingecko.com/api/v3/coins/list');
  if (!res.ok) throw new Error(`coins list ${res.status}`);
  const json = (await res.json()) as Coin[];
  return json || [];
}

export default function CryptoConverter(): JSX.Element {
  const [coins, setCoins] = useState<Coin[] | null>(null);
  const [fromQuery, setFromQuery] = useState<string>('');
  const [toQuery, setToQuery] = useState<string>('');
  // initialize selectedFrom/To with sensible fallbacks (use SYMBOLS mapping);
  // when the full coin list loads we'll replace with the canonical Coin object.
  const [selectedFrom, setSelectedFrom] = useState<Coin | null>({ id: SYMBOLS[DEFAULT_FROM], symbol: DEFAULT_FROM.toLowerCase(), name: DEFAULT_FROM });
  const [selectedTo, setSelectedTo] = useState<Coin | null>({ id: SYMBOLS[DEFAULT_TO], symbol: DEFAULT_TO.toLowerCase(), name: DEFAULT_TO });
  const [amount, setAmount] = useState<number>(1);
  const [converted, setConverted] = useState<number | null>(null);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [live, setLive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fromTimer = useRef<number | null>(null);
  const toTimer = useRef<number | null>(null);

  // load coin list with caching (24h)
  useEffect(() => {
    (async () => {
      try {
        const cachedRaw = localStorage.getItem(COIN_CACHE_KEY);
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw) as { ts: number; data: Coin[] };
          const age = Date.now() - (parsed.ts || 0);
          if (age < 1000 * 60 * 60 * 24 && parsed.data && parsed.data.length) {
            setCoins(parsed.data);
          }
        }
        // always attempt to fetch fresh in background
        const list = await fetchCoinList();
        if (list && list.length) {
          setCoins(list);
          try {
            localStorage.setItem(COIN_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: list }));
          } catch (e) {
            // ignore storage failures
          }
        }
      } catch (e) {
        // ignore; coins may remain null
      }
    })();
  }, []);

  // initialize selected defaults when coins available
  useEffect(() => {
    if (!coins) return;
    if (!selectedFrom) {
      const id = SYMBOLS[DEFAULT_FROM];
      const found = coins.find((c) => c.id === id || c.symbol.toLowerCase() === DEFAULT_FROM.toLowerCase());
      setSelectedFrom(found ?? { id: id, symbol: DEFAULT_FROM.toLowerCase(), name: DEFAULT_FROM });
      setFromQuery(found ? `${found.symbol.toUpperCase()} — ${found.name}` : DEFAULT_FROM);
    }
    if (!selectedTo) {
      const id = SYMBOLS[DEFAULT_TO];
      const found = coins.find((c) => c.id === id || c.symbol.toLowerCase() === DEFAULT_TO.toLowerCase());
      setSelectedTo(found ?? { id: id, symbol: DEFAULT_TO.toLowerCase(), name: DEFAULT_TO });
      setToQuery(found ? `${found.symbol.toUpperCase()} — ${found.name}` : DEFAULT_TO);
    }
  }, [coins]);

  const searchCoins = (q: string) => {
    if (!coins) return [] as Coin[];
    const v = q.trim().toLowerCase();
    if (!v) return coins.slice(0, 20);
    // match by symbol or name or id
    const out: Coin[] = [];
    for (const c of coins) {
      if (out.length >= 12) break;
      if (c.symbol.toLowerCase().includes(v) || c.name.toLowerCase().includes(v) || c.id.toLowerCase().includes(v)) out.push(c);
    }
    return out;
  };

  const fetchAndCompute = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!selectedFrom || !selectedTo) throw new Error('Select both tokens');
      const fromId = selectedFrom.id;
      const toId = selectedTo.id;
      const ids = [fromId, toId].join(',');
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
      if (!res.ok) throw new Error(`Price API ${res.status}`);
      const json = await res.json();
      const fromUSD = Number(json[fromId]?.usd ?? NaN);
      const toUSD = Number(json[toId]?.usd ?? NaN);
      if (!Number.isFinite(fromUSD) || !Number.isFinite(toUSD)) throw new Error('Unsupported pair');
      const rate = fromUSD / toUSD; // how many TO per FROM
      const result = amount * rate;
      setConverted(result);
      setLastPrice(rate);
    } catch (e: any) {
      setError(e?.message || String(e));
      setConverted(null);
      setLastPrice(null);
    } finally {
      setLoading(false);
    }
  };

  useInterval(() => {
    if (live) fetchAndCompute();
  }, live ? 10000 : null);

  // trigger an immediate fetch when live is enabled so users see data right away
  useEffect(() => {
    if (live) fetchAndCompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  // recompute when selection changes (if not live)
  useEffect(() => {
    if (!live) fetchAndCompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFrom?.id, selectedTo?.id, amount]);

  // handlers for typeahead with small debounce
  const onFromInput = (q: string) => {
    setFromQuery(q);
    if (fromTimer.current) window.clearTimeout(fromTimer.current);
    fromTimer.current = window.setTimeout(() => {
      // no-op; suggestions read from searchCoins in render
    }, 160);
  };
  const onToInput = (q: string) => {
    setToQuery(q);
    if (toTimer.current) window.clearTimeout(toTimer.current);
    toTimer.current = window.setTimeout(() => {}, 160);
  };

  const fromSuggestions = searchCoins(fromQuery || '');
  const toSuggestions = searchCoins(toQuery || '');

  const displayLabel = (c: Coin | null, fallback?: string) => (c ? `${c.symbol.toUpperCase()} — ${c.symbol.toUpperCase()}` : fallback || '—');

  return (
    <div className="card crypto-converter" aria-live="polite">
      <h4>Crypto converter</h4>

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 8 }}>
        <div style={{ flex: 1 }}>
          <label className="small-muted">From</label>
          <input className="full-width" value={fromQuery} onChange={(e) => onFromInput(e.target.value)} aria-label="search from token" placeholder="Search symbol or name (e.g. USDT, tether)" />
          {fromQuery && fromSuggestions.length > 0 && (
            <ul className="suggestions">
              {fromSuggestions.map((c) => (
                <li key={c.id}>
                  <button className="suggestion-btn" onClick={() => { setSelectedFrom(c); setFromQuery(displayLabel(c)); }}>
                    {c.symbol.toUpperCase()} — {c.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="small-muted" style={{ marginTop: 6 }}>{displayLabel(selectedFrom, DEFAULT_FROM)}</div>
        </div>

        <div style={{ flex: 1 }}>
          <label className="small-muted">To</label>
          <input className="full-width" value={toQuery} onChange={(e) => onToInput(e.target.value)} aria-label="search to token" placeholder="Search symbol or name (e.g. BTC, bitcoin)" />
          {toQuery && toSuggestions.length > 0 && (
            <ul className="suggestions">
              {toSuggestions.map((c) => (
                <li key={c.id}>
                  <button className="suggestion-btn" onClick={() => { setSelectedTo(c); setToQuery(displayLabel(c)); }}>
                    {c.symbol.toUpperCase()} — {c.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="small-muted" style={{ marginTop: 6 }}>{displayLabel(selectedTo, DEFAULT_TO)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
        <input type="number" className="full-width" value={amount} min={0} step="any" onChange={(e) => setAmount(Number(e.target.value))} aria-label="amount" />
        <button className={`btn ${live ? 'btn-danger' : 'btn-primary'}`} onClick={() => setLive((s) => !s)} aria-pressed={live} aria-label="toggle live">
          {live ? 'Stop live' : 'Start live'}
        </button>
        <button className="btn" onClick={fetchAndCompute} disabled={loading} aria-label="convert now">Convert</button>
      </div>

      <div style={{ marginTop: 10 }}>
        {loading && <div className="small-muted">Fetching latest prices…</div>}
        {error && <div style={{ color: 'var(--color-danger)' }}>Error: {error}</div>}
        {converted !== null && (
          <div>
            <div className="muted">Rate</div>
            <div className="value">1 {selectedFrom?.symbol?.toUpperCase() ?? DEFAULT_FROM} ≈ {lastPrice ? lastPrice.toLocaleString(undefined, { maximumFractionDigits: 8 }) : '—'} {selectedTo?.symbol?.toUpperCase() ?? DEFAULT_TO}</div>
            <div className="muted">Converted</div>
            <div className="value">{converted.toLocaleString(undefined, { maximumFractionDigits: 8 })} {selectedTo?.symbol?.toUpperCase() ?? DEFAULT_TO}</div>
            <div className="small-muted">Updated: {new Date().toLocaleTimeString()}</div>
          </div>
        )}
      </div>
    </div>
  );
}
