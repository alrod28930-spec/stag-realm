-- Add common symbols to ref_symbols table to prevent foreign key violations
INSERT INTO ref_symbols (symbol, exchange, asset_class, sector, industry) VALUES
('AAPL', 'NASDAQ', 'equity', 'Technology', 'Consumer Electronics'),
('MSFT', 'NASDAQ', 'equity', 'Technology', 'Software'),
('GOOGL', 'NASDAQ', 'equity', 'Technology', 'Internet Services'),
('AMZN', 'NASDAQ', 'equity', 'Consumer Discretionary', 'E-commerce'),
('TSLA', 'NASDAQ', 'equity', 'Consumer Discretionary', 'Electric Vehicles'),
('NVDA', 'NASDAQ', 'equity', 'Technology', 'Semiconductors'),
('META', 'NASDAQ', 'equity', 'Technology', 'Social Media'),
('NFLX', 'NASDAQ', 'equity', 'Communication Services', 'Streaming'),
('SPY', 'NYSE ARCA', 'etf', 'Broad Market', 'S&P 500 ETF'),
('QQQ', 'NASDAQ', 'etf', 'Technology', 'NASDAQ 100 ETF')
ON CONFLICT (symbol) DO NOTHING;