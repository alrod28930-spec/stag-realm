// Analyst Assets - UI Logic Pack (Glossaries, Templates, Tone Packs)

// F) Analyst Knowledge Assets (not "truth" data)

export interface Glossary {
  category: string;
  terms: GlossaryTerm[];
}

export interface GlossaryTerm {
  term: string;
  definition: string;
  context?: string;
  related_terms?: string[];
}

export interface ExplanationTemplate {
  id: string;
  name: string;
  category: string;
  template: string;
  variables: string[];
  example?: string;
}

export interface TonePack {
  name: string;
  description: string;
  disclaimers: string[];
  response_style: {
    formality: 'casual' | 'professional' | 'academic';
    confidence: 'humble' | 'balanced' | 'assertive';
    detail_level: 'concise' | 'detailed' | 'comprehensive';
  };
  common_phrases: string[];
}

export interface ChartRecipe {
  id: string;
  name: string;
  description: string;
  chart_type: 'candlestick' | 'line' | 'bar' | 'heatmap' | 'treemap' | 'dial';
  data_requirements: string[];
  config: any; // Chart-specific configuration
}

class AnalystAssets {
  private glossaries: Glossary[];
  private explanationTemplates: ExplanationTemplate[];
  private tonePacks: TonePack[];
  private chartRecipes: ChartRecipe[];

  constructor() {
    this.initializeGlossaries();
    this.initializeTemplates();
    this.initializeTonePacks();
    this.initializeChartRecipes();
  }

  // 12) Glossaries & Vocabulary Packs
  private initializeGlossaries(): void {
    this.glossaries = [
      {
        category: 'General Market',
        terms: [
          {
            term: 'Alpha',
            definition: 'Excess return of an investment relative to the return of a benchmark index',
            context: 'Performance measurement',
            related_terms: ['Beta', 'Benchmark', 'Outperformance']
          },
          {
            term: 'Beta',
            definition: 'Measure of volatility relative to the overall market (usually S&P 500). Beta of 1.0 = market volatility',
            context: 'Risk measurement',
            related_terms: ['Alpha', 'Correlation', 'Systematic Risk']
          },
          {
            term: 'Basis Points',
            definition: 'Unit of measure equal to 1/100th of 1% (0.01%). Used for interest rates and yields',
            context: 'Rate changes',
            related_terms: ['Yield', 'Interest Rate', 'Fed Funds']
          },
          {
            term: 'Liquidity',
            definition: 'How easily an asset can be bought or sold without affecting its price',
            context: 'Market structure',
            related_terms: ['Bid-Ask Spread', 'Volume', 'Market Depth']
          },
          {
            term: 'Slippage',
            definition: 'Difference between expected price and actual execution price of a trade',
            context: 'Trade execution',
            related_terms: ['Market Impact', 'Liquidity', 'Order Types']
          },
          {
            term: 'Spread',
            definition: 'Difference between bid (buy) and ask (sell) prices. Narrower spreads indicate better liquidity',
            context: 'Market microstructure',
            related_terms: ['Liquidity', 'Market Maker', 'Execution Quality']
          },
          {
            term: 'Drawdown',
            definition: 'Peak-to-trough decline in portfolio value, expressed as percentage',
            context: 'Risk measurement',
            related_terms: ['Maximum Drawdown', 'Recovery Time', 'Risk Management']
          },
          {
            term: 'Risk Parity',
            definition: 'Portfolio construction approach where each asset contributes equally to overall portfolio risk',
            context: 'Portfolio construction',
            related_terms: ['Volatility Weighting', 'Equal Risk Contribution', 'Diversification']
          },
          {
            term: 'Correlation',
            definition: 'Statistical measure of how two assets move in relation to each other (-1 to +1)',
            context: 'Portfolio diversification',
            related_terms: ['Covariance', 'Diversification', 'Risk Reduction']
          },
          {
            term: 'Covariance',
            definition: 'Measure of how two variables change together. Positive = move together, negative = move oppositely',
            context: 'Portfolio theory',
            related_terms: ['Correlation', 'Portfolio Variance', 'Modern Portfolio Theory']
          }
        ]
      },
      {
        category: 'Events & Geopolitical',
        terms: [
          {
            term: 'Hawkish',
            definition: 'Central bank policy stance favoring higher interest rates to combat inflation',
            context: 'Monetary policy',
            related_terms: ['Dovish', 'Fed Policy', 'Interest Rates', 'Inflation']
          },
          {
            term: 'Dovish',
            definition: 'Central bank policy stance favoring lower interest rates to stimulate economic growth',
            context: 'Monetary policy',
            related_terms: ['Hawkish', 'Accommodation', 'Economic Stimulus']
          },
          {
            term: 'Sanctions',
            definition: 'Economic penalties imposed by countries to influence political behavior',
            context: 'Geopolitical risk',
            related_terms: ['Export Controls', 'Economic Warfare', 'Trade War']
          },
          {
            term: 'Export Controls',
            definition: 'Government restrictions on export of certain goods, services, or technology',
            context: 'Trade policy',
            related_terms: ['Sanctions', 'National Security', 'Technology Transfer']
          },
          {
            term: 'OPEC+ Quota',
            definition: 'Production limits set by OPEC and allied countries to influence oil prices',
            context: 'Energy markets',
            related_terms: ['Oil Prices', 'Supply Management', 'Cartel Behavior']
          },
          {
            term: 'Fiscal Impulse',
            definition: 'Change in government spending and taxation that affects economic activity',
            context: 'Government policy',
            related_terms: ['Fiscal Policy', 'Government Spending', 'Economic Stimulus']
          },
          {
            term: 'QT/QE',
            definition: 'Quantitative Tightening/Easing - Central bank balance sheet expansion (QE) or contraction (QT)',
            context: 'Monetary policy tools',
            related_terms: ['Balance Sheet', 'Asset Purchases', 'Liquidity']
          },
          {
            term: 'Soft Landing',
            definition: 'Economic scenario where growth slows without triggering a recession',
            context: 'Economic cycles',
            related_terms: ['Hard Landing', 'Recession', 'Economic Cycle']
          },
          {
            term: 'Risk-On/Risk-Off',
            definition: 'Market sentiment toward risk assets. Risk-on = buying stocks/commodities, Risk-off = buying bonds/safe havens',
            context: 'Market sentiment',
            related_terms: ['Safe Haven', 'Flight to Quality', 'Risk Appetite']
          }
        ]
      },
      {
        category: 'Risk & Metrics',
        terms: [
          {
            term: 'VaR',
            definition: 'Value at Risk - Maximum expected loss over specific time period at given confidence level',
            context: 'Risk measurement',
            related_terms: ['Expected Shortfall', 'Confidence Interval', 'Risk Management']
          },
          {
            term: 'ES/CVaR',
            definition: 'Expected Shortfall/Conditional VaR - Expected loss beyond the VaR threshold',
            context: 'Tail risk measurement',
            related_terms: ['VaR', 'Tail Risk', 'Extreme Losses']
          },
          {
            term: 'Sharpe Ratio',
            definition: 'Risk-adjusted return measure: (Return - Risk-free rate) / Standard deviation',
            context: 'Performance evaluation',
            related_terms: ['Sortino Ratio', 'Risk-Adjusted Return', 'Volatility']
          },
          {
            term: 'Sortino Ratio',
            definition: 'Like Sharpe ratio but only penalizes downside volatility, not upside',
            context: 'Performance evaluation',
            related_terms: ['Sharpe Ratio', 'Downside Risk', 'Asymmetric Risk']
          },
          {
            term: 'Maximum Drawdown',
            definition: 'Largest peak-to-trough decline in portfolio value over any period',
            context: 'Risk measurement',
            related_terms: ['Drawdown', 'Recovery Time', 'Risk Capacity']
          },
          {
            term: 'Exposure',
            definition: 'Amount of money at risk in a particular investment, sector, or market',
            context: 'Position sizing',
            related_terms: ['Position Size', 'Concentration Risk', 'Diversification']
          },
          {
            term: 'Concentration',
            definition: 'Degree to which portfolio is focused on specific securities, sectors, or strategies',
            context: 'Portfolio construction',
            related_terms: ['Diversification', 'Single Name Risk', 'Sector Risk']
          },
          {
            term: 'Notional vs Delta Exposure',
            definition: 'Notional = face value of position. Delta = sensitivity to underlying price changes',
            context: 'Derivatives risk',
            related_terms: ['Options', 'Leverage', 'Greeks']
          }
        ]
      }
    ];
  }

  // 13) Explanation Templates & Snippets
  private initializeTemplates(): void {
    this.explanationTemplates = [
      {
        id: 'explain_position',
        name: 'Position Explanation',
        category: 'portfolio',
        template: \`
**{symbol} Position Analysis:**

• **Current Status**: {quantity} shares at {avg_price} average cost ({current_value} current value)
• **Performance**: {unrealized_pnl} unrealized P&L ({pnl_percent}% from cost basis)
• **Risk Profile**: Beta {beta} vs market, {sector} sector exposure  
• **Technical Context**: {technical_summary}
• **Risk Consideration**: {risk_summary}

*This is informational analysis, not investment advice.*
        \`,
        variables: ['symbol', 'quantity', 'avg_price', 'current_value', 'unrealized_pnl', 'pnl_percent', 'beta', 'sector', 'technical_summary', 'risk_summary'],
        example: 'AAPL position explanation with current metrics'
      },
      {
        id: 'post_trade_debrief',
        name: 'Post-Trade Debrief',
        category: 'execution',
        template: \`
**Trade Debrief: {symbol}**

• **Execution**: {side} {quantity} shares at {execution_price} (vs expected {target_price})
• **Entry Reasoning**: {entry_thesis}
• **Market Context**: {market_conditions}
• **Slippage Analysis**: {slippage_amount} ({slippage_percent}% of expected)
• **Risk Management**: Stop loss at {stop_price}, position size {position_percent}% of portfolio
• **Lessons Learned**: {lessons}

*All decisions logged for learning and compliance.*
        \`,
        variables: ['symbol', 'side', 'quantity', 'execution_price', 'target_price', 'entry_thesis', 'market_conditions', 'slippage_amount', 'slippage_percent', 'stop_price', 'position_percent', 'lessons'],
        example: 'Post-execution analysis of TSLA buy order'
      },
      {
        id: 'daily_lessons',
        name: 'Daily Lessons',
        category: 'learning',
        template: `
**Daily Trading Lessons ({date}):**

• **What Worked**: {positive_outcomes}
• **What Didn't**: {negative_outcomes}  
• **Market Insight**: {market_lesson}

*Continuous learning improves future decision-making.*
        `,
        variables: ['date', 'positive_outcomes', 'negative_outcomes', 'market_lesson'],
        example: 'End-of-day learning summary'
      },
      {
        id: 'why_it_moved',
        name: 'Price Movement Analysis',
        category: 'market_analysis',
        template: `
**Why {symbol} moved {direction} {percentage}%:**

• **Primary Driver**: {main_catalyst}
• **Supporting Factors**: {secondary_factors}
• **Technical Context**: {technical_context}
• **Volume Analysis**: {volume_context}
• **Sector Impact**: {sector_context}
• **News Headlines**: {relevant_news}

*Analysis based on available market data and news sources.*
        `,
        variables: ['symbol', 'direction', 'percentage', 'main_catalyst', 'secondary_factors', 'technical_context', 'volume_context', 'sector_context', 'relevant_news'],
        example: 'NVDA +8% move analysis'
      },
      {
        id: 'risk_assessment',
        name: 'Risk Assessment',
        category: 'risk',
        template: `
**Portfolio Risk Assessment:**

• **Current Risk State**: {risk_level}/100 ({risk_description})
• **Key Risks**: {primary_risks}
• **Concentration**: Largest position {largest_position} ({concentration_percent}%)
• **Drawdown Status**: {current_drawdown}% from peak
• **Recommended Actions**: {risk_recommendations}

*Risk metrics updated every minute during market hours.*
        `,
        variables: ['risk_level', 'risk_description', 'primary_risks', 'largest_position', 'concentration_percent', 'current_drawdown', 'risk_recommendations'],
        example: 'Current portfolio risk analysis'
      },
      {
        id: 'market_outlook',
        name: 'Market Outlook',
        category: 'analysis',
        template: `
**Market Outlook ({timeframe}):**

• **Market Regime**: {market_regime}
• **Key Themes**: {dominant_themes}
• **Risk Factors**: {risk_factors}
• **Opportunities**: {potential_opportunities}
• **Watch List**: {symbols_to_watch}

*Outlook based on current data and may change rapidly.*
        `,
        variables: ['timeframe', 'market_regime', 'dominant_themes', 'risk_factors', 'potential_opportunities', 'symbols_to_watch'],
        example: 'Weekly market outlook summary'
      }
    ];
  }

  // Tone Packs for different personas
  private initializeTonePacks(): void {
    this.tonePacks = [
      {
        name: 'Professional Advisor',
        description: 'Balanced, professional tone with appropriate disclaimers',
        disclaimers: [
          'This analysis is for informational purposes only and should not be considered investment advice.',
          'Past performance does not guarantee future results.',
          'All investments carry risk of loss.',
          'Please consult with a qualified financial advisor before making investment decisions.'
        ],
        response_style: {
          formality: 'professional',
          confidence: 'balanced',
          detail_level: 'detailed'
        },
        common_phrases: [
          'Based on current market data...',
          'It appears that...',
          'Consider the following factors...',
          'Risk management suggests...',
          'From a technical perspective...',
          'The data indicates...'
        ]
      },
      {
        name: 'Quantitative Analyst',
        description: 'Data-driven, technical analysis focused',
        disclaimers: [
          'Analysis based on quantitative models and historical data.',
          'Model outputs are probabilistic, not predictive.',
          'Market conditions can change rapidly, affecting model validity.',
          'This is analytical output, not investment recommendations.'
        ],
        response_style: {
          formality: 'academic',
          confidence: 'humble',
          detail_level: 'comprehensive'
        },
        common_phrases: [
          'The model indicates...',
          'Statistical analysis shows...',
          'Based on historical patterns...',
          'Probability analysis suggests...',
          'The data distribution shows...',
          'Correlation analysis reveals...'
        ]
      },
      {
        name: 'Risk Manager',
        description: 'Conservative, risk-focused perspective',
        disclaimers: [
          'Risk assessment based on current portfolio composition.',
          'Market volatility can exceed historical norms.',
          'Risk metrics are estimates and may not capture all risks.',
          'Consider your risk tolerance and investment objectives.'
        ],
        response_style: {
          formality: 'professional',
          confidence: 'balanced',
          detail_level: 'detailed'
        },
        common_phrases: [
          'From a risk perspective...',
          'Consider the potential downside...',
          'Risk metrics suggest...',
          'Concentration analysis shows...',
          'Stress testing indicates...',
          'Prudent risk management would...'
        ]
      },
      {
        name: 'Market Commentator',
        description: 'Engaging, educational market commentary',
        disclaimers: [
          'Commentary based on current market conditions and news.',
          'Markets are unpredictable and commentary may prove incorrect.',
          'This is educational content, not personalized advice.',
          'Always do your own research before investing.'
        ],
        response_style: {
          formality: 'casual',
          confidence: 'balanced',
          detail_level: 'concise'
        },
        common_phrases: [
          "Here's what's happening...",
          'The market is telling us...',
          'Interesting to note...',
          'Keep an eye on...',
          'The story behind this move...',
          'What this means for...'
        ]
      }
    ];
  }

  // 14) Chart Recipes (UI-specs)
  private initializeChartRecipes(): void {
    this.chartRecipes = [
      {
        id: 'candlestick_ma',
        name: 'Candlestick with Moving Averages',
        description: 'Standard price chart with 20/50/200 day moving averages',
        chart_type: 'candlestick',
        data_requirements: ['candles', 'ma20', 'ma50', 'ma200'],
        config: {
          timeframe: 'D1',
          period: 90,
          overlays: ['ma20', 'ma50', 'ma200'],
          volume: true,
          colors: {
            ma20: '#FFD700',
            ma50: '#FF6B35', 
            ma200: '#4ECDC4'
          }
        }
      },
      {
        id: 'bollinger_bands',
        name: 'Candlestick with Bollinger Bands',
        description: 'Price chart with Bollinger Bands (20-period, 2 std dev)',
        chart_type: 'candlestick',
        data_requirements: ['candles', 'bb_up', 'bb_dn', 'ma20'],
        config: {
          timeframe: 'D1',
          period: 60,
          overlays: ['bollinger_bands'],
          fill_bands: true,
          opacity: 0.1
        }
      },
      {
        id: 'rsi_indicator',
        name: 'RSI Oscillator',
        description: 'Relative Strength Index with overbought/oversold levels',
        chart_type: 'line',
        data_requirements: ['rsi14'],
        config: {
          y_axis: { min: 0, max: 100 },
          horizontal_lines: [30, 70],
          color_zones: [
            { range: [0, 30], color: '#ff4757', label: 'Oversold' },
            { range: [70, 100], color: '#ff4757', label: 'Overbought' }
          ]
        }
      },
      {
        id: 'volume_vwap',
        name: 'Volume with VWAP',
        description: 'Volume bars with Volume Weighted Average Price',
        chart_type: 'bar',
        data_requirements: ['volume', 'vwap'],
        config: {
          primary: 'volume',
          overlay: 'vwap',
          volume_ma: 20
        }
      },
      {
        id: 'sector_heatmap',
        name: 'Sector Performance Heatmap',
        description: 'Sector performance visualization',
        chart_type: 'heatmap',
        data_requirements: ['sector_performance'],
        config: {
          color_scale: ['#ff4757', '#ff6b6b', '#feca57', '#48ca8c', '#26de81'],
          labels: true,
          size_by: 'market_cap'
        }
      },
      {
        id: 'risk_dial',
        name: 'Portfolio Risk Gauge',
        description: 'Risk state visualization as gauge/dial',
        chart_type: 'dial',
        data_requirements: ['risk_state'],
        config: {
          min: 0,
          max: 100,
          zones: [
            { range: [0, 30], color: '#26de81', label: 'Low Risk' },
            { range: [30, 70], color: '#feca57', label: 'Medium Risk' },
            { range: [70, 100], color: '#ff4757', label: 'High Risk' }
          ]
        }
      },
      {
        id: 'exposure_treemap',
        name: 'Position Exposure Treemap',
        description: 'Portfolio positions sized by market value',
        chart_type: 'treemap',
        data_requirements: ['positions', 'market_values', 'pnl'],
        config: {
          size_by: 'market_value',
          color_by: 'unrealized_pnl',
          labels: ['symbol', 'percentage'],
          color_scale: ['#ff4757', '#ffa726', '#66bb6a']
        }
      }
    ];
  }

  // Public API for accessing assets
  public getGlossary(category?: string): Glossary[] {
    if (category) {
      return this.glossaries.filter(g => g.category.toLowerCase().includes(category.toLowerCase()));
    }
    return this.glossaries;
  }

  public getGlossaryTerm(term: string): GlossaryTerm | null {
    for (const glossary of this.glossaries) {
      const found = glossary.terms.find(t => t.term.toLowerCase() === term.toLowerCase());
      if (found) return found;
    }
    return null;
  }

  public getExplanationTemplate(id: string): ExplanationTemplate | null {
    return this.explanationTemplates.find(t => t.id === id) || null;
  }

  public getTemplatesByCategory(category: string): ExplanationTemplate[] {
    return this.explanationTemplates.filter(t => t.category === category);
  }

  public getAllTemplates(): ExplanationTemplate[] {
    return this.explanationTemplates;
  }

  public getTonePack(name: string): TonePack | null {
    return this.tonePacks.find(tp => tp.name === name) || null;
  }

  public getAllTonePacks(): TonePack[] {
    return this.tonePacks;
  }

  public getChartRecipe(id: string): ChartRecipe | null {
    return this.chartRecipes.find(cr => cr.id === id) || null;
  }

  public getChartRecipesByType(chartType: string): ChartRecipe[] {
    return this.chartRecipes.filter(cr => cr.chart_type === chartType);
  }

  public getAllChartRecipes(): ChartRecipe[] {
    return this.chartRecipes;
  }

  // Template rendering utility
  public renderTemplate(templateId: string, variables: Record<string, any>): string {
    const template = this.getExplanationTemplate(templateId);
    if (!template) return '';

    let rendered = template.template;
    
    // Replace variables in template
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      rendered = rendered.replace(regex, String(value));
    });

    return rendered;
  }

  // Get appropriate disclaimers for tone
  public getDisclaimers(tonePack: string): string[] {
    const pack = this.getTonePack(tonePack);
    return pack ? pack.disclaimers : this.tonePacks[0].disclaimers;
  }

  // Get style guide for responses
  public getResponseStyle(tonePack: string): TonePack['response_style'] {
    const pack = this.getTonePack(tonePack);
    return pack ? pack.response_style : this.tonePacks[0].response_style;
  }

  // Search functionality
  public searchGlossary(query: string): GlossaryTerm[] {
    const results: GlossaryTerm[] = [];
    const searchTerm = query.toLowerCase();

    this.glossaries.forEach(glossary => {
      glossary.terms.forEach(term => {
        if (
          term.term.toLowerCase().includes(searchTerm) ||
          term.definition.toLowerCase().includes(searchTerm) ||
          term.context?.toLowerCase().includes(searchTerm)
        ) {
          results.push(term);
        }
      });
    });

    return results;
  }

  public searchTemplates(query: string): ExplanationTemplate[] {
    const searchTerm = query.toLowerCase();
    return this.explanationTemplates.filter(template =>
      template.name.toLowerCase().includes(searchTerm) ||
      template.category.toLowerCase().includes(searchTerm) ||
      template.template.toLowerCase().includes(searchTerm)
    );
  }
}

// Export singleton instance
export const analystAssets = new AnalystAssets();