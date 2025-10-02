-- Seed temp 1m bars for AAPL (last 2 days) so charts render immediately
INSERT INTO candles(workspace_id, symbol, tf, ts, o, h, l, c, v, vwap)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid, 
  'AAPL', 
  '1m',
  (now() - make_interval(mins=>i)),
  180 + random() * 5,
  181 + random() * 5,
  179 + random() * 5,
  180 + random() * 5,
  1000 + floor(random() * 500),
  180 + random() * 5
FROM generate_series(0, 2*24*60) g(i);

-- Seed 1D bars for AAPL (last year)
INSERT INTO candles(workspace_id, symbol, tf, ts, o, h, l, c, v, vwap)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid, 
  'AAPL', 
  '1D',
  (now() - make_interval(days=>i)),
  180 + random() * 10,
  185 + random() * 10,
  175 + random() * 10,
  180 + random() * 10,
  50000000 + floor(random() * 10000000),
  180 + random() * 10
FROM generate_series(0, 365) g(i);

-- Seed QQQ, META, SPY with 1D data too
INSERT INTO candles(workspace_id, symbol, tf, ts, o, h, l, c, v, vwap)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid, 
  sym, 
  '1D',
  (now() - make_interval(days=>i)),
  base + random() * 10,
  base + 5 + random() * 10,
  base - 5 + random() * 10,
  base + random() * 10,
  30000000 + floor(random() * 20000000),
  base + random() * 10
FROM generate_series(0, 180) g(i),
     (VALUES ('QQQ', 380), ('META', 520), ('SPY', 450)) AS t(sym, base);