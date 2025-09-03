import { logService } from './logging';
import { eventBus } from './eventBus';
import { bid } from './bid';
import { recorder } from './recorder';
import { llmService, LLMResponse, ANALYST_PERSONAS } from './llm';
import { knowledgeBaseService, RetrievalResult } from './knowledgeBase';

export interface AnalystMessage {
  id: string;
  timestamp: Date;
  type: 'user' | 'analyst' | 'system';
  content: string;
  persona?: string;
  actionButtons?: Array<{
    label: string;
    eventType: string;
    eventData: Record<string, any>;
    variant?: 'default' | 'outline' | 'destructive';
  }>;
  watchNext?: string;
  relatedEventIds?: string[];
  context?: {
    portfolioSnapshot?: any;
    recentEvents?: any[];
  };
}

export interface AnalystSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  messageCount: number;
  persona: string;
  disclaimerShown: boolean;
  topics: string[];
}

class AnalystService {
  private messages: AnalystMessage[] = [];
  private currentSession: AnalystSession | null = null;
  private currentPersona: string = ANALYST_PERSONAS[0].id;

  constructor() {
    this.subscribeToEvents();
  }

  private subscribeToEvents() {
    // Listen for portfolio updates to provide proactive insights
    eventBus.on('portfolio.updated', (data) => {
      this.handlePortfolioUpdate(data);
    });

    // Listen for trade executions to provide post-trade analysis
    eventBus.on('trade.executed', (data) => {
      this.handleTradeExecution(data);
    });

    // Listen for risk events to provide alerts
    eventBus.on('risk.soft_pull', (data) => {
      this.handleRiskEvent('soft_pull', data);
    });

    eventBus.on('risk.hard_pull', (data) => {
      this.handleRiskEvent('hard_pull', data);
    });

    // Listen for broker connection status
    eventBus.on('broker.connected', (data) => {
      this.handleBrokerConnection(data);
    });
  }

  startSession(): string {
    const sessionId = `analyst_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.currentSession = {
      id: sessionId,
      startTime: new Date(),
      messageCount: 0,
      persona: this.currentPersona,
      disclaimerShown: false,
      topics: []
    };

    // Add welcome message with disclaimer
    this.addSystemMessage(
      "Welcome to The Analyst. I'm here to explain your portfolio, market context, system decisions, and outcomes.\n\n" +
      "**Important:** This is not financial advice. All analysis is for educational purposes only. Always consult with qualified financial professionals before making investment decisions.",
      'system'
    );

    if (this.currentSession) {
      this.currentSession.disclaimerShown = true;
    }

    logService.log('info', 'Analyst session started', { sessionId, persona: this.currentPersona });
    
    return sessionId;
  }

  endSession() {
    if (this.currentSession) {
      this.currentSession.endTime = new Date();
      
      // Log session summary using simple logging for now
      logService.log('info', 'Analyst session ended', { 
        sessionId: this.currentSession.id,
        duration: this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime(),
        messageCount: this.currentSession.messageCount,
        persona: this.currentSession.persona,
        topics: this.currentSession.topics
      });
    }

    this.currentSession = null;
  }

  setPersona(personaId: string) {
    const persona = ANALYST_PERSONAS.find(p => p.id === personaId);
    if (persona) {
      this.currentPersona = personaId;
      llmService.setPersona(personaId);
      
      this.addSystemMessage(
        `Switched to ${persona.name} persona: ${persona.description}`,
        'system'
      );

      logService.log('info', 'Analyst persona changed', { 
        newPersona: personaId,
        sessionId: this.currentSession?.id 
      });
    }
  }

  async processUserMessage(userInput: string): Promise<AnalystMessage> {
    if (!this.currentSession) {
      this.startSession();
    }

    // Add user message
    const userMessage = this.addUserMessage(userInput);

    // Gather context from BID and Recorder AND knowledge base
    const [context, kbResults] = await Promise.all([
      this.gatherContext(userInput),
      this.retrieveKnowledge(userInput)
    ]);

    // Enhance context with knowledge base results
    const enhancedContext = {
      ...context,
      knowledgeBase: kbResults,
      retrievedSources: kbResults.sources
    };

    // Generate LLM response
    try {
      const llmResponse = await llmService.generateResponse(userInput, enhancedContext);
      
      // Add analyst response
      const analystMessage = this.addAnalystMessage(
        llmResponse.content,
        llmResponse.actionButtons,
        llmResponse.watchNext,
        llmResponse.relatedEventIds,
        enhancedContext
      );

      // Log to recorder with knowledge base sources
      recorder.recordAnalystConversation({
        userQuery: userInput,
        analystResponse: llmResponse.content,
        persona: this.currentPersona,
        citedSources: [...(llmResponse.relatedEventIds || []), ...kbResults.sources],
        chartsGenerated: [],
        confidenceLevel: 0.8
      });

      // Record conversation for compliance audit with KB sources
      await this.recordConversation(userInput, llmResponse.content, enhancedContext);

      // Extract topics for session tracking
      this.extractTopics(userInput);

      // Emit analyst note event
      eventBus.emit('analyst.note', {
        sessionId: this.currentSession!.id,
        userQuery: userInput,
        response: llmResponse.content,
        persona: this.currentPersona,
        knowledgeBaseSources: kbResults.sources
      });

      return analystMessage;

    } catch (error) {
      logService.log('error', 'Failed to generate analyst response', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userInput,
        sessionId: this.currentSession?.id
      });

      return this.addAnalystMessage(
        "I apologize, but I'm having difficulty processing your request right now. Please try again or rephrase your question.",
        [
          {
            label: 'Refresh Data',
            eventType: 'portfolio.refresh.request',
            eventData: {},
            variant: 'outline'
          }
        ]
      );
    }
  }

  // Retrieve knowledge from KB using RAG
  private async retrieveKnowledge(userInput: string): Promise<RetrievalResult> {
    try {
      // Extract relevant tags/categories from user input
      const tags = this.extractTags(userInput);

      // Retrieve knowledge with different strategies based on query type
      const isDefinitionQuery = /what is|define|explain|tell me about/i.test(userInput);
      const isHowToQuery = /how to|how do|how should/i.test(userInput);
      const isStrategyQuery = /strategy|trading|bot|risk/i.test(userInput);

      const retrievalOptions = {
        includeGlossary: isDefinitionQuery || isStrategyQuery,
        includeFAQs: isHowToQuery || /\?/.test(userInput),
        includeChunks: true,
        limit: isDefinitionQuery ? 3 : 5,
        tags
      };

      return await knowledgeBaseService.retrieveKnowledge(userInput, retrievalOptions);

    } catch (error) {
      console.error('Knowledge retrieval error:', error);
      return { chunks: [], glossaryTerms: [], faqs: [], sources: [] };
    }
  }

  // Extract relevant tags from user input
  private extractTags(input: string): string[] {
    const inputLower = input.toLowerCase();
    const tagMap: Record<string, string[]> = {
      'day-trading': ['day', 'intraday', 'scalp'],
      'swing-trading': ['swing', 'position', 'hold'],
      'risk-management': ['risk', 'stop', 'loss', 'size', 'drawdown'],
      'strategy': ['strategy', 'bot', 'signal', 'momentum', 'breakout'],
      'regulation': ['pdt', 'rule', 'finra', 'sec', 'compliance'],
      'technical-analysis': ['rsi', 'macd', 'atr', 'vwap', 'bollinger', 'moving average'],
      'platform': ['stagalgo', 'how', 'work', 'connect', 'brokerage']
    };

    const tags: string[] = [];
    for (const [tag, keywords] of Object.entries(tagMap)) {
      if (keywords.some(keyword => inputLower.includes(keyword))) {
        tags.push(tag);
      }
    }

    return tags;
  }

  // Record conversation for compliance audit with knowledge base sources
  private async recordConversation(userInput: string, analystResponse: string, context: any): Promise<void> {
    try {
      // Record using simple logging for now - would be enhanced with proper recorder
      logService.log('info', 'Analyst conversation recorded', {
        sessionId: this.currentSession?.id,
        userInputPreview: userInput.substring(0, 100),
        responsePreview: analystResponse.substring(0, 100),
        persona: this.currentPersona,
        complianceMode: 'educational',
        citedSources: context.retrievedSources || [],
        contextSummary: {
          portfolioDataAvailable: !!context.portfolioData,
          recentEventsCount: context.recentEvents?.length || 0,
          bidDataAvailable: !!context.bidData,
          knowledgeBaseSources: context.retrievedSources || []
        },
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to record conversation:', error);
    }
  }

  private async gatherContext(userInput: string) {
    const portfolioData = bid.getPortfolio();
    const riskMetrics = bid.getRiskMetrics();
    const recentSignals = bid.getStrategySignals().slice(0, 5);
    const recentAlerts = bid.getAlerts().slice(0, 10);
    const recentEvents: any[] = []; // Mock for now

    return {
      portfolioData,
      riskMetrics,
      recentSignals,
      recentAlerts,
      recentEvents,
      bidData: {
        portfolio: portfolioData,
        risk: riskMetrics,
        signals: recentSignals
      },
      recorderData: recentEvents
    };
  }

  private addUserMessage(content: string): AnalystMessage {
    const message: AnalystMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: 'user',
      content
    };

    this.messages.push(message);
    
    if (this.currentSession) {
      this.currentSession.messageCount++;
    }

    return message;
  }

  private addAnalystMessage(
    content: string, 
    actionButtons?: any[], 
    watchNext?: string,
    relatedEventIds?: string[],
    context?: any
  ): AnalystMessage {
    const message: AnalystMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: 'analyst',
      content,
      persona: this.currentPersona,
      actionButtons,
      watchNext,
      relatedEventIds,
      context
    };

    this.messages.push(message);
    
    if (this.currentSession) {
      this.currentSession.messageCount++;
    }

    return message;
  }

  private addSystemMessage(content: string, type: 'system' = 'system'): AnalystMessage {
    const message: AnalystMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      content
    };

    this.messages.push(message);
    return message;
  }

  private extractTopics(userInput: string) {
    if (!this.currentSession) return;

    const topicKeywords = {
      'portfolio': /portfolio|position|holding|equity|cash/i,
      'risk': /risk|stop|loss|drawdown|volatility/i,
      'trades': /trade|buy|sell|order|execution/i,
      'performance': /performance|return|profit|loss|pnl/i,
      'market': /market|sector|trend|momentum/i,
      'analysis': /analysis|explain|why|how|diagnose/i
    };

    for (const [topic, regex] of Object.entries(topicKeywords)) {
      if (regex.test(userInput) && !this.currentSession.topics.includes(topic)) {
        this.currentSession.topics.push(topic);
      }
    }
  }

  // Event handlers
  private handlePortfolioUpdate(data: any) {
    if (this.currentSession && this.messages.length > 0) {
      // Only add proactive insights if there's an active conversation
      const lastMessage = this.messages[this.messages.length - 1];
      const timeSinceLastMessage = Date.now() - lastMessage.timestamp.getTime();
      
      // Don't spam - only if last message was more than 30 seconds ago
      if (timeSinceLastMessage > 30000) {
        this.addSystemMessage(
          `📊 Portfolio updated: ${data.changeType || 'General update'} detected`,
          'system'
        );
      }
    }
  }

  private handleTradeExecution(data: any) {
    if (this.currentSession) {
      this.addSystemMessage(
        `✅ Trade executed: ${data.side?.toUpperCase()} ${data.quantity} ${data.symbol} at $${data.price}`,
        'system'
      );
    }
  }

  private handleRiskEvent(type: 'soft_pull' | 'hard_pull', data: any) {
    if (this.currentSession) {
      const severity = type === 'hard_pull' ? '🚨' : '⚠️';
      this.addSystemMessage(
        `${severity} Risk event: ${data.reason || 'Risk threshold triggered'}`,
        'system'
      );

      // For hard pulls, emit an alert
      if (type === 'hard_pull') {
        eventBus.emit('alert.created', {
          type: 'risk_hard_pull',
          message: `Hard pull triggered: ${data.reason}`,
          severity: 'high',
          source: 'analyst'
        });
      }
    }
  }

  private handleBrokerConnection(data: any) {
    if (this.currentSession) {
      this.addSystemMessage(
        `🔗 Broker ${data.status === 'connected' ? 'connected' : 'disconnected'}: ${data.source || 'Unknown broker'}`,
        'system'
      );
    }
  }

  // Public getters
  getMessages(): AnalystMessage[] {
    return [...this.messages];
  }

  getCurrentSession(): AnalystSession | null {
    return this.currentSession;
  }

  getCurrentPersona(): string {
    return this.currentPersona;
  }

  clearMessages() {
    this.messages = [];
    logService.log('info', 'Analyst messages cleared', { 
      sessionId: this.currentSession?.id 
    });
  }

  // Quick action methods
  async explainPosition(symbol: string): Promise<AnalystMessage> {
    return this.processUserMessage(`Explain my current ${symbol} position`);
  }

  async diagnoseLastTrade(): Promise<AnalystMessage> {
    return this.processUserMessage("Why did we make the last trade?");
  }

  async generateDailyLessons(): Promise<AnalystMessage> {
    return this.processUserMessage("Turn today's trading into 3 key lessons");
  }

  async compareExecutionToPlan(): Promise<AnalystMessage> {
    return this.processUserMessage("Compare today's execution to our original plan");
  }
}

export const analystService = new AnalystService();