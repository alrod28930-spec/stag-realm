// migrationManager.ts - Handle data migrations safely with validation and rollback

import { supabase } from '@/integrations/supabase/client';
import { eventBus } from './eventBus';

export interface MigrationStep {
  id: string;
  name: string;
  description: string;
  execute: () => Promise<boolean>;
  rollback: () => Promise<boolean>;
  validate: () => Promise<boolean>;
}

export interface MigrationResult {
  success: boolean;
  completedSteps: string[];
  failedStep?: string;
  error?: string;
  duration: number;
}

export interface MigrationLog {
  id: string;
  timestamp: Date;
  steps: MigrationStep[];
  result: MigrationResult;
  workspaceId?: string;
}

class MigrationManager {
  private migrations: Map<string, MigrationStep[]> = new Map();
  private history: MigrationLog[] = [];
  private maxHistorySize = 50;

  constructor() {
    this.loadHistory();
  }

  /**
   * Register a migration with multiple steps
   */
  registerMigration(migrationId: string, steps: MigrationStep[]) {
    this.migrations.set(migrationId, steps);
    console.log(`📋 Registered migration: ${migrationId} with ${steps.length} steps`);
  }

  /**
   * Execute a migration
   */
  async executeMigration(
    migrationId: string,
    workspaceId?: string
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    const steps = this.migrations.get(migrationId);

    if (!steps) {
      return {
        success: false,
        completedSteps: [],
        error: `Migration ${migrationId} not found`,
        duration: 0
      };
    }

    console.log(`🚀 Starting migration: ${migrationId}`);
    eventBus.emit('migration.started', { migrationId, workspaceId });

    const completedSteps: string[] = [];
    let failedStep: string | undefined;
    let error: string | undefined;

    try {
      for (const step of steps) {
        console.log(`  ▶️ Executing step: ${step.name}`);

        // Validate before execution
        const isValid = await step.validate();
        if (!isValid) {
          throw new Error(`Validation failed for step: ${step.name}`);
        }

        // Execute the step
        const success = await step.execute();
        if (!success) {
          throw new Error(`Execution failed for step: ${step.name}`);
        }

        completedSteps.push(step.id);
        console.log(`  ✅ Completed step: ${step.name}`);
      }

      const duration = Date.now() - startTime;
      const result: MigrationResult = {
        success: true,
        completedSteps,
        duration
      };

      this.logMigration(migrationId, steps, result, workspaceId);
      eventBus.emit('migration.completed', { migrationId, workspaceId, result });

      console.log(`✅ Migration completed successfully: ${migrationId} (${duration}ms)`);
      return result;

    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      failedStep = completedSteps.length < steps.length 
        ? steps[completedSteps.length].id 
        : undefined;

      console.error(`❌ Migration failed at step ${failedStep}:`, error);

      // Attempt rollback
      await this.rollbackMigration(steps, completedSteps);

      const duration = Date.now() - startTime;
      const result: MigrationResult = {
        success: false,
        completedSteps,
        failedStep,
        error,
        duration
      };

      this.logMigration(migrationId, steps, result, workspaceId);
      eventBus.emit('migration.failed', { migrationId, workspaceId, result });

      return result;
    }
  }

  /**
   * Rollback completed steps in reverse order
   */
  private async rollbackMigration(
    steps: MigrationStep[],
    completedSteps: string[]
  ): Promise<void> {
    console.log(`🔄 Rolling back ${completedSteps.length} steps...`);

    // Get completed steps in reverse order
    const stepsToRollback = steps.filter(s => completedSteps.includes(s.id)).reverse();

    for (const step of stepsToRollback) {
      try {
        console.log(`  ◀️ Rolling back: ${step.name}`);
        await step.rollback();
        console.log(`  ✅ Rolled back: ${step.name}`);
      } catch (err) {
        console.error(`  ❌ Rollback failed for ${step.name}:`, err);
        // Continue with other rollbacks
      }
    }

    console.log(`✅ Rollback completed`);
  }

  /**
   * Create a brokerage connection migration
   */
  createBrokerageConnectionMigration(
    provider: string,
    apiKey: string,
    secretKey: string,
    mode: string
  ): string {
    const migrationId = `brokerage-connect-${provider}-${mode}-${Date.now()}`;
    
    const steps: MigrationStep[] = [
      {
        id: 'validate-credentials',
        name: 'Validate Credentials',
        description: 'Check that API keys are properly formatted',
        execute: async () => {
          if (!apiKey || !secretKey) return false;
          if (apiKey.length < 10 || secretKey.length < 10) return false;
          return true;
        },
        rollback: async () => true,
        validate: async () => true
      },
      {
        id: 'test-connection',
        name: 'Test Connection',
        description: 'Verify credentials with broker API',
        execute: async () => {
          const { data, error } = await supabase.functions.invoke('detect-account-type', {
            body: { broker: provider, apiKey, secretKey }
          });
          return !error && data?.ok;
        },
        rollback: async () => true,
        validate: async () => true
      },
      {
        id: 'store-connection',
        name: 'Store Connection',
        description: 'Save connection details to database',
        execute: async () => {
          // This is handled by the edge function
          return true;
        },
        rollback: async () => {
          const { data: user } = await supabase.auth.getUser();
          if (!user.user) return false;

          const { error } = await supabase
            .from('connections_brokerages')
            .delete()
            .eq('provider', provider)
            .eq('mode', mode);

          return !error;
        },
        validate: async () => true
      },
      {
        id: 'sync-portfolio',
        name: 'Sync Portfolio',
        description: 'Load initial portfolio data',
        execute: async () => {
          const { data, error } = await supabase.functions.invoke('alpaca-sync', {
            body: { broker: provider, mode }
          });
          return !error && data?.success;
        },
        rollback: async () => {
          // Portfolio data can stay, it's harmless
          return true;
        },
        validate: async () => {
          // Check that connection has credentials stored
          const { data } = await supabase
            .from('connections_brokerages')
            .select('api_key_cipher, nonce')
            .eq('provider', provider)
            .eq('mode', mode)
            .maybeSingle();

          return !!data?.api_key_cipher && !!data?.nonce;
        }
      }
    ];

    this.registerMigration(migrationId, steps);
    return migrationId;
  }

  /**
   * Create a workspace initialization migration
   */
  createWorkspaceInitMigration(workspaceId: string): string {
    const migrationId = `workspace-init-${workspaceId}`;
    
    const steps: MigrationStep[] = [
      {
        id: 'verify-workspace',
        name: 'Verify Workspace',
        description: 'Ensure workspace exists',
        execute: async () => {
          const { data, error } = await supabase
            .from('workspaces')
            .select('id')
            .eq('id', workspaceId)
            .maybeSingle();
          
          return !error && !!data;
        },
        rollback: async () => true,
        validate: async () => true
      },
      {
        id: 'init-risk-policies',
        name: 'Initialize Risk Policies',
        description: 'Set up default risk policies',
        execute: async () => {
          const { error } = await supabase
            .from('risk_policies')
            .upsert({
              workspace_id: workspaceId,
              max_notional_per_trade: 1000,
              max_positions: 5,
              max_trades_per_day: 20,
              max_daily_loss_pct: 0.05,
              require_stop_loss: true
            });
          
          return !error;
        },
        rollback: async () => {
          const { error } = await supabase
            .from('risk_policies')
            .delete()
            .eq('workspace_id', workspaceId);
          
          return !error;
        },
        validate: async () => {
          const { data } = await supabase
            .from('risk_policies')
            .select('workspace_id')
            .eq('workspace_id', workspaceId)
            .maybeSingle();
          
          return !!data;
        }
      },
      {
        id: 'init-feature-flags',
        name: 'Initialize Feature Flags',
        description: 'Set up default feature flags',
        execute: async () => {
          const { error } = await supabase
            .from('feature_flags')
            .upsert({
              workspace_id: workspaceId,
              flags: {
                bots_default: true,
                live_trading: false,
                learning_enabled: false,
                oracle_refresh_fast: false
              }
            });
          
          return !error;
        },
        rollback: async () => {
          const { error } = await supabase
            .from('feature_flags')
            .delete()
            .eq('workspace_id', workspaceId);
          
          return !error;
        },
        validate: async () => {
          const { data } = await supabase
            .from('feature_flags')
            .select('workspace_id')
            .eq('workspace_id', workspaceId)
            .maybeSingle();
          
          return !!data;
        }
      }
    ];

    this.registerMigration(migrationId, steps);
    return migrationId;
  }

  /**
   * Get migration history
   */
  getHistory(): MigrationLog[] {
    return this.history;
  }

  /**
   * Clear migration history
   */
  clearHistory() {
    this.history = [];
    this.persistHistory();
  }

  /**
   * Log migration execution
   */
  private logMigration(
    id: string,
    steps: MigrationStep[],
    result: MigrationResult,
    workspaceId?: string
  ) {
    const log: MigrationLog = {
      id,
      timestamp: new Date(),
      steps,
      result,
      workspaceId
    };

    this.history.unshift(log);
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }

    this.persistHistory();
  }

  /**
   * Load history from localStorage
   */
  private loadHistory() {
    try {
      const stored = localStorage.getItem('migration_history');
      if (stored) {
        const data = JSON.parse(stored);
        this.history = data.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load migration history:', error);
    }
  }

  /**
   * Persist history to localStorage
   */
  private persistHistory() {
    try {
      // Don't store execute/rollback/validate functions
      const simplified = this.history.map(log => ({
        id: log.id,
        timestamp: log.timestamp,
        steps: log.steps.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description
        })),
        result: log.result,
        workspaceId: log.workspaceId
      }));

      localStorage.setItem('migration_history', JSON.stringify(simplified));
    } catch (error) {
      console.error('Failed to persist migration history:', error);
    }
  }
}

// Export singleton instance
export const migrationManager = new MigrationManager();
