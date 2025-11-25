// Enhanced Analyst Service v2.0 - RAG + Tools + Compliance + Voice
import { supabase } from "@/integrations/supabase/client";
import { logService } from './logging';
import { eventBus } from './eventBus';

export interface AnalystResponseV2 {
  mode: 'education' | 'diagnostic' | 'overview' | 'risk_alert';
  summary: string;
  kpis?: Record<string, number>;
  cards?: Array<{
    type: string;
    [key: string]: any;
  }>;
  actions?: Array<{
    label: string;
    target: string;
  }>;
  sources?: Array<{
    kind: string;
    id?: string;
    title?: string;
  }>;
  disclaimer: string;
  voice?: {
    enabled: boolean;
    audio_url?: string;
  };
  error?: string;
  feature?: string;
  required_tier?: string;
}

export interface AnalystMessageV2 {
  id: string;
  timestamp: Date;
  type: 'user' | 'analyst' | 'system';
  content: string;
  response?: AnalystResponseV2;
  persona?: string;
  loading?: boolean;
}

export interface UserPreferences {
  risk_profile: 'low' | 'med' | 'high';
  horizon: 'intra' | 'swing' | 'long';
  teach_level: 'beginner' | 'intermediate' | 'advanced';
  voice_enabled: boolean;
  voice_rate: number;
  favored_assets?: string[];
}

class AnalystServiceV2 {
  private messages: AnalystMessageV2[] = [];
  private currentWorkspaceId: string | null = null;
  private currentPersona: string = 'mentor';
  private sessionContext: Record<string, any> = {};

  constructor() {
    this.subscribeToEvents();
  }

  private subscribeToEvents() {
    // Global voice player events
    eventBus.on('voice.play', (data) => {
      this.handleVoicePlay(data);
    });

    eventBus.on('voice.stop', () => {
      this.handleVoiceStop();
    });

    // Portfolio and market events
    eventBus.on('portfolio.updated', (data) => {
      this.updateSessionContext('portfolio_updated', data);
    });

    eventBus.on('oracle.signal', (data) => {
      this.updateSessionContext('recent_signal', data);
    });
  }

  async initializeWorkspace(workspaceId: string) {
    this.currentWorkspaceId = workspaceId;
    
    // Load or create user preferences
    await this.ensureUserPreferences();
    
    // Load session context
    await this.loadSessionContext();
    
    // Add welcome message
    this.addSystemMessage(
      "Welcome to The Analyst 2.0. I provide data-grounded insights with compliance safeguards and voice capabilities. Ask me about your portfolio, market conditions, or trading scenarios."
    );
  }

  private async ensureUserPreferences(): Promise<UserPreferences> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    // Try to get existing preferences
    const { data: prefs } = await supabase
      .from('user_prefs')
      .select('*')
      .eq('user_id', user.user.id)
      .single();

    if (prefs) {
      return prefs as UserPreferences;
    }

    // Create default preferences
    const defaultPrefs: UserPreferences = {
      risk_profile: 'med',
      horizon: 'swing', 
      teach_level: 'intermediate',
      voice_enabled: true,
      voice_rate: 1.0,
      favored_assets: []
    };

    const { data: newPrefs } = await supabase
      .from('user_prefs')
      .insert({
        user_id: user.user.id,
        ...defaultPrefs
      })
      .select()
      .single();

    return (newPrefs as UserPreferences) || defaultPrefs;
  }

  private async loadSessionContext() {
    if (!this.currentWorkspaceId) return;

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data: session } = await supabase
      .from('analyst_sessions')
      .select('summary')
      .eq('workspace_id', this.currentWorkspaceId)
      .eq('user_id', user.user.id)
      .single();

    if (session?.summary) {
      this.sessionContext = session.summary as Record<string, any>;
    }
  }

  private updateSessionContext(key: string, data: any) {
    this.sessionContext[key] = {
      data,
      timestamp: new Date().toISOString()
    };
  }

  async processUserMessage(userInput: string): Promise<AnalystMessageV2> {
    if (!this.currentWorkspaceId) {
      throw new Error('Workspace not initialized');
    }

    // Add user message
    const userMessage = this.addUserMessage(userInput);

    // Add loading message
    const loadingMessage = this.addAnalystMessage('', true);

    try {
      // Call the enhanced analyst chat endpoint
      const { data, error } = await supabase.functions.invoke('analyst-chat', {
        body: {
          message: userInput,
          workspace_id: this.currentWorkspaceId,
          session_context: this.sessionContext,
          persona: this.currentPersona
        }
      });

      if (error) throw error;

      const response: AnalystResponseV2 = data;

      // Handle locked features
      if (response.error === 'LOCKED_FEATURE') {
        const lockedMessage = this.addAnalystMessage(
          `This feature requires ${response.required_tier} tier. ${response.summary || 'Upgrade to access advanced capabilities.'}`
        );
        lockedMessage.response = response;
        
        // Remove loading message
        this.removeMessage(loadingMessage.id);
        return lockedMessage;
      }

      // Update loading message with actual response
      loadingMessage.content = response.summary;
      loadingMessage.response = response;
      loadingMessage.loading = false;

      // Handle voice if enabled
      if (response.voice?.enabled && response.voice.audio_url) {
        eventBus.emit('voice.play', {
          url: response.voice.audio_url,
          transcript: response.summary,
          messageId: loadingMessage.id
        });
      }

      // Log successful interaction
      logService.log('info', 'Analyst response generated', {
        mode: response.mode,
        hasKpis: !!response.kpis,
        cardCount: response.cards?.length || 0,
        actionCount: response.actions?.length || 0,
        sourceCount: response.sources?.length || 0,
        voiceEnabled: response.voice?.enabled
      });

      return loadingMessage;

    } catch (error) {
      console.error('Analyst processing error:', error);
      
      // Remove loading message and add error message
      this.removeMessage(loadingMessage.id);
      
      return this.addAnalystMessage(
        "I apologize, but I encountered an issue processing your request. Please try again or rephrase your question.",
        false
      );
    }
  }

  // Quick action methods using the new system
  async explainPortfolio(): Promise<AnalystMessageV2> {
    return this.processUserMessage("Explain my current portfolio performance and allocation");
  }

  async diagnoseLastTrade(): Promise<AnalystMessageV2> {
    return this.processUserMessage("Analyze my most recent trade and explain the reasoning behind it");
  }

  async getRiskAssessment(): Promise<AnalystMessageV2> {
    return this.processUserMessage("Evaluate my current portfolio risk and check for any halt conditions");
  }

  async getMarketSignals(): Promise<AnalystMessageV2> {
    return this.processUserMessage("Show me the latest Oracle market signals relevant to my positions");
  }

  async simulateScenario(scenario: string): Promise<AnalystMessageV2> {
    return this.processUserMessage(`Run an educational scenario analysis: ${scenario}`);
  }

  // Voice control methods
  async toggleVoice(enabled: boolean) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    await supabase
      .from('user_prefs')
      .upsert({
        user_id: user.user.id,
        voice_enabled: enabled
      }, { 
        onConflict: 'user_id' 
      });

    eventBus.emit('voice.settings.changed', { enabled });
  }

  async setVoiceRate(rate: number) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    await supabase
      .from('user_prefs')
      .upsert({
        user_id: user.user.id,
        voice_rate: rate
      }, { 
        onConflict: 'user_id' 
      });
  }

  // Persona management
  setPersona(personaId: string) {
    this.currentPersona = personaId;
    this.addSystemMessage(`Switched to ${personaId} persona`);
  }

  // Message management
  private addUserMessage(content: string): AnalystMessageV2 {
    const message: AnalystMessageV2 = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: 'user',
      content
    };

    this.messages.push(message);
    return message;
  }

  private addAnalystMessage(content: string, loading = false): AnalystMessageV2 {
    const message: AnalystMessageV2 = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: 'analyst',
      content,
      persona: this.currentPersona,
      loading
    };

    this.messages.push(message);
    return message;
  }

  private addSystemMessage(content: string): AnalystMessageV2 {
    const message: AnalystMessageV2 = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: 'system',
      content
    };

    this.messages.push(message);
    return message;
  }

  private removeMessage(messageId: string) {
    this.messages = this.messages.filter(msg => msg.id !== messageId);
  }

  private handleVoicePlay(data: any) {
    logService.log('info', 'Voice playback started', {
      messageId: data.messageId,
      url: data.url ? 'present' : 'missing'
    });
  }

  private handleVoiceStop() {
    logService.log('info', 'Voice playback stopped');
  }

  // Public getters
  getMessages(): AnalystMessageV2[] {
    return [...this.messages];
  }

  getCurrentPersona(): string {
    return this.currentPersona;
  }

  getSessionContext(): Record<string, any> {
    return { ...this.sessionContext };
  }

  clearMessages() {
    this.messages = [];
    this.sessionContext = {};
  }
}

export const analystServiceV2 = new AnalystServiceV2();