import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Book,
  Search,
  BarChart3,
  TrendingUp,
  Briefcase,
  Activity,
  Brain,
  LineChart,
  Crown,
  ExternalLink,
  Baby,
  Settings,
  Shield,
  Monitor,
  CreditCard,
  Info,
  ChevronRight,
  Play,
  FileText,
  Users,
  Lightbulb,
  Target,
  AlertCircle
} from 'lucide-react';

interface ManualSection {
  id: string;
  title: string;
  description: string;
  icon: any;
  content: string[];
  tips?: string[];
  warnings?: string[];
}

export default function UserManual() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('overview');

  const sections: ManualSection[] = [
    {
      id: 'overview',
      title: 'Platform Overview',
      description: 'Introduction to StagAlgo and its core features',
      icon: Book,
      content: [
        'StagAlgo is a comprehensive algorithmic trading platform designed for both novice and professional traders.',
        'The platform combines AI-powered market analysis, real-time charting, automated trading strategies, and comprehensive risk management.',
        'Built with a modern architecture, StagAlgo provides multi-tier access (Lite, Standard, Pro, Elite) to accommodate different trading needs and experience levels.',
        'The platform integrates with major brokerages and provides both paper trading for learning and live trading for execution.'
      ],
      tips: [
        'Start with the demo mode to familiarize yourself with the interface',
        'Review your subscription tier to understand available features',
        'Complete the onboarding process for optimal setup'
      ]
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'Main overview and analytics hub',
      icon: BarChart3,
      content: [
        'The Dashboard is your central command center, providing a comprehensive overview of your trading performance and market conditions.',
        'Key metrics include portfolio value, daily P&L, win rate, and recent trading activity.',
        'The dashboard features customizable widgets that can be arranged according to your preferences.',
        'Real-time updates ensure you always have the latest information about your positions and market opportunities.',
        'Performance analytics help you track your trading progress over different time periods.'
      ],
      tips: [
        'Customize your dashboard layout for optimal workflow',
        'Use the quick action buttons for common tasks',
        'Monitor the alerts panel for important notifications'
      ]
    },
    {
      id: 'intelligence',
      title: 'Intelligence Hub',
      description: 'AI analysis and Oracle signals',
      icon: Brain,
      content: [
        'The Intelligence Hub houses StagAlgo\'s AI-powered market analysis capabilities.',
        'Oracle signals provide real-time market insights based on multiple data sources and machine learning algorithms.',
        'The AI Analyst offers conversational market analysis and can answer questions about specific stocks or market conditions.',
        'Voice interaction allows for hands-free operation and quick queries.',
        'Historical signal performance tracking helps validate the effectiveness of AI recommendations.'
      ],
      tips: [
        'Use voice commands for quick market queries',
        'Review Oracle signal accuracy over time',
        'Combine AI insights with your own analysis'
      ],
      warnings: [
        'AI analysis should supplement, not replace, your own research',
        'Past performance of signals does not guarantee future results'
      ]
    },
    {
      id: 'market',
      title: 'Market Center',
      description: 'Market data and stock screening',
      icon: TrendingUp,
      content: [
        'Market Center provides comprehensive market data, stock screening, and research capabilities.',
        'Real-time quotes, charts, and market statistics help inform your trading decisions.',
        'Advanced screening tools allow you to find stocks based on specific criteria.',
        'Market news and analysis keep you informed about factors affecting stock prices.',
        'Watchlists help you monitor your favorite securities and potential opportunities.'
      ],
      tips: [
        'Create multiple watchlists for different strategies',
        'Use screening filters to find trading opportunities',
        'Set up alerts for significant price movements'
      ]
    },
    {
      id: 'portfolio',
      title: 'Portfolio Management',
      description: 'Track positions and performance',
      icon: Briefcase,
      content: [
        'Portfolio Management provides detailed tracking of your current positions and trading history.',
        'Real-time position values, unrealized P&L, and performance metrics are continuously updated.',
        'Trade history with detailed execution information helps with performance analysis.',
        'Risk metrics and exposure analysis help manage portfolio concentration.',
        'Performance attribution shows which trades contributed most to your results.'
      ],
      tips: [
        'Regularly review your position sizes and risk exposure',
        'Use the performance analytics to identify successful strategies',
        'Monitor correlation between positions to avoid concentration risk'
      ]
    },
    {
      id: 'trading-desk',
      title: 'Trading Desk',
      description: 'Order placement and execution',
      icon: Activity,
      content: [
        'The Trading Desk is where you place and manage orders across different markets.',
        'Multiple order types including market, limit, stop, and advanced orders are supported.',
        'Real-time order status tracking and execution confirmation provide transparency.',
        'Risk checks are automatically applied before orders are submitted.',
        'Integration with connected brokerages enables seamless order routing.'
      ],
      tips: [
        'Always review order details before submission',
        'Use appropriate order types for your strategy',
        'Monitor order status and be prepared to cancel if needed'
      ],
      warnings: [
        'Live trading involves real money and risk of loss',
        'Ensure you understand order types before placing trades',
        'Market conditions can affect order execution'
      ]
    },
    {
      id: 'charts',
      title: 'Advanced Charting',
      description: 'Technical analysis and chart tools',
      icon: LineChart,
      content: [
        'Advanced Charting provides professional-grade technical analysis tools.',
        'Multiple timeframes from minute charts to monthly views are available.',
        'Comprehensive technical indicators including moving averages, oscillators, and momentum indicators.',
        'Drawing tools for trend lines, support/resistance levels, and pattern recognition.',
        'Multiple chart layouts allow for complex multi-symbol analysis.'
      ],
      tips: [
        'Learn keyboard shortcuts for faster chart navigation',
        'Save chart templates for consistent analysis',
        'Use multiple timeframes to confirm signals'
      ]
    },
    {
      id: 'workspace',
      title: 'Elite Workspace',
      description: 'Multi-panel professional environment',
      icon: Crown,
      content: [
        'The Elite Workspace provides a professional multi-panel trading environment (Elite tier only).',
        'Drag-and-drop panels can be arranged in custom layouts for optimal workflow.',
        'Multiple chart panels, order entry, position monitoring, and news can be displayed simultaneously.',
        'Saved workspace layouts can be quickly recalled for different trading scenarios.',
        'Advanced users can create complex monitoring and analysis setups.'
      ],
      tips: [
        'Create different workspace layouts for different strategies',
        'Use the bubble mode for focused single-task work',
        'Save frequently used layouts for quick access'
      ]
    },
    {
      id: 'brokerage-dock',
      title: 'Brokerage Dock',
      description: 'External account integration',
      icon: ExternalLink,
      content: [
        'Brokerage Dock allows you to connect and manage multiple external brokerage accounts.',
        'Secure credential storage with encryption protects your login information.',
        'Real-time synchronization keeps your positions and balances up to date.',
        'Cross-platform trading enables order placement across different brokerages.',
        'Aggregated portfolio view combines positions from all connected accounts.'
      ],
      tips: [
        'Regularly update your brokerage credentials',
        'Monitor connection status for each account',
        'Use the dock for accessing brokerage-specific features'
      ],
      warnings: [
        'Only connect to legitimate, regulated brokerages',
        'Keep your brokerage credentials secure and up to date',
        'Be aware of different brokerage fees and policies'
      ]
    },
    {
      id: 'cradle',
      title: 'Strategy Cradle',
      description: 'Strategy development and backtesting',
      icon: Baby,
      content: [
        'The Strategy Cradle is your development environment for creating and testing trading strategies.',
        'Spreadsheet-like interface allows for complex formula creation and data analysis.',
        'Built-in functions provide access to market data, technical indicators, and portfolio information.',
        'Backtesting capabilities let you validate strategies against historical data.',
        'Strategy templates help you get started with proven approaches.'
      ],
      tips: [
        'Start with simple strategies before building complex ones',
        'Use historical data to validate your approach',
        'Test strategies thoroughly before live implementation'
      ]
    },
    {
      id: 'paper-trading',
      title: 'Paper Trading Sandbox',
      description: 'Risk-free trading practice',
      icon: Target,
      content: [
        'Paper Trading provides a risk-free environment to practice trading strategies (Standard tier and above).',
        'Virtual $100,000 account allows realistic trading simulation without real money risk.',
        'All order types and market conditions are simulated to match real trading.',
        'Complete trade history and performance tracking help evaluate your strategies.',
        'Perfect for learning the platform and testing new approaches.'
      ],
      tips: [
        'Treat paper trading seriously to build good habits',
        'Test different order types and strategies',
        'Use paper trading to learn the platform before live trading'
      ]
    },
    {
      id: 'settings',
      title: 'Settings & Configuration',
      description: 'Platform customization and preferences',
      icon: Settings,
      content: [
        'Settings allow you to customize the platform to match your preferences and trading style.',
        'Risk management settings help control position sizing and exposure limits.',
        'Notification preferences ensure you receive important alerts via your preferred channels.',
        'Display settings control themes, layouts, and visual preferences.',
        'API connections and integrations can be managed from the settings panel.'
      ],
      tips: [
        'Review and adjust risk settings before live trading',
        'Set up notifications for important events',
        'Customize the interface for optimal productivity'
      ]
    }
  ];

  const filteredSections = sections.filter(section =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.content.some(content => content.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedSectionData = sections.find(s => s.id === selectedSection) || sections[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Book className="w-8 h-8 text-primary" />
          StagAlgo User Manual
        </h1>
        <p className="text-muted-foreground mt-2">
          Complete guide to using all features of the StagAlgo trading platform
        </p>
      </div>

      {/* Search */}
      <Card className="bg-gradient-card shadow-card">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search the manual..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation */}
        <Card className="lg:col-span-1 bg-gradient-card shadow-card h-fit">
          <CardHeader>
            <CardTitle className="text-sm">Manual Sections</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="space-y-1 p-4">
                {filteredSections.map((section) => (
                  <Button
                    key={section.id}
                    variant={selectedSection === section.id ? "default" : "ghost"}
                    className="w-full justify-start text-left p-2 h-auto"
                    onClick={() => setSelectedSection(section.id)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <section.icon className="w-4 h-4 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {section.title}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {section.description}
                        </div>
                      </div>
                      <ChevronRight className="w-3 h-3 flex-shrink-0 opacity-50" />
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Content */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <selectedSectionData.icon className="w-6 h-6 text-primary" />
                {selectedSectionData.title}
              </CardTitle>
              <CardDescription>{selectedSectionData.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Main Content */}
              <div className="space-y-4">
                {selectedSectionData.content.map((paragraph, index) => (
                  <p key={index} className="text-sm leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Tips */}
              {selectedSectionData.tips && (
                <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-accent" />
                    <h4 className="font-semibold text-accent">Pro Tips</h4>
                  </div>
                  <ul className="space-y-2">
                    {selectedSectionData.tips.map((tip, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {selectedSectionData.warnings && (
                <div className="bg-warning/10 p-4 rounded-lg border border-warning/20">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-warning" />
                    <h4 className="font-semibold text-warning">Important Warnings</h4>
                  </div>
                  <ul className="space-y-2">
                    {selectedSectionData.warnings.map((warning, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-warning mt-2 flex-shrink-0" />
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Reference */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5 text-primary" />
                Quick Start Guide
              </CardTitle>
              <CardDescription>
                Essential steps to get started with StagAlgo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold">For New Users:</h4>
                  <ol className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Badge variant="outline" className="text-xs px-2 py-0 mt-0.5">1</Badge>
                      Complete account setup and subscription selection
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge variant="outline" className="text-xs px-2 py-0 mt-0.5">2</Badge>
                      Explore the platform in demo mode
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge variant="outline" className="text-xs px-2 py-0 mt-0.5">3</Badge>
                      Practice with Paper Trading Sandbox
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge variant="outline" className="text-xs px-2 py-0 mt-0.5">4</Badge>
                      Connect your brokerage account
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge variant="outline" className="text-xs px-2 py-0 mt-0.5">5</Badge>
                      Configure risk management settings
                    </li>
                  </ol>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold">Key Resources:</h4>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                      <FileText className="w-4 h-4" />
                      Download Desktop App
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                      <Users className="w-4 h-4" />
                      Join Community Forum
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                      <Play className="w-4 h-4" />
                      Watch Video Tutorials
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                      <Shield className="w-4 h-4" />
                      Contact Support
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}