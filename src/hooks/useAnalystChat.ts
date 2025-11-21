// useAnalystChat - Comprehensive Analyst chat management hook
import { useState, useEffect, useCallback, useRef } from 'react';
import { analystCache } from '@/services/analystCache';
import { circuitBreaker } from '@/services/circuitBreaker';
import { eventBus } from '@/services/eventBus';
import { useToast } from '@/hooks/use-toast';

export interface AnalystMessage {
  id: string;
  timestamp: Date;
  type: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    mode?: string;
    disclaimer?: string;
    sources?: Array<{ kind: string; id?: string; title?: string }>;
  };
}

export interface MessageStatus {
  id: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'retrying';
  timestamp: Date;
  retryCount: number;
}

export interface ChatHealth {
  connectionStatus: 'connected' | 'degraded' | 'disconnected';
  circuitBreakerState: 'closed' | 'half-open' | 'open';
  cacheHitRate: number;
  lastSuccessfulRequest: Date | null;
  errorCount: number;
}

export function useAnalystChat() {
  const [messages, setMessages] = useState<AnalystMessage[]>([]);
  const [messageStatuses, setMessageStatuses] = useState<Map<string, MessageStatus>>(new Map());
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [chatHealth, setChatHealth] = useState<ChatHealth>({
    connectionStatus: 'connected',
    circuitBreakerState: 'closed',
    cacheHitRate: 0,
    lastSuccessfulRequest: null,
    errorCount: 0
  });
  
  const { toast } = useToast();
  const messageQueueRef = useRef<Array<{ message: string; resolve: any; reject: any }>>([]);
  const isProcessingRef = useRef(false);

  // Initialize session and load messages
  useEffect(() => {
    // Set initial connection as healthy - we'll update based on actual requests
    setIsConnected(true);
    setChatHealth(prev => ({
      ...prev,
      connectionStatus: 'connected'
    }));

    // Subscribe to events
    const cleanup: Array<() => void> = [];

    // Circuit breaker events
    const circuitOpenedHandler = (data: any) => {
      if (data.circuitId === 'analyst-llm') {
        setIsConnected(false);
        setChatHealth(prev => ({
          ...prev,
          connectionStatus: 'degraded',
          circuitBreakerState: 'open'
        }));
        toast({
          title: "Service Protection Active",
          description: "Too many errors detected. Service will retry automatically.",
          variant: "default",
        });
      }
    };
    eventBus.on('circuit.opened', circuitOpenedHandler);
    cleanup.push(() => eventBus.off('circuit.opened', circuitOpenedHandler));

    const circuitClosedHandler = (data: any) => {
      if (data.circuitId === 'analyst-llm') {
        setIsConnected(true);
        setChatHealth(prev => ({
          ...prev,
          connectionStatus: 'connected',
          circuitBreakerState: 'closed'
        }));
      }
    };
    eventBus.on('circuit.closed', circuitClosedHandler);
    cleanup.push(() => eventBus.off('circuit.closed', circuitClosedHandler));

    // Update cache stats every 5 seconds
    const cacheInterval = setInterval(() => {
      const cacheStats = analystCache.getStats();
      const breakerStats = circuitBreaker.getStats('analyst-llm');
      setChatHealth(prev => ({
        ...prev,
        cacheHitRate: cacheStats.hitRate,
        circuitBreakerState: breakerStats.state,
        lastSuccessfulRequest: breakerStats.lastSuccessTime
      }));
    }, 5000);
    cleanup.push(() => clearInterval(cacheInterval));

    return () => {
      cleanup.forEach(unsub => unsub());
    };
  }, [toast]);

  const updateConnectionStatus = useCallback((success: boolean, error?: string) => {
    if (success) {
      setIsConnected(true);
      setChatHealth(prev => ({
        ...prev,
        connectionStatus: 'connected',
        errorCount: 0,
        lastSuccessfulRequest: new Date()
      }));
    } else {
      setChatHealth(prev => {
        const newErrorCount = (prev.errorCount || 0) + 1;
        return {
          ...prev,
          connectionStatus: newErrorCount >= 3 ? 'disconnected' : 'degraded',
          errorCount: newErrorCount
        };
      });
      
      if (error) {
        toast({
          title: "Connection Issue",
          description: error,
          variant: "default",
        });
      }
    }
  }, [toast]);

  const processMessageQueue = useCallback(async () => {
    if (isProcessingRef.current || messageQueueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    const { message, resolve, reject } = messageQueueRef.current.shift()!;

    try {
      setIsTyping(true);
      
      // Call the new analyst-chat-lite endpoint directly
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/analyst-chat-lite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message,
          persona: 'strategic'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Analyst Lite error:', response.status, errorText);
        throw new Error('Analyst service temporarily unavailable');
      }

      const data = await response.json();
      
      // Add messages to local state
      const userMessage: AnalystMessage = {
        id: `msg_${Date.now()}_user`,
        timestamp: new Date(),
        type: 'user',
        content: message
      };

      const assistantMessage: AnalystMessage = {
        id: `msg_${Date.now()}_assistant`,
        timestamp: new Date(),
        type: 'assistant',
        content: data.summary,
        metadata: {
          mode: data.mode,
          disclaimer: data.disclaimer,
          sources: data.sources
        }
      };

      setMessages(prev => [...prev, userMessage, assistantMessage]);
      
      // Mark message as delivered and update connection status
      setMessageStatuses(prev => {
        const updated = new Map(prev);
        const status = Array.from(updated.values()).find(s => s.status === 'pending');
        if (status) {
          status.status = 'delivered';
        }
        return updated;
      });

      updateConnectionStatus(true);
      resolve(assistantMessage);
    } catch (error) {
      console.error('Failed to process message:', error);
      
      // Mark message as failed and update connection
      setMessageStatuses(prev => {
        const updated = new Map(prev);
        const status = Array.from(updated.values()).find(s => s.status === 'pending');
        if (status) {
          status.status = 'failed';
        }
        return updated;
      });

      updateConnectionStatus(false, error instanceof Error ? error.message : 'Failed to process message');
      reject(error);
    } finally {
      setIsTyping(false);
      isProcessingRef.current = false;
      
      // Process next message in queue
      if (messageQueueRef.current.length > 0) {
        setTimeout(() => processMessageQueue(), 500);
      }
    }
  }, [updateConnectionStatus]);

  const sendMessage = useCallback(async (message: string): Promise<AnalystMessage> => {
    if (!message.trim()) {
      throw new Error('Message cannot be empty');
    }

    // Add message status
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const status: MessageStatus = {
      id: messageId,
      status: 'pending',
      timestamp: new Date(),
      retryCount: 0
    };
    
    setMessageStatuses(prev => new Map(prev).set(messageId, status));

    // Add to queue
    return new Promise((resolve, reject) => {
      messageQueueRef.current.push({ message, resolve, reject });
      processMessageQueue();
    });
  }, [processMessageQueue]);

  const retryMessage = useCallback(async (message: string) => {
    const messageId = `msg_${Date.now()}_retry`;
    
    setMessageStatuses(prev => {
      const updated = new Map(prev);
      updated.set(messageId, {
        id: messageId,
        status: 'retrying',
        timestamp: new Date(),
        retryCount: 1
      });
      return updated;
    });

    try {
      return await sendMessage(message);
    } catch (error) {
      toast({
        title: "Retry Failed",
        description: "Message could not be delivered. Please try again later.",
        variant: "destructive",
      });
      throw error;
    }
  }, [sendMessage, toast]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setMessageStatuses(new Map());
  }, []);

  const getCacheStats = useCallback(() => {
    return analystCache.getStats();
  }, []);

  const getCurrentSession = useCallback(() => {
    return { id: 'lite-session', startTime: new Date() };
  }, []);

  return {
    // Message state
    messages,
    messageStatuses,
    isTyping,
    isConnected,
    chatHealth,
    
    // Actions
    sendMessage,
    retryMessage,
    clearMessages,
    
    // Utilities
    getCacheStats,
    getCurrentSession,
    updateConnectionStatus
  };
}
