-- Knowledge Base Schema for Analyst RAG System

-- Sources registry
CREATE TABLE kb_sources(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,           -- e.g. 'Glossary', 'FRED', 'Strategy Notes'
  url text,
  license text DEFAULT 'public', -- 'public','owned','restricted'
  priority smallint DEFAULT 5,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE kb_sources ENABLE ROW LEVEL SECURITY;

-- Global read access for knowledge base
CREATE POLICY "kb_sources_global_read" ON kb_sources FOR SELECT USING (true);

-- Documents and chunks (for RAG)
CREATE TABLE kb_documents(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES kb_sources(id),
  title text NOT NULL,
  doc_type text,                -- 'glossary','primer','note','reg_summary','macro_series'
  language text DEFAULT 'en',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE kb_documents ENABLE ROW LEVEL SECURITY;

-- Global read access
CREATE POLICY "kb_documents_global_read" ON kb_documents FOR SELECT USING (true);

CREATE TABLE kb_chunks(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES kb_documents(id) ON DELETE CASCADE,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE kb_chunks ENABLE ROW LEVEL SECURITY;

-- Global read access
CREATE POLICY "kb_chunks_global_read" ON kb_chunks FOR SELECT USING (true);

-- Embeddings for retrieval (using vector extension)
CREATE TABLE kb_embeddings(
  chunk_id uuid PRIMARY KEY REFERENCES kb_chunks(id) ON DELETE CASCADE,
  embedding vector(1536), -- size to match OpenAI text-embedding-3-small
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE kb_embeddings ENABLE ROW LEVEL SECURITY;

-- Global read access
CREATE POLICY "kb_embeddings_global_read" ON kb_embeddings FOR SELECT USING (true);

-- Create index for similarity search
CREATE INDEX kb_embeddings_embedding_idx ON kb_embeddings 
USING hnsw (embedding vector_cosine_ops);

-- Glossary (fast lookup)
CREATE TABLE glossary(
  term text PRIMARY KEY,
  definition text NOT NULL,
  examples text,
  see_also text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE glossary ENABLE ROW LEVEL SECURITY;

-- Global read access
CREATE POLICY "glossary_global_read" ON glossary FOR SELECT USING (true);

-- FAQs
CREATE TABLE faqs(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  tags text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- Global read access
CREATE POLICY "faqs_global_read" ON faqs FOR SELECT USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_glossary_updated_at
  BEFORE UPDATE ON glossary
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_faqs_updated_at
  BEFORE UPDATE ON faqs
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Seed initial sources
INSERT INTO kb_sources (name, license, priority) VALUES
('Glossary', 'owned', 10),
('FAQs', 'owned', 9),
('Strategy Primers', 'owned', 8),
('Risk Management Guide', 'owned', 8),
('Regulatory Basics', 'public', 7),
('Macro Context', 'public', 6),
('Market Psychology Notes', 'owned', 5),
('Book Summaries', 'owned', 4);

-- Seed glossary terms
INSERT INTO glossary (term, definition, examples, see_also) VALUES
('ATR', 'Average True Range - A technical indicator measuring volatility by calculating the average of true ranges over a specified period. Higher ATR indicates higher volatility.', 'ATR(14) = 2.50 means average daily range is $2.50. Used for stop-loss placement: stop at entry - (2 × ATR).', ARRAY['Volatility', 'Stop Loss', 'Position Sizing']),

('VWAP', 'Volume Weighted Average Price - The average price at which a security has traded throughout the day, weighted by volume. Institutional benchmark.', 'If VWAP is $100 and current price is $102, stock is trading above average institutional cost basis.', ARRAY['Volume', 'Institutional Flow', 'Benchmark']),

('Slippage', 'The difference between expected price and actual execution price. Occurs due to market movement, liquidity, or order size.', 'Ordered at $50.00, filled at $50.05 = $0.05 slippage. More common in illiquid stocks or large orders.', ARRAY['Liquidity', 'Market Impact', 'Execution']),

('Drawdown', 'Peak-to-trough decline in portfolio value, expressed as percentage. Key risk metric.', 'Portfolio goes from $10,000 to $8,500 = 15% drawdown. Maximum drawdown tracks worst decline.', ARRAY['Risk Management', 'Portfolio Performance', 'Risk Metrics']),

('Sharpe Ratio', 'Risk-adjusted return metric: (Return - Risk-free Rate) / Standard Deviation. Higher is better.', 'Strategy returns 12% with 8% volatility, risk-free rate 3%: Sharpe = (12-3)/8 = 1.125', ARRAY['Risk Metrics', 'Performance', 'Volatility']),

('PDT Rule', 'Pattern Day Trader rule requiring $25,000 minimum for accounts making 4+ day trades in 5 business days.', 'Buy and sell same stock same day = 1 day trade. 4 in rolling 5 days triggers PDT status.', ARRAY['Regulation', 'Day Trading', 'Account Requirements']),

('Leverage', 'Using borrowed capital to amplify potential returns (and losses). Expressed as ratio.', '2:1 leverage with $10,000 = $20,000 buying power. 50% loss on position = 100% account loss.', ARRAY['Risk Management', 'Margin', 'Position Sizing']),

('Liquidity', 'Ease of buying/selling without significantly affecting price. Measured by volume and bid-ask spread.', 'AAPL: high liquidity, tight spreads. Penny stocks: low liquidity, wide spreads, harder to exit.', ARRAY['Volume', 'Bid-Ask Spread', 'Market Impact']),

('RSI', 'Relative Strength Index - Momentum oscillator (0-100) measuring speed/change of price movements.', 'RSI > 70 = potentially overbought. RSI < 30 = potentially oversold. RSI 14-period standard.', ARRAY['Technical Analysis', 'Momentum', 'Overbought', 'Oversold']),

('Stop Loss', 'Pre-determined exit price to limit losses. Can be percentage-based, ATR-based, or technical level.', 'Buy at $100, stop at $95 = 5% stop. ATR stop: entry - (2 × ATR) for volatility-adjusted protection.', ARRAY['Risk Management', 'Exit Strategy', 'ATR']),

('Position Sizing', 'Determining appropriate trade size based on account size, risk tolerance, and stop distance.', '1% risk rule: $10,000 account, $5 stop distance = $100 risk / $5 = 20 shares maximum.', ARRAY['Risk Management', 'Portfolio Management', 'Risk Per Trade']),

('Compounding', 'Earning returns on both principal and previously earned returns. The "eighth wonder of the world."', '10% annual return: $1000 → $1100 → $1210 → $1331. Time and consistency are key factors.', ARRAY['Returns', 'Time Horizon', 'Portfolio Growth']);

-- Seed FAQs
INSERT INTO faqs (question, answer, tags) VALUES
('What is the PDT rule and how does it affect me?', 'The Pattern Day Trader (PDT) rule requires accounts making 4+ day trades in 5 business days to maintain $25,000 minimum equity. A day trade is buying and selling the same security on the same day. If flagged as PDT with less than $25,000, you can only day trade with settled funds and may face restrictions. Plan your trades accordingly and consider swing trading if under the threshold.', ARRAY['regulation', 'day-trading', 'account-management']),

('How should I size my positions?', 'Position sizing should be based on your risk tolerance and stop distance, not your opinion of the trade. A common approach is the 1% rule: risk no more than 1% of your account per trade. Formula: Position Size = (Account Size × Risk %) / Stop Distance. For example, $10,000 account with 1% risk and $2 stop = ($10,000 × 0.01) / $2 = 50 shares maximum.', ARRAY['risk-management', 'position-sizing', 'strategy']),

('What is StagAlgo and how does it work?', 'StagAlgo is an educational trading platform that provides AI-powered market analysis, trade bots, and portfolio management tools. We never hold your funds - all trades are executed through your connected brokerage account. The platform provides signals, risk management, and educational content to help you make informed trading decisions. Remember: this is educational software, not financial advice.', ARRAY['platform', 'education', 'how-it-works']),

('How do the trading bots work?', 'Our bots analyze market data using technical indicators, momentum signals, and risk parameters you configure. When conditions align with a strategy (momentum, breakout, mean reversion), the bot generates a signal. You can run bots in paper trading mode for learning, or connect your brokerage for live execution. Bots follow strict risk rules: position limits, stop losses, daily loss limits, and concentration limits. They are tools to execute systematic strategies, not magic profit machines.', ARRAY['bots', 'strategy', 'automation']),

('What is the difference between day trading and swing trading?', 'Day trading involves buying and selling securities within the same trading day, aiming to profit from short-term price movements. It requires quick decisions, tight risk management, and significant time commitment. Swing trading holds positions for days to weeks, targeting larger price swings with less time intensity. Day trading requires $25,000+ (PDT rule) and higher risk tolerance. Swing trading works with smaller accounts and longer-term thinking.', ARRAY['day-trading', 'swing-trading', 'strategy', 'time-horizon']);