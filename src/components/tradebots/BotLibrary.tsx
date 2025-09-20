import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Bot, 
  TrendingUp, 
  ArrowDown, 
  Zap, 
  Shield, 
  Timer,
  Play,
  Info,
  Star,
  AlertTriangle,
  BookOpen
} from 'lucide-react';
import { botTemplateService, type BotTemplate } from '@/services/botTemplates';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { LockedCard } from '@/components/subscription/LockedCard';
import { BotTemplateModal } from './BotTemplateModal';

interface BotLibraryProps {
  onBotDeployed?: (botId: string, templateName: string) => void;
}

const CATEGORY_ICONS = {
  momentum: TrendingUp,
  mean_reversion: ArrowDown,
  breakout: Zap,
  risk_management: Shield,
  scalping: Timer
};

const RISK_COLORS = {
  low: 'text-green-600 bg-green-50 border-green-200',
  medium: 'text-amber-600 bg-amber-50 border-amber-200',
  high: 'text-red-600 bg-red-50 border-red-200'
};

const COMPLEXITY_COLORS = {
  beginner: 'text-blue-600 bg-blue-50 border-blue-200',
  intermediate: 'text-purple-600 bg-purple-50 border-purple-200',
  advanced: 'text-red-600 bg-red-50 border-red-200'
};

export function BotLibrary({ onBotDeployed }: BotLibraryProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<BotTemplate | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();
  const { subscriptionStatus, checkTabAccess } = useSubscriptionAccess();

  // Check if user can access bot library
  const canAccessBots = checkTabAccess('/trade-bots').hasAccess;
  const userTier = subscriptionStatus?.tier || 'lite';

  if (!canAccessBots) {
    return (
      <LockedCard 
        feature="Default Bot Library"
      />
    );
  }

  const availableTemplates = botTemplateService.getTemplates(userTier as any);
  
  const handleDeployBot = async (template: BotTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateModal(true);
  };

  const confirmDeployment = async (template: BotTemplate, customAllocation?: number) => {
    const botId = botTemplateService.deployTemplate(template.id, {
      allocation: customAllocation || template.default_config.allocation
    });

    if (botId) {
      toast({
        title: "Bot Deployed Successfully",
        description: `${template.name} has been activated and is ready to trade.`
      });
      
      onBotDeployed?.(botId, template.name);
      setShowTemplateModal(false);
      setSelectedTemplate(null);
    } else {
      toast({
        title: "Deployment Failed",
        description: "Unable to deploy the bot. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getFilteredTemplates = (category?: string) => {
    if (category === 'all' || !category) return availableTemplates;
    return availableTemplates.filter(template => template.category === category);
  };

  const CategoryIcon = ({ category }: { category: BotTemplate['category'] }) => {
    const IconComponent = CATEGORY_ICONS[category];
    return <IconComponent className="w-5 h-5" />;
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Bot className="w-6 h-6" />
              Default Bot Library
            </h2>
            <p className="text-muted-foreground mt-1">
              Pre-built trading strategies ready for deployment
            </p>
          </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              {userTier?.toUpperCase()} Member
            </Badge>
        </div>

        {/* Category Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">All Bots</TabsTrigger>
            <TabsTrigger value="momentum">Momentum</TabsTrigger>
            <TabsTrigger value="mean_reversion">Mean Rev.</TabsTrigger>
            <TabsTrigger value="breakout">Breakout</TabsTrigger>
            <TabsTrigger value="risk_management">Risk Mgmt</TabsTrigger>
            <TabsTrigger value="scalping">Scalping</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {availableTemplates.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Bots Available</h3>
                  <p className="text-muted-foreground">
                    Upgrade to Pro or Elite tier to access our default bot library.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {getFilteredTemplates(activeTab).map((template) => (
                    <Card key={template.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <CategoryIcon category={template.category} />
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${RISK_COLORS[template.risk_level]}`}
                            >
                              {template.risk_level} risk
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${COMPLEXITY_COLORS[template.complexity]}`}
                            >
                              {template.complexity}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {template.description}
                        </p>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Strategy Overview */}
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-semibold mb-1 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              Entry Rules
                            </h4>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {template.entry_rules.slice(0, 2).map((rule, idx) => (
                                <li key={idx} className="flex items-start gap-1">
                                  <span className="text-green-500 mt-0.5">•</span>
                                  {rule}
                                </li>
                              ))}
                              {template.entry_rules.length > 2 && (
                                <li className="text-xs text-muted-foreground">
                                  +{template.entry_rules.length - 2} more rules...
                                </li>
                              )}
                            </ul>
                          </div>

                          <div>
                            <h4 className="text-sm font-semibold mb-1 flex items-center gap-1">
                              <ArrowDown className="w-3 h-3" />
                              Exit Rules
                            </h4>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {template.exit_rules.slice(0, 2).map((rule, idx) => (
                                <li key={idx} className="flex items-start gap-1">
                                  <span className="text-red-500 mt-0.5">•</span>
                                  {rule}
                                </li>
                              ))}
                              {template.exit_rules.length > 2 && (
                                <li className="text-xs text-muted-foreground">
                                  +{template.exit_rules.length - 2} more rules...
                                </li>
                              )}
                            </ul>
                          </div>
                        </div>

                        <Separator />

                        {/* Performance Metrics */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Max Daily Trades:</span>
                            <div className="font-semibold">{template.trade_limits.max_trades_per_day}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Default Allocation:</span>
                            <div className="font-semibold">${template.default_config.allocation.toLocaleString()}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Stop Loss:</span>
                            <div className="font-semibold">{template.trade_limits.stop_loss_pct}%</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Take Profit:</span>
                            <div className="font-semibold">{template.trade_limits.take_profit_pct || 'Variable'}%</div>
                          </div>
                        </div>

                        <Separator />

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <Button 
                            onClick={() => handleDeployBot(template)}
                            className="flex-1"
                            size="sm"
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Deploy Bot
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedTemplate(template);
                              // Could open a detailed info modal here
                            }}
                          >
                            <Info className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Educational Note */}
                        {template.educational_notes.length > 0 && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                            <div className="flex items-start gap-2">
                              <BookOpen className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-blue-800 dark:text-blue-200">
                                <strong>Pro Tip:</strong> {template.educational_notes[0]}
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        {/* Tier Upgrade Notice for Elite Bots */}
        {userTier === 'pro' && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <div>
                  <h4 className="font-semibold text-amber-800 dark:text-amber-200">
                    Unlock Advanced Bots
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Upgrade to Elite to access the Scalper bot and full strategy editing capabilities.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Deployment Modal */}
      {selectedTemplate && (
        <BotTemplateModal
          isOpen={showTemplateModal}
          onClose={() => {
            setShowTemplateModal(false);
            setSelectedTemplate(null);
          }}
          template={selectedTemplate}
          onConfirm={confirmDeployment}
        />
      )}
    </>
  );
}