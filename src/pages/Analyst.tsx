import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
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
import { bid } from '@/services/bid';
import { eventBus } from '@/services/eventBus';
import { useToast } from '@/hooks/use-toast';
import { useCompliance } from '@/components/compliance/ComplianceProvider';
import { ResearchRail } from '@/components/research/ResearchRail';
import { DisclaimerBadge } from '@/components/compliance/DisclaimerBadge';
import { LegalFooter } from '@/components/compliance/LegalFooter';
import { useScreenSize } from '@/hooks/use-mobile';
import { userBID } from '@/services/userBID';
import { useAuthStore } from '@/stores/authStore';
import type { ProcessedSignal } from '@/types/oracle';
import { AnalystV2Panel, BacktestPanel, SystemHealthPanel, PortfolioPlannerPanel, AuditLogPanel, PoliciesPanel, ExperimentsPanel, OracleModelsPanel, AnalystChatPanel } from '@/components/analyst';
import { PredictiveDashboard } from '@/components/oracle/PredictiveDashboard';
import { AnalystHealthCard } from '@/components/analyst/AnalystHealthCard';

interface AnalystProps {
  selectedSignal?: ProcessedSignal | null;
}

export default function Analyst(props: AnalystProps = {}) {
  const { selectedSignal } = props;
  const [messages, setMessages] = useState<AnalystMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const { toast } = useToast();
  const { showDisclaimer } = useCompliance();
  const { isMobile, isTablet } = useScreenSize();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Portfolio context data
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [riskMetrics, setRiskMetrics] = useState<any>(null);

  const [hasProcessedSignal, setHasProcessedSignal] = useState<string | null>(null);

  useEffect(() => {
    // Start analyst session and load initial data
    analystService.startSession();
    loadContextData();
    
    // Initialize user BID profile
    const initUserBID = async () => {
      try {
        const authStore = useAuthStore.getState();
        if (authStore.user) {
          await userBID.initializeUserProfile(authStore.user.id);
        }
      } catch (error) {
        console.error('Failed to initialize user BID:', error);
      }
    };
    
    initUserBID();
    
    // Trigger session start disclaimer when Analyst is accessed
    showDisclaimer('analyst', 'view');
    
    // Subscribe to events
    const handlePortfolioUpdate = () => loadContextData();
    eventBus.on('portfolio.updated', handlePortfolioUpdate);

    return () => {
      analystService.endSession();
      // Remove event listener
      eventBus.off('portfolio.updated', handlePortfolioUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Remove selectedSignal from deps to prevent infinite loop

  // Separate effect for processing selected signal
  useEffect(() => {
    if (selectedSignal && selectedSignal.id !== hasProcessedSignal) {
      const processSignal = async () => {
        try {
          const message = `Please analyze this Oracle signal: "${selectedSignal.signal}" for ${selectedSignal.symbol || 'the market'}. Signal type: ${selectedSignal.type.replace('_', ' ')}, Severity: ${selectedSignal.severity}, Direction: ${selectedSignal.direction}, Confidence: ${Math.round(selectedSignal.confidence * 100)}%. Description: ${selectedSignal.description}`;
          await analystService.processUserMessage(message);
          setMessages(analystService.getMessages());
          setHasProcessedSignal(selectedSignal.id);
        } catch (error) {
          console.error('Failed to analyze signal:', error);
          toast({
            title: "Analysis Error", 
            description: "Failed to analyze the selected signal",
            variant: "destructive"
          });
        }
      };

      processSignal();
    }
  }, [selectedSignal, hasProcessedSignal, toast]);

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
      // Use enhanced analyst service with BID integration
      const response = await supabase.functions.invoke('analyst-chat-enhanced', {
        body: {
          message: userInput,
          workspace_id: 'demo-workspace'
        }
      });

      if (response.error) throw response.error;

      // Add user message
      const userMessage: AnalystMessage = {
        id: `msg_${Date.now()}_user`,
        timestamp: new Date(),
        type: 'user',
        content: userInput
      };

      // Add analyst response
      const analystMessage: AnalystMessage = {
        id: `msg_${Date.now()}_analyst`,
        timestamp: new Date(),
        type: 'analyst',
        content: response.data.response
      };

      setMessages(prev => [...prev, userMessage, analystMessage]);
      
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

  // Persona selection removed - using single Strategic Analyst

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

  return (
    <div className={`${isMobile ? 'flex flex-col h-[calc(100vh-8rem)]' : 'flex h-screen'} bg-background overflow-hidden`}>
      {/* Phase III - Tabbed Interface */}
      <div className="w-full p-4">
        <Tabs defaultValue="v2" className="space-y-4">
          <TabsList className="grid w-full grid-cols-10 gap-1">
            <TabsTrigger value="v2">Analyst v2</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="backtest">Backtest</TabsTrigger>
            <TabsTrigger value="health">Health</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
            <TabsTrigger value="experiments">Experiments</TabsTrigger>
            <TabsTrigger value="oracle">Oracle</TabsTrigger>
            <TabsTrigger value="predictive">Predictive</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="v2" className="space-y-4">
            <AnalystV2Panel />
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-4">
            <PortfolioPlannerPanel />
          </TabsContent>

          <TabsContent value="backtest" className="space-y-4">
            <BacktestPanel />
          </TabsContent>

          <TabsContent value="health" className="space-y-4">
            <AnalystHealthCard />
            <SystemHealthPanel />
          </TabsContent>

          <TabsContent value="policies" className="space-y-4">
            <PoliciesPanel />
          </TabsContent>

          <TabsContent value="experiments" className="space-y-4">
            <ExperimentsPanel />
          </TabsContent>

          <TabsContent value="oracle" className="space-y-4">
            <OracleModelsPanel />
          </TabsContent>

          <TabsContent value="predictive" className="space-y-4">
            <PredictiveDashboard />
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <AuditLogPanel />
          </TabsContent>

          <TabsContent value="chat" className="space-y-4">
            <AnalystChatPanel />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Right side - Research Rail */}
      <ResearchRail />
    </div>
  );
}