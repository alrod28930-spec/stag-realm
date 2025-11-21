import { logService } from './logging';
import { eventBus } from './eventBus';
import { bid } from './bid';
import { recorder } from './recorder';
import { llmService, LLMResponse, ANALYST_PERSONAS } from './llm';
import { knowledgeBaseService, RetrievalResult } from './knowledgeBase';
import { userBID } from './userBID';
import { analystCache } from './analystCache';
import { circuitBreaker } from './circuitBreaker';
import { connectionLifecycle } from './connectionLifecycle';

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
  disclaimerShown: boolean;
  topics: string[];
}

class AnalystService {
  private messages: AnalystMessage[] = [];
  private currentSession: AnalystSession | null = null;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;

  constructor() {
    this.subscribeToEvents();
    this.initializeConnections();
    this.loadPersistedSession();
  }

  /**
   * Initialize connections for health monitoring
   */
  private initializeConnections() {
    // Register Analyst API connection
    connectionLifecycle.register('analyst-api', {
      maxReconnectAttempts: 5,
      reconnectDelay: 3000,
      maxReconnectDelay: 30000
    });

    // Register circuit breaker for API calls
    circuitBreaker.register('analyst-llm', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 120000,
      monitoringPeriod: 300000
    });

    console.log('🧠 Analyst connections initialized');
  }

  /**
   * Load persisted session from localStorage
   */
  private loadPersistedSession() {
    try {
      const stored = localStorage.getItem('analyst_session');
      if (stored) {
        const data = JSON.parse(stored);
        
        // Only restore if recent (within last hour)
        const sessionStart = new Date(data.startTime);
        const hourAgo = Date.now() - 3600000;
        
        if (sessionStart.getTime() > hourAgo) {
          this.currentSession = {
            ...data,
            startTime: new Date(data.startTime),
            endTime: data.endTime ? new Date(data.endTime) : undefined
          };
          
          // Restore messages
          const storedMessages = localStorage.getItem('analyst_messages');
          if (storedMessages) {
            this.messages = JSON.parse(storedMessages).map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp)
            }));
          }
          
          console.log('🧠 Restored analyst session:', this.currentSession.id);
        }
      }
    } catch (error) {
      console.error('Failed to load analyst session:', error);
    }
  }

  /**
   * Persist session state
   */
  private persistSession() {
    try {
      if (this.currentSession) {
        localStorage.setItem('analyst_session', JSON.stringify(this.currentSession));
      }
      
      // Only store last 50 messages to save space
      const recentMessages = this.messages.slice(-50);
      localStorage.setItem('analyst_messages', JSON.stringify(recentMessages));
    } catch (error) {
      console.error('Failed to persist analyst session:', error);
    }
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
      disclaimerShown: false,
      topics: []
    };

    // Add welcome message with disclaimer
    this.addSystemMessage(
      "Welcome to the Strategic Analyst. I provide professional analysis of your portfolio, market context, and trading decisions.\n\n" +
      "**Important:** This is educational analysis, not financial advice. Always consult qualified financial professionals before making investment decisions.",
      'system'
    );

    if (this.currentSession) {
      this.currentSession.disclaimerShown = true;
    }

    logService.log('info', 'Analyst session started', { sessionId });
    
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
        topics: this.currentSession.topics
      });
    }

    this.currentSession = null;
  }

  // Persona functionality removed - using single Strategic Analyst personality

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

    // Check cache first
    const cachedResponse = analystCache.get(userInput, 'strategic', enhancedContext);
    if (cachedResponse) {
      const analystMessage = this.addAnalystMessage(
        cachedResponse,
        undefined,
        undefined,
        undefined,
        enhancedContext
      );
      
      this.persistSession();
      return analystMessage;
    }

    // Generate LLM response with circuit breaker protection
    try {
      const llmResponse = await circuitBreaker.execute<LLMResponse>(
        'analyst-llm',
        async () => {
          connectionLifecycle.markConnected('analyst-api');
          return await llmService.generateResponse(userInput, enhancedContext);
        },
        async () => {
          // Fallback response when circuit is open
          return {
            content: "I'm currently experiencing high load. Please try again in a moment, or check the cache for recent similar queries.",
            persona: 'strategic',
            actionButtons: [
              {
                label: 'Retry',
                eventType: 'analyst.retry',
                eventData: { message: userInput },
                variant: 'default' as const
              }
            ]
          };
        }
      );
      
      // Add analyst response
      const analystMessage = this.addAnalystMessage(
        llmResponse.content,
        llmResponse.actionButtons,
        llmResponse.watchNext,
        llmResponse.relatedEventIds,
        enhancedContext
      );

      // Cache the response
      analystCache.set(userInput, 'strategic', llmResponse.content, enhancedContext);

      // Log to recorder with knowledge base sources
      recorder.recordAnalystConversation({
        userQuery: userInput,
        analystResponse: llmResponse.content,
        persona: 'strategic',
        citedSources: [...(llmResponse.relatedEventIds || []), ...kbResults.sources],
        chartsGenerated: [],
        confidenceLevel: 0.8
      });

      // Record conversation for compliance audit with KB sources
      await this.recordConversation(userInput, llmResponse.content, enhancedContext);

      // Extract topics for session tracking
      this.extractTopics(userInput);

      // Persist session state
      this.persistSession();

      // Emit analyst note event
      eventBus.emit('analyst.note', {
        sessionId: this.currentSession!.id,
        userQuery: userInput,
        response: llmResponse.content,
        persona: 'strategic',
        knowledgeBaseSources: kbResults.sources
      });

      return analystMessage;

    } catch (error) {
      logService.log('error', 'Failed to generate analyst response', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userInput,
        sessionId: this.currentSession?.id
      });

      // Mark connection as having issues
      eventBus.emit('connection.error', {
        connectionId: 'analyst-api',
        type: 'api',
        name: 'Analyst API',
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCount: 1
      });

      return this.addAnalystMessage(
        "I apologize, but I'm having difficulty processing your request right now. The system is attempting to recover automatically. Please try again in a moment.",
        [
          {
            label: 'Retry',
            eventType: 'analyst.retry',
            eventData: { message: userInput },
            variant: 'default'
          },
          {
            label: 'Check Cache',
            eventType: 'analyst.cache.stats',
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
    // Get comprehensive user data from the user-specific BID
    const userContext = userBID.getAnalystContext();
    
    // Fallback to legacy BID if user BID is not available
    const portfolioData = userContext?.portfolioSummary || bid.getPortfolio();
    const riskMetrics = userContext?.riskProfile?.riskMetrics || bid.getRiskMetrics();
    const recentSignals = bid.getStrategySignals().slice(0, 5);
    const recentAlerts = bid.getAlerts().slice(0, 10);
    const recentEvents: any[] = []; // Mock for now

    return {
      // Enhanced context with user-specific data
      userProfile: userContext?.userProfile || null,
      portfolioData,
      riskMetrics,
      recentSignals,
      recentAlerts,
      recentEvents,
      tradingStyle: userContext?.tradingStyle || null,
      marketIntelligence: userContext?.marketIntelligence || null,
      botConfiguration: userContext?.botConfiguration || [],
      learningProgress: userContext?.learningProgress || null,
      usagePatterns: userContext?.usagePatterns || null,
      isDemoMode: userContext?.isDemoMode || false,
      demoScenario: userContext?.demoScenario || null,
      bidData: {
        portfolio: portfolioData,
        risk: riskMetrics,
        signals: recentSignals,
        userSpecific: userContext
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
    return 'strategic'; // Fixed single personality
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