import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  Crown,
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Settings,
  Eye,
  Clock
} from 'lucide-react';
import { analystService, AnalystMessage } from '@/services/analyst';
import { ANALYST_PERSONAS } from '@/services/llm';
import { bid } from '@/services/bid';
import { eventBus } from '@/services/eventBus';
import { useToast } from '@/hooks/use-toast';
import { useCompliance } from '@/components/compliance/ComplianceProvider';
import { ResearchRail } from '@/components/research/ResearchRail';
import { DisclaimerBadge } from '@/components/compliance/DisclaimerBadge';
import { LegalFooter } from '@/components/compliance/LegalFooter';

export default function Analyst() {
  const [messages, setMessages] = useState<AnalystMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState(ANALYST_PERSONAS[0].id);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const { toast } = useToast();
  const { showDisclaimer } = useCompliance();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Portfolio context data
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [riskMetrics, setRiskMetrics] = useState<any>(null);

  useEffect(() => {
    // Start analyst session and load initial data
    analystService.startSession();
    loadContextData();
    
    // Trigger session start disclaimer when Analyst is accessed
    showDisclaimer('analyst', 'view');
    
    // Subscribe to events
    const unsubscribe = eventBus.on('portfolio.updated', loadContextData);

    return () => {
      analystService.endSession();
    };
  }, [showDisclaimer]);

  useEffect(() => {
    // Load messages from service
    setMessages(analystService.getMessages());
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    scrollToBottom();
  }, [messages]);

  const loadContextData = () => {
    setPortfolioData(bid.getPortfolio());
    setRiskMetrics(bid.getRiskMetrics());
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userInput = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await analystService.processUserMessage(userInput);
      setMessages(analystService.getMessages());
      
      // Focus back to input
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePersonaChange = (personaId: string) => {
    setSelectedPersona(personaId);
    analystService.setPersona(personaId);
    setMessages(analystService.getMessages());
  };

  const handleActionButtonClick = (eventType: string, eventData: any) => {
    // Emit the event through the event bus
    eventBus.emit(eventType, eventData);
    
    toast({
      title: "Action Triggered",
      description: `Requested: ${eventType}`,
    });
  };

  const handleQuickAction = async (action: string) => {
    setIsLoading(true);
    try {
      let response: AnalystMessage;
      
      switch (action) {
        case 'explain-portfolio':
          response = await analystService.processUserMessage("Explain my current portfolio");
          break;
        case 'diagnose-last-trade':
          response = await analystService.diagnoseLastTrade();
          break;
        case 'daily-lessons':
          response = await analystService.generateDailyLessons();
          break;
        case 'compare-execution':
          response = await analystService.compareExecutionToPlan();
          break;
        default:
          return;
      }
      
      setMessages(analystService.getMessages());
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process quick action. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const currentPersona = ANALYST_PERSONAS.find(p => p.id === selectedPersona);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Left side - Chat with personas */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-3 min-w-0">
            <Crown className="w-6 h-6 text-accent flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">The Analyst</h1>
              <p className="text-sm text-muted-foreground truncate">
                AI-powered portfolio intelligence and market insights
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Select value={selectedPersona} onValueChange={handlePersonaChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANALYST_PERSONAS.map((persona) => (
                  <SelectItem key={persona.id} value={persona.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{persona.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {persona.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQuickActions(!showQuickActions)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 min-h-0 overflow-hidden">
          {/* Main Chat Area */}
          <Card className="lg:col-span-3 bg-gradient-card shadow-card flex flex-col min-h-0">
            <CardHeader className="flex-shrink-0 pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="w-4 h-4" />
                Chat with {currentPersona?.name}
                <DisclaimerBadge variant="minimal" component="analyst" />
              </CardTitle>
              <CardDescription className="text-sm">
                {currentPersona?.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col min-h-0 p-0 overflow-hidden">
              {/* Messages Area */}
              <ScrollArea className="flex-1 px-4">
                <div className="space-y-3 py-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          message.type === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : message.type === 'system'
                            ? 'bg-muted/50 text-muted-foreground border'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        <div className="flex items-start gap-2 mb-2">
                          {message.type === 'user' ? (
                            <User className="w-4 h-4 mt-0.5" />
                          ) : message.type === 'analyst' ? (
                            <Bot className="w-4 h-4 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs opacity-70">
                                {message.type === 'analyst' && message.persona
                                  ? ANALYST_PERSONAS.find(p => p.id === message.persona)?.name
                                  : message.type.charAt(0).toUpperCase() + message.type.slice(1)
                                }
                              </span>
                              <span className="text-xs opacity-70">
                                {formatTimestamp(message.timestamp)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="prose prose-sm max-w-none text-current">
                          {message.content.split('\n').map((line, index) => (
                            <div key={index}>
                              {line.startsWith('**') && line.endsWith('**') ? (
                                <h4 className="font-semibold text-current mb-1">
                                  {line.slice(2, -2)}
                                </h4>
                              ) : line.startsWith('*') && line.endsWith('*') ? (
                                <em className="text-current opacity-80">
                                  {line.slice(1, -1)}
                                </em>
                              ) : (
                                <p className="text-current">{line || '\u00A0'}</p>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Action Buttons */}
                        {message.actionButtons && message.actionButtons.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {message.actionButtons.map((button, index) => (
                              <Button
                                key={index}
                                variant={button.variant || 'outline'}
                                size="sm"
                                onClick={() => handleActionButtonClick(button.eventType, button.eventData)}
                              >
                                {button.label}
                              </Button>
                            ))}
                          </div>
                        )}

                        {/* Watch Next */}
                        {message.watchNext && (
                          <div className="mt-3 p-2 bg-accent/10 rounded border-l-2 border-accent">
                            <div className="flex items-start gap-2">
                              <Eye className="w-4 h-4 text-accent mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-accent">What to watch next:</p>
                                <p className="text-xs text-current opacity-80">{message.watchNext}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted text-foreground rounded-lg p-4 max-w-[80%]">
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4" />
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Analyzing...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="flex-shrink-0 p-4 border-t">
                <div className="space-y-2">
                  <LegalFooter component="analyst" variant="standard" />
                  <div className="flex gap-2">
                    <Textarea
                      ref={inputRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask about your portfolio, market conditions, or recent trades..."
                      className="flex-1 min-h-[50px] max-h-24 resize-none text-sm"
                      disabled={isLoading}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isLoading}
                      size="default"
                      className="px-4"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Context Rail */}
          <div className="space-y-3 overflow-y-auto min-h-0">
            {/* Quick Actions */}
            {showQuickActions && (
              <Card className="bg-gradient-card shadow-card">
                <CardHeader>
                  <CardTitle className="text-sm">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => handleQuickAction('explain-portfolio')}
                    disabled={isLoading}
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Explain Portfolio
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => handleQuickAction('diagnose-last-trade')}
                    disabled={isLoading}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Diagnose Last Trade
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => handleQuickAction('daily-lessons')}
                    disabled={isLoading}
                  >
                    <Bot className="w-4 h-4 mr-2" />
                    Daily Lessons
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => handleQuickAction('compare-execution')}
                    disabled={isLoading}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Compare Execution
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Portfolio Summary */}
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="text-sm">Portfolio Context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Equity</span>
                  <span className="text-sm font-medium">
                    ${portfolioData?.totalEquity?.toLocaleString() || '125,750'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Available Cash</span>
                  <span className="text-sm font-medium">
                    ${portfolioData?.availableCash?.toLocaleString() || '15,250'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Day Change</span>
                  <span className={`text-sm font-medium ${
                    (portfolioData?.dayChange || 2650) >= 0 ? 'text-accent' : 'text-destructive'
                  }`}>
                    ${(portfolioData?.dayChange || 2650).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Positions</span>
                  <span className="text-sm font-medium">
                    {portfolioData?.positionCount || 8}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Risk Metrics */}
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="text-sm">Risk Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Portfolio Beta</span>
                  <span className="text-sm font-medium">
                    {riskMetrics?.betaToMarket?.toFixed(2) || '1.12'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Max Drawdown</span>
                  <span className="text-sm font-medium text-destructive">
                    {riskMetrics?.maxDrawdown?.toFixed(1) || '4.2'}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Concentration</span>
                  <span className="text-sm font-medium">
                    {riskMetrics?.concentrationRisk ? (riskMetrics.concentrationRisk * 100).toFixed(1) : '28.5'}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Right side - Research Rail */}
      <ResearchRail />
    </div>
  );
}