/**
 * Feature Flags System
 * Remote-controlled feature toggles for safe rollout
 */

import { eventBus } from '@/services/eventBus';
import { logService } from '@/services/logging';

export interface FeatureFlags {
  live_trading: boolean;
  oracle_refresh_fast: boolean;
  bots_default: boolean;
  learning_enabled: boolean;
  advanced_charting: boolean;
  ai_assistant: boolean;
  paper_trading_graduation: boolean;
  circuit_breaker: boolean;
  idempotency_check: boolean;
  websocket_enabled: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  live_trading: false, // Start disabled for safety
  oracle_refresh_fast: false,
  bots_default: false,
  learning_enabled: true,
  advanced_charting: true,
  ai_assistant: true,
  paper_trading_graduation: true,
  circuit_breaker: true,
  idempotency_check: true,
  websocket_enabled: true,
};

class FeatureFlagService {
  private flags: FeatureFlags = { ...DEFAULT_FLAGS };
  private remoteFlags: Partial<FeatureFlags> = {};
  private listeners = new Set<(flags: FeatureFlags) => void>();

  constructor() {
    this.loadLocalFlags();
    this.initializeRemoteFlags();
  }

  /**
   * Get all feature flags
   */
  getFlags(): FeatureFlags {
    return { ...this.flags };
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(feature: keyof FeatureFlags): boolean {
    return this.flags[feature] === true;
  }

  /**
   * Enable a feature
   */
  enable(feature: keyof FeatureFlags, source: 'local' | 'remote' = 'local'): void {
    this.setFlag(feature, true, source);
  }

  /**
   * Disable a feature
   */
  disable(feature: keyof FeatureFlags, source: 'local' | 'remote' = 'local'): void {
    this.setFlag(feature, false, source);
  }

  /**
   * Set a flag value
   */
  private setFlag(
    feature: keyof FeatureFlags,
    value: boolean,
    source: 'local' | 'remote'
  ): void {
    const oldValue = this.flags[feature];
    this.flags[feature] = value;

    if (source === 'local') {
      // Save to localStorage for persistence
      this.saveLocalFlags();
    } else {
      // Track remote override
      this.remoteFlags[feature] = value;
    }

    // Log change
    logService.log('info', 'Feature flag changed', {
      feature,
      oldValue,
      newValue: value,
      source,
    });

    // Emit event
    eventBus.emit('feature_flags.changed', {
      feature,
      value,
      source,
    });

    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Subscribe to flag changes
   */
  subscribe(listener: (flags: FeatureFlags) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getFlags()));
  }

  /**
   * Load flags from localStorage
   */
  private loadLocalFlags(): void {
    try {
      const stored = localStorage.getItem('feature_flags');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.flags = { ...DEFAULT_FLAGS, ...parsed };
        logService.log('info', 'Feature flags loaded from localStorage');
      }
    } catch (error) {
      logService.log('error', 'Failed to load feature flags', { error });
    }
  }

  /**
   * Save flags to localStorage
   */
  private saveLocalFlags(): void {
    try {
      localStorage.setItem('feature_flags', JSON.stringify(this.flags));
    } catch (error) {
      logService.log('error', 'Failed to save feature flags', { error });
    }
  }

  /**
   * Initialize remote flags (would fetch from API in production)
   */
  private async initializeRemoteFlags(): Promise<void> {
    try {
      // In production, this would fetch from a feature flag service
      // For now, we'll just use localStorage overrides
      const remoteOverrides = localStorage.getItem('feature_flags_remote');
      if (remoteOverrides) {
        const parsed = JSON.parse(remoteOverrides);
        Object.entries(parsed).forEach(([key, value]) => {
          this.setFlag(key as keyof FeatureFlags, value as boolean, 'remote');
        });
        logService.log('info', 'Remote feature flag overrides applied');
      }
    } catch (error) {
      logService.log('error', 'Failed to load remote flags', { error });
    }
  }

  /**
   * Reset to defaults
   */
  resetToDefaults(): void {
    this.flags = { ...DEFAULT_FLAGS };
    this.remoteFlags = {};
    this.saveLocalFlags();
    localStorage.removeItem('feature_flags_remote');
    logService.log('info', 'Feature flags reset to defaults');
    this.notifyListeners();
  }

  /**
   * Get flag status for debugging
   */
  getDebugInfo() {
    return {
      flags: this.flags,
      remoteOverrides: this.remoteFlags,
      defaults: DEFAULT_FLAGS,
    };
  }
}

export const featureFlags = new FeatureFlagService();

/**
 * Get flag status (for use in components)
 */
export function getFeatureFlags(): FeatureFlags {
  return featureFlags.getFlags();
}

/**
 * Check if feature is enabled (for use in components)
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return featureFlags.isEnabled(feature);
}
