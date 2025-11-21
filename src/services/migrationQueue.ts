// migrationQueue.ts - Queue system for managing migration execution

import { eventBus } from './eventBus';
import { migrationManager, MigrationResult } from './migrationManager';

export type QueueStatus = 'idle' | 'running' | 'paused';
export type MigrationPriority = 'low' | 'normal' | 'high' | 'critical';

export interface QueuedMigration {
  id: string;
  migrationId: string;
  workspaceId?: string;
  priority: MigrationPriority;
  queuedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  result?: MigrationResult;
  retryCount: number;
  maxRetries: number;
}

class MigrationQueue {
  private queue: QueuedMigration[] = [];
  private status: QueueStatus = 'idle';
  private currentMigration: QueuedMigration | null = null;
  private listeners: Set<(queue: QueuedMigration[]) => void> = new Set();
  private maxConcurrent = 1; // Only one migration at a time for safety

  /**
   * Add a migration to the queue
   */
  enqueue(
    migrationId: string,
    workspaceId?: string,
    priority: MigrationPriority = 'normal',
    maxRetries = 2
  ): string {
    const queueItem: QueuedMigration = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      migrationId,
      workspaceId,
      priority,
      queuedAt: new Date(),
      status: 'pending',
      retryCount: 0,
      maxRetries
    };

    this.queue.push(queueItem);
    this.sortQueue();
    this.notifyListeners();

    console.log(`📥 Queued migration: ${migrationId} (priority: ${priority})`);
    eventBus.emit('migration.queued', { queueItem });

    // Auto-start if idle
    if (this.status === 'idle') {
      this.start();
    }

    return queueItem.id;
  }

  /**
   * Start processing the queue
   */
  async start() {
    if (this.status === 'running') {
      console.log('⚠️ Queue already running');
      return;
    }

    this.status = 'running';
    console.log('▶️ Starting migration queue');
    
    await this.processQueue();
  }

  /**
   * Pause queue processing
   */
  pause() {
    if (this.status === 'running') {
      this.status = 'paused';
      console.log('⏸️ Paused migration queue');
      eventBus.emit('queue.paused', {});
    }
  }

  /**
   * Resume queue processing
   */
  resume() {
    if (this.status === 'paused') {
      this.status = 'running';
      console.log('▶️ Resumed migration queue');
      this.processQueue();
    }
  }

  /**
   * Process the migration queue
   */
  private async processQueue() {
    while (this.status === 'running' && this.queue.length > 0) {
      const pending = this.queue.filter(m => m.status === 'pending');
      
      if (pending.length === 0) {
        break;
      }

      // Get highest priority pending migration
      const next = pending[0];
      this.currentMigration = next;
      next.status = 'running';
      next.startedAt = new Date();
      
      this.notifyListeners();
      console.log(`🚀 Executing queued migration: ${next.migrationId}`);

      try {
        const result = await migrationManager.executeMigration(
          next.migrationId,
          next.workspaceId
        );

        next.result = result;
        next.completedAt = new Date();

        if (result.success) {
          next.status = 'completed';
          console.log(`✅ Queue: Migration completed successfully`);
        } else {
          // Check if we should retry
          if (next.retryCount < next.maxRetries) {
            next.retryCount++;
            next.status = 'pending';
            console.log(`🔄 Queue: Retrying migration (attempt ${next.retryCount + 1}/${next.maxRetries + 1})`);
            
            // Add delay before retry (exponential backoff)
            await new Promise(resolve => 
              setTimeout(resolve, Math.pow(2, next.retryCount) * 1000)
            );
          } else {
            next.status = 'failed';
            console.error(`❌ Queue: Migration failed after ${next.maxRetries} retries`);
          }
        }
      } catch (error) {
        next.status = 'failed';
        next.completedAt = new Date();
        console.error('❌ Queue: Migration execution error:', error);
      }

      this.currentMigration = null;
      this.notifyListeners();

      // Small delay between migrations
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Clean completed migrations older than 1 hour
    this.cleanOldMigrations();

    if (this.status === 'running') {
      this.status = 'idle';
      console.log('✅ Queue processing completed');
      eventBus.emit('queue.completed', {});
    }
  }

  /**
   * Sort queue by priority
   */
  private sortQueue() {
    const priorityOrder: Record<MigrationPriority, number> = {
      critical: 0,
      high: 1,
      normal: 2,
      low: 3
    };

    this.queue.sort((a, b) => {
      // Sort by priority first
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by queued time (FIFO within same priority)
      return a.queuedAt.getTime() - b.queuedAt.getTime();
    });
  }

  /**
   * Cancel a queued migration
   */
  cancel(queueId: string): boolean {
    const item = this.queue.find(m => m.id === queueId);
    
    if (!item) return false;
    
    if (item.status === 'running') {
      console.warn('⚠️ Cannot cancel running migration');
      return false;
    }

    item.status = 'cancelled';
    item.completedAt = new Date();
    this.notifyListeners();

    console.log(`❌ Cancelled queued migration: ${item.migrationId}`);
    return true;
  }

  /**
   * Get queue status
   */
  getStatus(): {
    status: QueueStatus;
    queueLength: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    currentMigration: QueuedMigration | null;
  } {
    return {
      status: this.status,
      queueLength: this.queue.length,
      pending: this.queue.filter(m => m.status === 'pending').length,
      running: this.queue.filter(m => m.status === 'running').length,
      completed: this.queue.filter(m => m.status === 'completed').length,
      failed: this.queue.filter(m => m.status === 'failed').length,
      currentMigration: this.currentMigration
    };
  }

  /**
   * Get all queued migrations
   */
  getQueue(): QueuedMigration[] {
    return [...this.queue];
  }

  /**
   * Clean old completed/failed migrations
   */
  private cleanOldMigrations() {
    const oneHourAgo = Date.now() - 3600000;
    const before = this.queue.length;
    
    this.queue = this.queue.filter(m => {
      if (m.status === 'pending' || m.status === 'running') {
        return true;
      }
      if (m.completedAt && m.completedAt.getTime() < oneHourAgo) {
        return false;
      }
      return true;
    });

    if (this.queue.length < before) {
      console.log(`🧹 Cleaned ${before - this.queue.length} old migrations from queue`);
    }
  }

  /**
   * Subscribe to queue changes
   */
  subscribe(callback: (queue: QueuedMigration[]) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners() {
    const queue = this.getQueue();
    this.listeners.forEach(callback => callback(queue));
  }

  /**
   * Clear entire queue (dangerous!)
   */
  clear() {
    this.queue = [];
    this.status = 'idle';
    this.currentMigration = null;
    this.notifyListeners();
    console.log('🧹 Cleared migration queue');
  }
}

// Export singleton instance
export const migrationQueue = new MigrationQueue();
