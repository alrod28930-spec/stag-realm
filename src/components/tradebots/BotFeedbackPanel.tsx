import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  MessageSquare, 
  AlertCircle, 
  CheckCircle, 
  TrendingUp,
  Bot,
  Clock,
  Target,
  Shield
} from 'lucide-react';
import { tradeBotSystem } from '@/services/tradeBots';

interface BotFeedback {
  botId: string;
  type: string;
  timestamp: Date;
  symbol?: string;
  message: string;
  details?: any;
}

interface BotFeedbackPanelProps {
  botId?: string;
  maxEntries?: number;
}

export default function BotFeedbackPanel({ botId, maxEntries = 20 }: BotFeedbackPanelProps) {
  const [feedback, setFeedback] = useState<BotFeedback[]>([]);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    // Load initial feedback
    loadFeedback();

    // Subscribe to real-time feedback updates
    const handleFeedback = (newFeedback: BotFeedback) => {
      if (!botId || newFeedback.botId === botId) {
        setFeedback(prev => [newFeedback, ...prev.slice(0, maxEntries - 1)]);
      }
    };

    // Mock event subscription - would use actual event bus
    const interval = setInterval(loadFeedback, 10000); // Refresh every 10 seconds

    return () => {
      clearInterval(interval);
    };
  }, [botId, maxEntries]);

  const loadFeedback = () => {
    const feedbackData = tradeBotSystem.getFeedbackLog(botId);
    setFeedback(feedbackData.slice(0, maxEntries));
  };

  const getFeedbackIcon = (type: string) => {
    switch (type) {
      case 'pre_trade':
        return <MessageSquare className="w-4 h-4 text-primary" />;
      case 'execution':
        return <TrendingUp className="w-4 h-4 text-accent" />;
      case 'session_limit':
        return <Shield className="w-4 h-4 text-yellow-500" />;
      case 'risk_alert':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-accent" />;
      default:
        return <Bot className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getFeedbackBadgeColor = (type: string) => {
    switch (type) {
      case 'pre_trade':
        return 'bg-primary/20 text-primary border-primary/30';
      case 'execution':
        return 'bg-accent/20 text-accent border-accent/30';
      case 'session_limit':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'risk_alert':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'success':
        return 'bg-accent/20 text-accent border-accent/30';
      default:
        return 'bg-muted/20 text-muted-foreground border-muted/30';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return timestamp.toLocaleDateString();
  };

  return (
    <Card className="bg-gradient-card shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Bot Feedback
            {botId && (
              <Badge variant="outline" className="ml-2">
                Single Bot
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-accent animate-pulse' : 'bg-muted'}`} />
            <span className="text-xs text-muted-foreground">
              {isLive ? 'Live' : 'Paused'}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {feedback.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <Bot className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No feedback messages yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Bot feedback will appear here when trades are analyzed
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedback.map((item, index) => (
                <div key={index} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getFeedbackIcon(item.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getFeedbackBadgeColor(item.type)}`}
                        >
                          {item.type.replace('_', ' ')}
                        </Badge>
                        
                        {item.symbol && (
                          <Badge variant="outline" className="text-xs">
                            {item.symbol}
                          </Badge>
                        )}
                        
                        <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(item.timestamp)}
                        </div>
                      </div>
                      
                      <p className="text-sm text-foreground leading-relaxed">
                        {item.message}
                      </p>
                      
                      {item.details && (
                        <div className="mt-2 space-y-2">
                          {item.details.hypothesis && (
                            <div className="text-xs">
                              <span className="font-medium text-muted-foreground">Hypothesis:</span>
                              <p className="text-muted-foreground mt-1">{item.details.hypothesis}</p>
                            </div>
                          )}
                          
                          {item.details.confidence && (
                            <div className="flex items-center gap-2 text-xs">
                              <Target className="w-3 h-3 text-muted-foreground" />
                              <span className="text-muted-foreground">Confidence:</span>
                              <span className="font-medium">{item.details.confidence}</span>
                            </div>
                          )}
                          
                          {item.details.supportingFactors && item.details.supportingFactors.length > 0 && (
                            <div className="text-xs">
                              <span className="font-medium text-muted-foreground">Supporting Signals:</span>
                              <ul className="list-disc list-inside mt-1 text-muted-foreground space-y-0.5">
                                {item.details.supportingFactors.slice(0, 3).map((factor: string, i: number) => (
                                  <li key={i}>{factor}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {item.details.riskFactors && item.details.riskFactors.length > 0 && (
                            <div className="text-xs">
                              <span className="font-medium text-muted-foreground">Risk Factors:</span>
                              <ul className="list-disc list-inside mt-1 text-muted-foreground space-y-0.5">
                                {item.details.riskFactors.slice(0, 2).map((risk: string, i: number) => (
                                  <li key={i}>{risk}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {index < feedback.length - 1 && <Separator className="opacity-20" />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}