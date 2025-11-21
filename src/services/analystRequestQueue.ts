// analystRequestQueue.ts - Queue and rate-limit analyst requests

import { eventBus } from './eventBus';

export interface QueuedRequest {
  id: string;
  type: 'text' | 'voice';
  payload: any;
  priority: 'low' | 'normal' | 'high';
  queuedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

class AnalystRequestQueue {
  private queue: QueuedRequest[] = [];
  private isProcessing = false;
  private maxConcurrent = 1; // Process one request at a time
  private minDelay = 1000; // Minimum 1s between requests (rate limiting)
  private lastRequestTime = 0;

  /**
   * Add request to queue
   */
  enqueue(
    type: 'text' | 'voice',
    payload: any,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<any> {
    const id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id,
        type,
        payload: {
          ...payload,
          resolve,
          reject
        },
        priority,
        queuedAt: new Date(),
        status: 'pending'
      };

      this.queue.push(request);
      this.sortQueue();
      
      console.log(`📥 Analyst request queued: ${type} (priority: ${priority}, queue size: ${this.queue.length})`);
      
      eventBus.emit('analyst.request_queued', { requestId: id, type, priority });

      // Start processing if not already
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Sort queue by priority
   */
  private sortQueue() {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    
    this.queue.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // FIFO within same priority
      return a.queuedAt.getTime() - b.queuedAt.getTime();
    });
  }

  /**
   * Process the queue
   */
  private async processQueue() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      const request = this.queue[0];
      
      if (request.status !== 'pending') {
        this.queue.shift();
        continue;
      }

      // Rate limiting - ensure minimum delay between requests
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.minDelay) {
        const waitTime = this.minDelay - timeSinceLastRequest;
        console.log(`⏱️ Rate limiting: waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      // Process request
      request.status = 'processing';
      request.startedAt = new Date();
      this.lastRequestTime = Date.now();
      
      console.log(`▶️ Processing analyst request: ${request.type} (${request.id})`);
      
      try {
        // The actual execution happens through the resolve/reject in the payload
        // This is handled by the caller (analystService)
        request.status = 'completed';
        request.completedAt = new Date();
        
        console.log(`✅ Request completed: ${request.id}`);
        
      } catch (error) {
        request.status = 'failed';
        request.error = error instanceof Error ? error.message : 'Unknown error';
        request.completedAt = new Date();
        
        console.error(`❌ Request failed: ${request.id}`, error);
      }
      
      // Remove from queue
      this.queue.shift();
      
      eventBus.emit('analyst.request_completed', { 
        requestId: request.id, 
        status: request.status 
      });
    }
    
    this.isProcessing = false;
    console.log('✅ Analyst queue empty');
  }

  /**
   * Get queue status
   */
  getStatus(): {
    isProcessing: boolean;
    queueLength: number;
    pending: number;
    processing: number;
  } {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.queue.length,
      pending: this.queue.filter(r => r.status === 'pending').length,
      processing: this.queue.filter(r => r.status === 'processing').length
    };
  }

  /**
   * Get queue items
   */
  getQueue(): QueuedRequest[] {
    return [...this.queue];
  }

  /**
   * Clear queue
   */
  clear() {
    // Reject all pending requests
    for (const request of this.queue) {
      if (request.status === 'pending' && request.payload.reject) {
        request.payload.reject(new Error('Queue cleared'));
      }
    }
    
    this.queue = [];
    console.log('🧹 Analyst request queue cleared');
  }

  /**
   * Set rate limit
   */
  setRateLimit(delayMs: number) {
    this.minDelay = delayMs;
    console.log(`⏱️ Analyst rate limit set to ${delayMs}ms`);
  }
}

// Export singleton instance
export const analystRequestQueue = new AnalystRequestQueue();
