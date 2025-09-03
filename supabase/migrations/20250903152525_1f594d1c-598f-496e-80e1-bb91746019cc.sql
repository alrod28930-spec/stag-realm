-- Add RPC function for semantic search
CREATE OR REPLACE FUNCTION match_kb_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  created_at timestamptz,
  similarity float,
  document jsonb
) LANGUAGE sql STABLE AS $$
  SELECT 
    c.id,
    c.document_id,
    c.content,
    c.metadata,
    c.created_at,
    1 - (e.embedding <=> query_embedding) as similarity,
    to_jsonb(d.*) || jsonb_build_object('source', to_jsonb(s.*)) as document
  FROM kb_chunks c
  JOIN kb_embeddings e ON c.id = e.chunk_id
  JOIN kb_documents d ON c.document_id = d.id
  JOIN kb_sources s ON d.source_id = s.id
  WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Seed more content for the knowledge base

-- Insert strategy primers
INSERT INTO kb_documents (source_id, title, doc_type) 
SELECT id, 'Momentum Strategy Guide', 'primer'
FROM kb_sources WHERE name = 'Strategy Primers';

INSERT INTO kb_chunks (document_id, content, metadata)
SELECT d.id, 
'**Momentum Trading Strategy**

Momentum trading capitalizes on the continuation of existing trends in stock prices. The strategy is based on the principle that stocks moving strongly in one direction will continue to move in that direction.

**Key Principles:**
1. **Trend Following**: Enter positions in the direction of the current trend
2. **Volume Confirmation**: Look for increased volume to confirm momentum
3. **Timing**: Enter after momentum is established but before exhaustion
4. **Risk Management**: Use tight stops as momentum can reverse quickly

**Entry Signals:**
- Price breaking above resistance with volume
- RSI above 60 (bullish momentum)
- Moving average crossovers (50 above 200)
- Gap-ups on news or earnings

**Exit Strategies:**
- Momentum exhaustion (decreasing volume, RSI divergence)
- Technical resistance levels
- Predetermined profit targets (2-3x risk)
- Stop losses at recent swing lows

**Risk Considerations:**
- Momentum can reverse quickly
- Higher volatility requires position sizing discipline
- Works best in trending markets, struggles in sideways action',
jsonb_build_object('strategy_type', 'momentum', 'difficulty', 'intermediate')
FROM kb_documents d 
JOIN kb_sources s ON d.source_id = s.id 
WHERE s.name = 'Strategy Primers' AND d.title = 'Momentum Strategy Guide';

-- Insert risk management guide
INSERT INTO kb_documents (source_id, title, doc_type)
SELECT id, 'Position Sizing and Risk Management', 'primer'
FROM kb_sources WHERE name = 'Risk Management Guide';

INSERT INTO kb_chunks (document_id, content, metadata)
SELECT d.id,
'**Position Sizing: The Foundation of Risk Management**

Position sizing determines HOW MUCH to risk per trade, not WHICH trades to take. It is the single most important factor in long-term trading success.

**The 1% Rule:**
Never risk more than 1% of your account on any single trade. This means:
- $10,000 account = $100 maximum risk per trade
- $50,000 account = $500 maximum risk per trade

**Position Size Formula:**
Position Size = (Account Size × Risk %) / Stop Distance

**Example:**
- Account: $10,000
- Risk: 1% = $100
- Entry: $50, Stop: $48 (Distance = $2)
- Position Size: $100 / $2 = 50 shares maximum

**ATR-Based Position Sizing:**
Use Average True Range for volatility-adjusted sizing:
- Low volatility stocks: Smaller stop distance, larger position
- High volatility stocks: Larger stop distance, smaller position

**Portfolio Heat:**
Total risk across all open positions should not exceed 5-6% of account value.

**The Paradox:**
Smaller position sizes often lead to LARGER profits because:
1. You can hold through normal volatility
2. Emotions remain controlled
3. You avoid devastating losses
4. Capital is preserved for better opportunities',
jsonb_build_object('topic', 'risk_management', 'importance', 'critical')
FROM kb_documents d 
JOIN kb_sources s ON d.source_id = s.id 
WHERE s.name = 'Risk Management Guide' AND d.title = 'Position Sizing and Risk Management';

-- Insert regulatory basics
INSERT INTO kb_documents (source_id, title, doc_type)
SELECT id, 'Pattern Day Trader (PDT) Rule Explained', 'reg_summary'
FROM kb_sources WHERE name = 'Regulatory Basics';

INSERT INTO kb_chunks (document_id, content, metadata)
SELECT d.id,
'**Pattern Day Trader (PDT) Rule - FINRA Regulation**

**What is the PDT Rule?**
FINRA Rule 4210 requires any account that makes 4 or more day trades within 5 business days to maintain a minimum of $25,000 in equity.

**What Counts as a Day Trade?**
- Buying and selling the same security on the same trading day
- Selling short and buying to cover the same security on the same day
- This applies to stocks, ETFs, and options

**Examples:**
✅ Day Trade: Buy 100 AAPL at 9:30 AM, sell 100 AAPL at 2:00 PM same day
❌ Not Day Trade: Buy AAPL Monday, sell AAPL Tuesday
❌ Not Day Trade: Buy 100 AAPL, sell 50 AAPL same day (partial position)

**PDT Account Restrictions:**
If flagged as PDT with less than $25,000:
- Can only day trade with settled funds
- Buying power is limited to 2x maintenance margin excess
- Account may be restricted from day trading for 90 days

**Avoiding PDT Issues:**
1. Stay under 3 day trades per 5-day period
2. Maintain $25,000+ if you want to day trade freely
3. Use cash accounts (no margin) to avoid the rule
4. Consider swing trading (hold overnight) instead

**Cash Account Alternative:**
Cash accounts are not subject to PDT rules, but:
- Must wait for settlement (T+2 for stocks)
- No buying power leverage
- Suitable for those with smaller accounts',
jsonb_build_object('regulation', 'finra_4210', 'compliance_level', 'required')
FROM kb_documents d 
JOIN kb_sources s ON d.source_id = s.id 
WHERE s.name = 'Regulatory Basics' AND d.title = 'Pattern Day Trader (PDT) Rule Explained';

-- Insert book summaries
INSERT INTO kb_documents (source_id, title, doc_type)
SELECT id, 'Reminiscences of a Stock Operator - Key Lessons', 'note'
FROM kb_sources WHERE name = 'Book Summaries';

INSERT INTO kb_chunks (document_id, content, metadata)
SELECT d.id,
'**Key Lessons from "Reminiscences of a Stock Operator" by Edwin Lefèvre**

**Jesse Livermore''s Core Principles:**

**1. The Line of Least Resistance**
"Stocks, like water, flow in the direction of least resistance." Trade with the trend, not against it.

**2. Patience is Profitable**
"It was never my thinking that made the big money for me. It was my sitting." The big money is made by sitting through the major moves, not by frequent trading.

**3. Cut Losses Short**
"The first loss is the best loss." Don''t average down on losing positions. Accept small losses to avoid large ones.

**4. Market Psychology Never Changes**
"There is nothing new in Wall Street. There can''t be because speculation is as old as the hills." Human emotions drive markets, and these patterns repeat.

**5. Don''t Fight the Tape**
"The tape tells the real story." Price action reveals what''s really happening, regardless of news or opinions.

**6. Position Sizing**
"I made most of my money by sitting tight and using a small amount of my capital." Risk management through proper position sizing is crucial.

**7. The Danger of Tips**
"Tips are for waiters, not traders." Do your own analysis rather than following others'' advice.

**Modern Application:**
These 100-year-old lessons remain relevant because market psychology and human nature haven''t changed.',
jsonb_build_object('book', 'reminiscences', 'author', 'edwin_lefevre', 'timeless', true)
FROM kb_documents d 
JOIN kb_sources s ON d.source_id = s.id 
WHERE s.name = 'Book Summaries' AND d.title = 'Reminiscences of a Stock Operator - Key Lessons';