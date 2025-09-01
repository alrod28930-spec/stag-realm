// LLM Service - Interface for AI chat functionality
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface LLMResponse {
  content: string;
  persona: string;
  relatedEventIds?: string[];
  actionButtons?: LLMActionButton[];
  watchNext?: string;
}

export interface LLMActionButton {
  label: string;
  eventType: string;
  eventData: Record<string, any>;
  variant?: 'default' | 'outline' | 'destructive';
}

export interface LLMPersona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  tone: 'calm' | 'supportive' | 'concise' | 'direct' | 'professional' | 'hybrid';
}

// Available personas
export const ANALYST_PERSONAS: LLMPersona[] = [
  {
    id: 'mythic-stoic',
    name: 'The Stag King',
    description: 'Mythic Stoic - calm, strategic, long-horizon focus',
    systemPrompt: 'You are the Stag King, a mythic stoic advisor. Speak with calm wisdom, strategic patience, and long-term vision. Use metaphors of nature and seasons. Always maintain perfect grammar and clarity.',
    tone: 'calm'
  },
  {
    id: 'warm-mentor',
    name: 'Warm Mentor',
    description: 'Supportive, didactic, emphasizes risk hygiene and learning',
    systemPrompt: 'You are a warm, supportive mentor focused on teaching and risk management. Be encouraging but emphasize learning from both wins and losses. Always prioritize capital preservation.',
    tone: 'supportive'
  },
  {
    id: 'cold-strategist',
    name: 'Cold Strategist',
    description: 'Concise, surgical, highlights edge and constraints',
    systemPrompt: 'You are a cold, analytical strategist. Be concise and surgical in your analysis. Focus on edge, probability, and constraints. No fluff, just actionable insights.',
    tone: 'concise'
  },
  {
    id: 'street-smart',
    name: 'Street Smart',
    description: 'Direct, pragmatic, plain-English reads on momentum/flow',
    systemPrompt: 'You are street smart and pragmatic. Use plain English, focus on momentum and market flow. Be direct and cut through the noise. Speak like a seasoned trader.',
    tone: 'direct'
  },
  {
    id: 'wall-street-smart',
    name: 'Wall Street Smart',
    description: 'Professional, deal/earnings aware, crisp takeaways',
    systemPrompt: 'You are a Wall Street professional with deep knowledge of deals, earnings, and institutional flows. Provide crisp, professional analysis with clear takeaways.',
    tone: 'professional'
  },
  {
    id: 'hybrid',
    name: 'Hybrid (Street x Wall)',
    description: 'Blends intuition with fundamentals',
    systemPrompt: 'You blend street intuition with Wall Street fundamentals. Balance technical momentum with fundamental analysis. Provide balanced, nuanced perspectives.',
    tone: 'hybrid'
  }
];

export class LLMService {
  private apiKey: string | null = null;
  private currentPersona: LLMPersona = ANALYST_PERSONAS[0];

  constructor() {
    // For now, we'll use a mock implementation
    // Later this can be replaced with OpenAI, Anthropic, or other LLM providers
  }

  setPersona(personaId: string) {
    const persona = ANALYST_PERSONAS.find(p => p.id === personaId);
    if (persona) {
      this.currentPersona = persona;
    }
  }

  getCurrentPersona(): LLMPersona {
    return this.currentPersona;
  }

  async generateResponse(
    userQuery: string,
    context: {
      portfolioData?: any;
      recentEvents?: any[];
      bidData?: any;
      recorderData?: any[];
    }
  ): Promise<LLMResponse> {
    // Mock implementation - replace with actual LLM API call
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockResponse = this.generateMockResponse(userQuery, context);
        resolve(mockResponse);
      }, 1000 + Math.random() * 2000); // Simulate API latency
    });
  }

  private generateMockResponse(userQuery: string, context: any): LLMResponse {
    const persona = this.currentPersona;
    
    // Analyze query type
    const isExplainQuery = /explain|what is|tell me about/i.test(userQuery);
    const isDiagnoseQuery = /why|diagnose|what happened/i.test(userQuery);
    const isTeachQuery = /teach|lesson|learn/i.test(userQuery);
    const isCompareQuery = /compare|contrast|vs/i.test(userQuery);

    let content = '';
    let actionButtons: LLMActionButton[] = [];
    let watchNext = '';

    if (isExplainQuery) {
      content = this.generateExplanation(userQuery, persona, context);
      actionButtons = [
        {
          label: 'Refresh Portfolio',
          eventType: 'portfolio.refresh.request',
          eventData: {},
          variant: 'outline'
        }
      ];
      watchNext = 'Monitor position sizing and risk metrics';
    } else if (isDiagnoseQuery) {
      content = this.generateDiagnosis(userQuery, persona, context);
      actionButtons = [
        {
          label: 'Review Risk Settings',
          eventType: 'risk.review.request',
          eventData: {},
          variant: 'outline'
        }
      ];
      watchNext = 'Check for similar patterns in future trades';
    } else if (isTeachQuery) {
      content = this.generateLesson(userQuery, persona, context);
      watchNext = 'Apply these lessons to future decision-making';
    } else if (isCompareQuery) {
      content = this.generateComparison(userQuery, persona, context);
      watchNext = 'Track execution consistency going forward';
    } else {
      content = this.generateGenericResponse(userQuery, persona, context);
      actionButtons = [
        {
          label: 'View Portfolio',
          eventType: 'navigation.portfolio',
          eventData: {},
          variant: 'default'
        }
      ];
      watchNext = 'Monitor market conditions and portfolio balance';
    }

    return {
      content,
      persona: persona.name,
      actionButtons,
      watchNext
    };
  }

  private generateExplanation(query: string, persona: LLMPersona, context: any): string {
    const symbolMatch = query.match(/[A-Z]{2,5}/);
    const symbol = symbolMatch ? symbolMatch[0] : 'AAPL';

    switch (persona.tone) {
      case 'calm':
        return `**${symbol} Position Analysis**\n\n1. **Current Position**: Long 100 shares at $170 average cost\n2. **Performance**: +$550 unrealized (+3.2%), strong momentum\n3. **Recent Activity**: Added position after earnings beat\n4. **Risk Assessment**: Within 5% portfolio allocation limit\n5. **Strategic View**: Solid foundation stock, seasonal strength ahead\n\n*Like the oak that bends but doesn't break, this position weathers market storms while growing steadily toward the light.*`;
      
      case 'supportive':
        return `**Understanding Your ${symbol} Position**\n\n1. **Position Details**: You own 100 shares with an average cost of $170\n2. **Current Performance**: Up $550 (+3.2%) - nice work!\n3. **Recent Decisions**: Smart add after strong earnings\n4. **Risk Check**: Position size is healthy at 5% of portfolio\n5. **Learning Opportunity**: This shows the value of conviction after research\n\n*Remember, good positions like this take time to compound. Stay patient and stick to your plan.*`;
      
      case 'concise':
        return `**${symbol} Analysis**\n\n1. **Position**: 100 shares @ $170 avg\n2. **P&L**: +$550 (+3.2%)\n3. **Catalyst**: Earnings beat drove entry\n4. **Risk**: 5% allocation, within limits\n5. **Edge**: Momentum + fundamentals aligned\n\n*Clean setup, proper sizing, thesis playing out.*`;
      
      case 'direct':
        return `**${symbol} Breakdown**\n\n1. **What you got**: 100 shares at $170 average\n2. **How it's doing**: Up $550, solid +3.2%\n3. **Why we're in**: Jumped in after they crushed earnings\n4. **Risk level**: 5% of the book, not sweating it\n5. **The play**: Riding the momentum, fundamentals backing it up\n\n*This one's cooking. Let it run but watch for any cracks.*`;
      
      case 'professional':
        return `**${symbol} Portfolio Analysis**\n\n1. **Holdings**: 100 shares, $170 average entry price\n2. **Performance Metrics**: +$550 unrealized (+3.2% return)\n3. **Entry Catalyst**: Post-earnings momentum following beat/raise\n4. **Risk Parameters**: 5% portfolio weight, within allocation guidelines\n5. **Forward View**: Strong institutional support, bullish analyst revisions\n\n*Position aligns with our quality growth mandate. Earnings trajectory supports current valuation.*`;
      
      default:
        return `**${symbol} Position Review**\n\n1. **Current Holdings**: 100 shares at $170 average cost basis\n2. **Performance**: +$550 unrealized gain (+3.2% return)\n3. **Entry Logic**: Technical momentum post-earnings combined with fundamental strength\n4. **Risk Management**: 5% portfolio allocation, within risk parameters\n5. **Outlook**: Bullish momentum intact, fundamentals supporting price action\n\n*This position demonstrates the power of combining technical entry timing with fundamental conviction.*`;
    }
  }

  private generateDiagnosis(query: string, persona: LLMPersona, context: any): string {
    switch (persona.tone) {
      case 'calm':
        return `**Trade Diagnosis: TSLA Exit**\n\n1. **Original Thesis**: EV leadership, production scaling\n2. **Exit Trigger**: Monarch detected 15% drawdown threshold\n3. **Market Context**: Sector rotation from growth to value\n4. **Timing**: Exit at $210, avoiding further decline to $195\n5. **Outcome**: Protected capital, saved additional 7% loss\n6. **Lesson**: Risk management preserved capital for better opportunities\n\n*Sometimes the wise general retreats to fight another day. Our discipline saved us from deeper wounds.*`;
      
      case 'supportive':
        return `**Learning from the TSLA Exit**\n\n1. **Your Plan**: Bought TSLA for EV growth story at $220\n2. **What Changed**: Market shifted focus to profitability over growth\n3. **Safety Net**: Monarch stopped us out at $210 (-4.5%)\n4. **Market Action**: Stock continued down to $195 after we exited\n5. **Result**: Risk management saved you from a -11% loss\n6. **Key Learning**: Stop losses aren't failures, they're protection\n\n*Great job having risk controls in place! This is exactly how you preserve capital for better opportunities.*`;
      
      case 'concise':
        return `**TSLA Exit Analysis**\n\n1. **Entry**: $220, EV growth thesis\n2. **Exit**: $210, Monarch stop triggered\n3. **Catalyst**: Sector rotation, margin pressure\n4. **Avoided**: Further decline to $195\n5. **Saved**: 7% additional loss\n6. **Verdict**: Risk management worked\n\n*Clean exit. Controls did their job.*`;
      
      default:
        return `**TSLA Exit Post-Mortem**\n\n1. **Trade Setup**: Long TSLA at $220, betting on EV expansion\n2. **Exit Mechanism**: Monarch triggered stop at $210 (-4.5%)\n3. **Market Shift**: Growth selloff, margin compression fears\n4. **Counterfactual**: Stock fell to $195 without stop (-11% total)\n5. **Protection**: Risk management prevented 7% additional loss\n6. **Takeaway**: Systematic risk controls outperform emotional decisions\n\n*This demonstrates why we never override risk management. Capital preservation enables future opportunities.*`;
    }
  }

  private generateLesson(query: string, persona: LLMPersona, context: any): string {
    return `**Today's Three Key Lessons**\n\n**Lesson 1: Position Sizing Discipline**\nKept all new positions under 5% allocation. This prevented any single trade from materially impacting portfolio performance.\n\n**Lesson 2: Risk Management Effectiveness**\nMonarch's stop-loss on TSLA saved 7% additional loss. Systematic risk controls outperform emotional decisions.\n\n**Lesson 3: Market Timing vs. Time in Market**\nAAPL position added after earnings beat has generated consistent returns through patience rather than trading frequency.\n\n*These lessons reinforce our core principles: size appropriately, manage risk systematically, and let winning positions compound.*`;
  }

  private generateComparison(query: string, persona: LLMPersona, context: any): string {
    return `**Plan vs. Execution Comparison**\n\n**Yesterday's Plan:**\n• Target 3 new positions in tech/healthcare\n• Maintain 10% cash buffer\n• Focus on post-earnings momentum\n\n**Today's Execution:**\n• Added 2 positions (AAPL, NVDA) - good discipline\n• Cash at 12% - slightly conservative but acceptable\n• Both picks post-earnings - strategy executed correctly\n\n**Variance Analysis:**\n• Slightly under-deployed but within risk parameters\n• Good execution on quality over quantity\n• Risk controls properly applied\n\n*Execution aligned well with plan. Conservative bias appropriate in current market.*`;
  }

  private generateGenericResponse(query: string, persona: LLMPersona, context: any): string {
    return `**Portfolio Overview**\n\n**Current Status:**\n• Total Equity: $125,750 (+2.1% today)\n• Available Cash: $15,250 (12% allocation)\n• Open Positions: 8 holdings\n• Risk Level: Moderate\n\n**Key Metrics:**\n• Largest Position: AAPL (5.2% allocation)\n• Sector Allocation: Tech 35%, Healthcare 20%, Finance 15%\n• Day's P&L: +$2,650\n• Week's Performance: +5.8%\n\n*Portfolio is well-balanced with appropriate risk management. All positions within allocation limits.*`;
  }
}

export const llmService = new LLMService();