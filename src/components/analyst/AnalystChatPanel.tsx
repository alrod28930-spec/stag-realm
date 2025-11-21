// Enhanced Analyst Chat Panel with streaming and health monitoring
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  AlertCircle,
  Clock,
  Check,
  X,
  RefreshCw,
  Activity,
  Zap
} from 'lucide-react';
import { useAnalystChat } from '@/hooks/useAnalystChat';
import { DisclaimerBadge } from '@/components/compliance/DisclaimerBadge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function AnalystChatPanel() {
  const {
    messages,
    messageStatuses,
    isTyping,
    isConnected,
    chatHealth,
    sendMessage,
    retryMessage,
    getCacheStats,
    updateConnectionStatus
  } = useAnalystChat();

  const [inputMessage, setInputMessage] = useState('');
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isStreaming) return;

    const userInput = inputMessage.trim();
    setInputMessage('');
    setIsStreaming(true);
    setStreamingMessage('');

    try {
      // Get context for the message
      const context = await gatherChatContext();

      // Call streaming endpoint
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyst-chat-streaming`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userInput,
            workspace_id: 'demo-workspace',
            context
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast({
            title: "Rate Limit Exceeded",
            description: "Too many requests. Please wait a moment before trying again.",
            variant: "destructive",
          });
          return;
        }
        if (response.status === 402) {
          toast({
            title: "Credits Required",
            description: "Lovable AI credits exhausted. Please add credits in Settings.",
            variant: "destructive",
          });
          return;
        }
        throw new Error('Failed to start streaming');
      }

      if (!response.body) throw new Error('No response body');

      // Process SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process line by line
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              setStreamingMessage(fullResponse);
            }
          } catch (e) {
            // Incomplete JSON, put it back
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Flush remaining buffer
      if (buffer.trim()) {
        for (let raw of buffer.split('\n')) {
          if (!raw || raw.startsWith(':')) continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              setStreamingMessage(fullResponse);
            }
          } catch { /* ignore */ }
        }
      }

      // Add completed message using the service
      await sendMessage(userInput);
      
      // Update connection status on success
      updateConnectionStatus(true);

    } catch (error) {
      console.error('Streaming error:', error);
      
      // Update connection status on error
      updateConnectionStatus(false, error instanceof Error ? error.message : 'Streaming failed');
      
      toast({
        title: "Message Failed",
        description: "Could not send message. Click retry or try again later.",
        variant: "destructive",
      });
    } finally {
      setIsStreaming(false);
      setStreamingMessage('');
    }
  };

  const gatherChatContext = async () => {
    // Gather context from services (mock for now)
    return {
      portfolioData: { totalEquity: 0, positions: [], availableCash: 0 },
      riskMetrics: { portfolioVolatility: 0, sharpeRatio: 0, maxDrawdown: 0 },
      isDemoMode: true
    };
  };

  const handleRetry = (message: string) => {
    retryMessage(message);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-3 h-3 animate-pulse" />;
      case 'sent':
      case 'delivered':
        return <Check className="w-3 h-3 text-accent" />;
      case 'failed':
        return <X className="w-3 h-3 text-destructive" />;
      case 'retrying':
        return <RefreshCw className="w-3 h-3 animate-spin" />;
      default:
        return null;
    }
  };

  const cacheStats = getCacheStats();

  return (
    <Card className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Header */}
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Strategic Analyst
              <DisclaimerBadge variant="minimal" component="analyst" />
            </CardTitle>
            <CardDescription className="mt-1">
              Professional financial analysis and portfolio insights for educational purposes
            </CardDescription>
          </div>
          
          {/* Health Indicator */}
          <div className="flex items-center gap-2">
            <Badge variant={chatHealth.connectionStatus === 'connected' ? 'default' : 'destructive'}>
              <Activity className="w-3 h-3 mr-1" />
              {chatHealth.connectionStatus}
            </Badge>
            {chatHealth.circuitBreakerState === 'open' && (
              <Badge variant="destructive">
                <Zap className="w-3 h-3 mr-1" />
                Circuit Open
              </Badge>
            )}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex gap-4 text-xs text-muted-foreground mt-2">
          <span>Cache: {cacheStats.hitRate}%</span>
          <span>Errors: {chatHealth.errorCount}</span>
          <span>Messages: {messages.length}</span>
        </div>
      </CardHeader>

      {/* Degraded Connection Warning */}
      {!isConnected && (
        <Alert className="mx-6 mb-2" variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Connection to Analyst service is degraded. Messages may be delayed. System is auto-recovering...
          </AlertDescription>
        </Alert>
      )}

      {/* Messages Area */}
      <CardContent className="flex-1 min-h-0 overflow-hidden p-0">
        <ScrollArea className="h-full px-6">
          <div className="space-y-4 py-4">
            {messages.map((message) => {
              const status = Array.from(messageStatuses.values()).find(
                s => s.timestamp.getTime() === message.timestamp.getTime()
              );
              
              return (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-4 ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : message.type === 'system'
                        ? 'bg-muted/50 text-muted-foreground border'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      {message.type === 'user' ? (
                        <User className="w-4 h-4 mt-0.5" />
                      ) : (
                        <Bot className="w-4 h-4 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs opacity-70 font-medium">
                            {message.type === 'analyst' 
                              ? 'Strategic Analyst'
                              : message.type.charAt(0).toUpperCase() + message.type.slice(1)
                            }
                          </span>
                          <div className="flex items-center gap-2">
                            {status && getStatusIcon(status.status)}
                            <span className="text-xs opacity-70">
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="prose prose-sm max-w-none text-current">
                      {message.content}
                    </div>

                    {/* Action Buttons */}
                    {message.actionButtons && message.actionButtons.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/20">
                        {message.actionButtons.map((button, index) => (
                          <Button
                            key={index}
                            variant={button.variant || 'outline'}
                            size="sm"
                            onClick={() => {
                              if (button.eventType === 'analyst.retry') {
                                handleRetry(button.eventData.message);
                              }
                            }}
                          >
                            {button.label}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Retry option for failed messages */}
                    {status?.status === 'failed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => handleRetry(message.content)}
                      >
                        <RefreshCw className="w-3 h-3 mr-2" />
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Streaming Message */}
            {isStreaming && streamingMessage && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-lg p-4 bg-muted text-foreground">
                  <div className="flex items-start gap-3 mb-2">
                    <Bot className="w-4 h-4 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs opacity-70 font-medium">
                          Strategic Analyst
                        </span>
                        <span className="text-xs opacity-70 flex items-center gap-1">
                          <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                          Typing...
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="prose prose-sm max-w-none text-current">
                    {streamingMessage}
                  </div>
                </div>
              </div>
            )}

            {/* Typing Indicator */}
            {isTyping && !streamingMessage && (
              <div className="flex justify-start">
                <div className="rounded-lg p-4 bg-muted">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>

      {/* Input Area */}
      <div className="flex-shrink-0 p-6 border-t space-y-3">
        {/* Health Stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex gap-3">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3" />
              {chatHealth.connectionStatus}
            </span>
            <span>Cache: {chatHealth.cacheHitRate}%</span>
            <span>Circuit: {chatHealth.circuitBreakerState}</span>
          </div>
          {chatHealth.lastSuccessfulRequest && (
            <span className="text-xs">
              Last success: {new Date(chatHealth.lastSuccessfulRequest).toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask about your portfolio, markets, or strategies..."
            className="min-h-[60px] resize-none"
            disabled={isStreaming || !isConnected}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isStreaming || !isConnected}
            size="lg"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {!isConnected && (
          <p className="text-xs text-destructive">
            ⚠️ Connection issues detected. System is attempting to recover automatically.
          </p>
        )}
      </div>
    </Card>
  );
}
