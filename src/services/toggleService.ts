// Toggle Service - Manages system-wide toggle states and settings

import { eventBus } from './eventBus';
import { recorder } from './recorder';

export interface ToggleState {
  // Trade Bot Toggles
  tradeBots: Record<string, 'off' | 'simulation' | 'live'>;
  
  // Global Risk Toggles
  riskGovernorsEnabled: boolean;
  softPullEnabled: boolean;
  hardPullEnabled: boolean;
  blacklistEnforced: boolean;
  exposureLimitsEnabled: boolean;
  dailyDrawdownGuard: boolean;
  minimumTradeThresholds: boolean;
  
  // Capital Risk Toggles
  perTradeRiskEnabled: boolean;
  sectorRiskEnabled: boolean;
  portfolioRiskEnabled: boolean;
  leverageRiskEnabled: boolean;
  
  // Gains Toggles
  takeProfitScaling: boolean;
  profitLockIn: boolean;
  aggressiveGains: boolean;
  partialExits: boolean;
  
  // Analyst Feature Toggles
  analystPersona: 'stoic' | 'mentor' | 'strategist';
  voiceOutput: boolean;
  lessonMode: boolean;
  disclaimerReminders: boolean;
  
  // Oracle Toggles
  priceFeedsEnabled: boolean;
  newsFeedEnabled: boolean;
  macroEventsEnabled: boolean;
  geoPoliticalEvents: boolean;
  sectorHeatmap: boolean;
  signalSeverity: 'critical' | 'high_plus' | 'all';
  autoAlerts: boolean;
  
  // Market Search Toggles
  savedSearchNotifications: Record<string, boolean>;
  recommendationDrafts: boolean;
  
  // Recorder Toggles
  exportFrequency: 'daily' | 'weekly' | 'monthly';
  auditMode: boolean;
  popupHistory: boolean;
  
  // Notification Toggles
  marketOpenClose: boolean;
  highRiskAlerts: boolean;
  systemUpdates: boolean;
  dailySummary: boolean;
}

class ToggleService {
  private toggleState: ToggleState;
  private subscribers: Set<(state: ToggleState) => void> = new Set();

  constructor() {
    // Initialize with default safe settings
    this.toggleState = this.getDefaultToggleState();
    this.loadToggleState();
  }

  private getDefaultToggleState(): ToggleState {
    return {
      // Trade Bot Toggles
      tradeBots: {},
      
      // Global Risk Toggles (all enabled by default for safety)
      riskGovernorsEnabled: true,
      softPullEnabled: true,
      hardPullEnabled: true,
      blacklistEnforced: true,
      exposureLimitsEnabled: true,
      dailyDrawdownGuard: true,
      minimumTradeThresholds: true,
      
      // Capital Risk Toggles (enabled for safety)
      perTradeRiskEnabled: true,
      sectorRiskEnabled: true,
      portfolioRiskEnabled: true,
      leverageRiskEnabled: true,
      
      // Gains Toggles (conservative defaults)
      takeProfitScaling: true,
      profitLockIn: true,
      aggressiveGains: false,
      partialExits: false,
      
      // Analyst Feature Toggles
      analystPersona: 'mentor',
      voiceOutput: false,
      lessonMode: true,
      disclaimerReminders: true,
      
      // Oracle Toggles
      priceFeedsEnabled: true,
      newsFeedEnabled: true,
      macroEventsEnabled: true,
      geoPoliticalEvents: true,
      sectorHeatmap: true,
      signalSeverity: 'high_plus',
      autoAlerts: true,
      
      // Market Search Toggles
      savedSearchNotifications: {},
      recommendationDrafts: false,
      
      // Recorder Toggles
      exportFrequency: 'weekly',
      auditMode: true,
      popupHistory: true,
      
      // Notification Toggles
      marketOpenClose: true,
      highRiskAlerts: true,
      systemUpdates: true,
      dailySummary: true,
    };
  }

  private loadToggleState() {
    // In a real app, load from Supabase or local storage
    const saved = localStorage.getItem('staghog_toggle_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.toggleState = { ...this.toggleState, ...parsed };
      } catch (error) {
        console.warn('Failed to parse saved toggle state:', error);
      }
    }
  }

  private saveToggleState() {
    localStorage.setItem('staghog_toggle_state', JSON.stringify(this.toggleState));
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback(this.toggleState));
  }

  private logToggleChange(toggleKey: string, oldValue: any, newValue: any, reason?: string) {
    // Use basic console logging since recorder may not have log method
    console.log('Toggle changed:', {
      toggleKey,
      oldValue,
      newValue,
      reason,
      timestamp: new Date(),
      userId: 'current_user'
    });

    // Emit event for other services to react
    eventBus.emit('toggle.changed', {
      toggleKey,
      oldValue,
      newValue,
      reason
    });
  }

  // Public API
  public getToggleState(): ToggleState {
    return { ...this.toggleState };
  }

  public subscribe(callback: (state: ToggleState) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // Trade Bot Toggles
  public setBotStatus(botId: string, status: 'off' | 'simulation' | 'live', reason?: string) {
    const oldStatus = this.toggleState.tradeBots[botId] || 'off';
    this.toggleState.tradeBots[botId] = status;
    
    this.logToggleChange(`tradeBots.${botId}`, oldStatus, status, reason);
    this.saveToggleState();
    this.notifySubscribers();

    // Emit specific bot status change event
    eventBus.emit('bot.status_changed', { botId, status, oldStatus });
  }

  public getBotStatus(botId: string): 'off' | 'simulation' | 'live' {
    return this.toggleState.tradeBots[botId] || 'off';
  }

  // Risk Toggles
  public setRiskToggle(toggleKey: keyof ToggleState, enabled: boolean, reason?: string) {
    const oldValue = this.toggleState[toggleKey];
    (this.toggleState as any)[toggleKey] = enabled;
    
    this.logToggleChange(toggleKey, oldValue, enabled, reason);
    this.saveToggleState();
    this.notifySubscribers();

    // Special handling for critical risk toggles
    if (['riskGovernorsEnabled', 'hardPullEnabled'].includes(toggleKey) && !enabled) {
      eventBus.emit('risk.safety_disabled', { toggleKey, reason });
    }
  }

  public getRiskToggle(toggleKey: keyof ToggleState): boolean {
    return this.toggleState[toggleKey] as boolean;
  }

  // Batch toggle updates
  public updateToggles(updates: Partial<ToggleState>, reason?: string) {
    const oldState = { ...this.toggleState };
    
    Object.keys(updates).forEach(key => {
      const toggleKey = key as keyof ToggleState;
      const oldValue = this.toggleState[toggleKey];
      const newValue = updates[toggleKey];
      
      if (oldValue !== newValue) {
        (this.toggleState as any)[toggleKey] = newValue;
        this.logToggleChange(toggleKey, oldValue, newValue, reason);
      }
    });

    this.saveToggleState();
    this.notifySubscribers();
  }

  // Export toggle state for compliance
  public exportToggleState() {
    return {
      currentState: this.toggleState,
      exportTimestamp: new Date(),
      version: '1.0.0'
    };
  }

  // Reset to safe defaults
  public resetToSafeDefaults(reason?: string) {
    const oldState = { ...this.toggleState };
    this.toggleState = this.getDefaultToggleState();
    
    this.logToggleChange('system.reset', oldState, this.toggleState, reason);
    this.saveToggleState();
    this.notifySubscribers();

    eventBus.emit('toggles.reset_to_safe', { reason });
  }

  // Check if system is in safe mode (all risk controls enabled)
  public isInSafeMode(): boolean {
    return this.toggleState.riskGovernorsEnabled &&
           this.toggleState.hardPullEnabled &&
           this.toggleState.blacklistEnforced &&
           this.toggleState.exposureLimitsEnabled &&
           this.toggleState.dailyDrawdownGuard;
  }

  // Get risk status summary
  public getRiskStatus() {
    const safeModeEnabled = this.isInSafeMode();
    const disabledRiskControls = [];

    if (!this.toggleState.riskGovernorsEnabled) disabledRiskControls.push('Risk Governors');
    if (!this.toggleState.hardPullEnabled) disabledRiskControls.push('Hard Pull');
    if (!this.toggleState.blacklistEnforced) disabledRiskControls.push('Blacklist Enforcement');
    if (!this.toggleState.exposureLimitsEnabled) disabledRiskControls.push('Exposure Limits');
    if (!this.toggleState.dailyDrawdownGuard) disabledRiskControls.push('Daily Drawdown Guard');

    return {
      safeModeEnabled,
      disabledRiskControls,
      riskLevel: safeModeEnabled ? 'low' : disabledRiskControls.length > 2 ? 'high' : 'medium'
    };
  }
}

export const toggleService = new ToggleService();