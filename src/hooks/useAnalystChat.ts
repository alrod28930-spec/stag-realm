// useAnalystChat - Comprehensive Analyst chat management hook
import { useState, useEffect, useCallback, useRef } from 'react';
import { analystService, AnalystMessage } from '@/services/analyst';
import { analystCache } from '@/services/analystCache';
import { connectionHealthService } from '@/services/connectionHealth';
import { circuitBreaker } from '@/services/circuitBreaker';
import { eventBus } from '@/services/eventBus';
import { useToast } from '@/hooks/use-toast';

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

export function useAnalystChat(initialPersona?: string) {
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
    analystService.startSession();
    if (initialPersona) {
      analystService.setPersona(initialPersona);
    }
    setMessages(analystService.getMessages());

    // Register connection for health monitoring
    connectionHealthService.registerConnection(
      'analyst-chat',
      'api',
      'Analyst Chat Service'
    );

    // Subscribe to events
    const cleanup: Array<() => void> = [];

    // Connection status
    const connHealthyHandler = (data: any) => {
      if (data.connectionId === 'analyst-api' || data.connectionId === 'analyst-chat') {
        setIsConnected(true);
        updateChatHealth();
      }
    };
    eventBus.on('connection.healthy', connHealthyHandler);
    cleanup.push(() => eventBus.off('connection.healthy', connHealthyHandler));

    const connErrorHandler = (data: any) => {
      if (data.connectionId === 'analyst-api' || data.connectionId === 'analyst-chat') {
        setIsConnected(false);
        updateChatHealth();
        toast({
          title: "Connection Issue",
          description: "Analyst service is experiencing issues. Retrying automatically...",
          variant: "default",
        });
      }
    };
    eventBus.on('connection.error', connErrorHandler);
    cleanup.push(() => eventBus.off('connection.error', connErrorHandler));

    // Circuit breaker events
    const circuitOpenedHandler = (data: any) => {
      if (data.circuitId === 'analyst-llm') {
        updateChatHealth();
        toast({
          title: "Service Protection Active",
          description: "Too many errors detected. Service will retry automatically.",
          variant: "default",
        });
      }
    };
    eventBus.on('circuit.opened', circuitOpenedHandler);
    cleanup.push(() => eventBus.off('circuit.opened', circuitOpenedHandler));

    // Update health every 5 seconds
    const healthInterval = setInterval(updateChatHealth, 5000);
    cleanup.push(() => clearInterval(healthInterval));

    return () => {
      cleanup.forEach(unsub => unsub());
      analystService.endSession();
    };
  }, [initialPersona, toast]);

  const updateChatHealth = useCallback(() => {
    const conn = connectionHealthService.getConnectionHealth('analyst-chat');
    const breakerStats = circuitBreaker.getStats('analyst-llm');
    const cacheStats = analystCache.getStats();

    let mappedStatus: 'connected' | 'degraded' | 'disconnected' = 'disconnected';
    if (conn?.status === 'healthy') {
      mappedStatus = 'connected';
    } else if (conn?.status === 'degraded') {
      mappedStatus = 'degraded';
    }

    setChatHealth({
      connectionStatus: mappedStatus,
      circuitBreakerState: breakerStats.state,
      cacheHitRate: cacheStats.hitRate,
      lastSuccessfulRequest: breakerStats.lastSuccessTime,
      errorCount: conn?.errorCount || 0
    });
  }, []);

  const processMessageQueue = useCallback(async () => {
    if (isProcessingRef.current || messageQueueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    const { message, resolve, reject } = messageQueueRef.current.shift()!;

    try {
      setIsTyping(true);
      const response = await analystService.processUserMessage(message);
      setMessages(analystService.getMessages());
      
      // Mark message as delivered
      setMessageStatuses(prev => {
        const updated = new Map(prev);
        const status = Array.from(updated.values()).find(s => s.status === 'pending');
        if (status) {
          status.status = 'delivered';
        }
        return updated;
      });

      resolve(response);
    } catch (error) {
      console.error('Failed to process message:', error);
      
      // Mark message as failed
      setMessageStatuses(prev => {
        const updated = new Map(prev);
        const status = Array.from(updated.values()).find(s => s.status === 'pending');
        if (status) {
          status.status = 'failed';
        }
        return updated;
      });

      reject(error);
    } finally {
      setIsTyping(false);
      isProcessingRef.current = false;
      
      // Process next message in queue
      if (messageQueueRef.current.length > 0) {
        setTimeout(() => processMessageQueue(), 500);
      }
    }
  }, []);

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
    analystService.endSession();
    analystService.startSession();
    setMessages(analystService.getMessages());
    setMessageStatuses(new Map());
  }, []);

  const setPersona = useCallback((personaId: string) => {
    analystService.setPersona(personaId);
    setMessages(analystService.getMessages());
  }, []);

  const getCacheStats = useCallback(() => {
    return analystCache.getStats();
  }, []);

  const getCurrentSession = useCallback(() => {
    return analystService.getCurrentSession();
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
    setPersona,
    
    // Utilities
    getCacheStats,
    getCurrentSession
  };
}
