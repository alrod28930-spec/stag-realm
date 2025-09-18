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
        'Built with a modern architecture featuring a moonlit awareness interface design, StagAlgo provides multi-tier access (Standard, Pro, Elite) to accommodate different trading needs and experience levels.',
        'The platform integrates with major brokerages and provides both paper trading for learning and live trading for execution.',
        'Enhanced visual awareness features including moonlit border glow help maintain focus during active trading sessions.',
        'All features are compliant with financial regulations and include comprehensive disclaimers and risk management.'
      ],
      tips: [
        'Start with the demo mode to familiarize yourself with the interface',
        'Review your subscription tier to understand available features',
        'Complete the onboarding process for optimal setup',
        'Notice the subtle moonlit glow that indicates active trading mode'
      ]
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'Main overview and analytics hub',
      icon: BarChart3,
      content: [
        'The Dashboard is your central command center, providing a comprehensive overview of your trading performance and market conditions.',
        'Key metrics include portfolio value, daily P&L, win rate, and recent trading activity with real-time updates.',
        'The dashboard features customizable widgets that can be arranged according to your preferences.',
        'Real-time updates ensure you always have the latest information about your positions and market opportunities.',
        'Performance analytics help you track your trading progress over different time periods.',
        'Mini Oracle Widget provides quick access to AI insights directly from the dashboard.',
        'Learning Dashboard component helps track your educational progress and skill development.'
      ],
      tips: [
        'Customize your dashboard layout for optimal workflow',
        'Use the quick action buttons for common tasks',
        'Monitor the alerts panel for important notifications',
        'Check the Mini Oracle Widget for quick market insights'
      ]
    },
    {
      id: 'intelligence',
      title: 'Intelligence Hub',
      description: 'AI analysis and Oracle signals',
      icon: Brain,
      content: [
        'The Intelligence Hub houses StagAlgo\'s AI-powered market analysis capabilities with enhanced voice interaction.',
        'Oracle signals provide real-time market insights based on multiple data sources and machine learning algorithms.',
        'The AI Analyst offers conversational market analysis and can answer questions about specific stocks or market conditions.',
        'Voice interaction allows for hands-free operation and quick queries with the Global Voice Interface.',
        'Historical signal performance tracking helps validate the effectiveness of AI recommendations.',
        'Quick Analyst Button provides instant access to voice-powered market analysis.',
        'Voice-to-text functionality enables seamless communication with AI systems.'
      ],
      tips: [
        'Use voice commands for quick market queries',
        'Review Oracle signal accuracy over time',
        'Combine AI insights with your own analysis',
        'Try the Quick Analyst feature for rapid voice queries'
      ],
      warnings: [
        'AI analysis should supplement, not replace, your own research',
        'Past performance of signals does not guarantee future results',
        'Always verify AI recommendations with additional research'
      ]
    },
    {
      id: 'market',
      title: 'Market Center',
      description: 'Market data and stock screening',
      icon: TrendingUp,
      content: [
        'Market Center provides comprehensive market data, stock screening, and research capabilities with enhanced search functionality.',
        'Real-time quotes, charts, and market statistics help inform your trading decisions.',
        'Advanced screening tools allow you to find stocks based on specific criteria with Full Search Page integration.',
        'Market news and analysis keep you informed about factors affecting stock prices.',
        'Watchlists help you monitor your favorite securities and potential opportunities.',
        'Market Data Disclaimer ensures compliance with data usage regulations.',
        'Research Rail provides quick access to analytical tools and market insights.'
      ],
      tips: [
        'Create multiple watchlists for different strategies',
        'Use screening filters to find trading opportunities',
        'Set up alerts for significant price movements',
        'Utilize the Full Search Page for comprehensive market exploration'
      ]
    },
    {
      id: 'portfolio',
      title: 'Portfolio Management',
      description: 'Track positions and performance',
      icon: Briefcase,
      content: [
        'Portfolio Management provides detailed tracking of your current positions and trading history with enhanced grid views.',
        'Real-time position values, unrealized P&L, and performance metrics are continuously updated.',
        'Trade history with detailed execution information helps with performance analysis.',
        'Risk metrics and exposure analysis help manage portfolio concentration.',
        'Performance attribution shows which trades contributed most to your results.',
        'Portfolio Grid component offers advanced filtering and sorting capabilities.',
        'Position Mini Charts provide quick visual performance indicators for each holding.'
      ],
      tips: [
        'Regularly review your position sizes and risk exposure',
        'Use the performance analytics to identify successful strategies',
        'Monitor correlation between positions to avoid concentration risk',
        'Check Position Mini Charts for quick performance overviews'
      ]
    },
    {
      id: 'trading-desk',
      title: 'Trading Desk',
      description: 'Order placement and execution',
      icon: Activity,
      content: [
        'The Trading Desk is where you place and manage orders across different markets with enhanced risk management.',
        'Multiple order types including market, limit, stop, and advanced orders are supported.',
        'Real-time order status tracking and execution confirmation provide transparency.',
        'Risk-aware trading panels with automatic risk checks are applied before orders are submitted.',
        'Integration with connected brokerages enables seamless order routing.',
        'Manual Order Cards and Order Tickets provide intuitive order entry interfaces.',
        'Bot Execution Panel allows automated trading strategy deployment.',
        'Paper Trading Test Panel enables risk-free strategy validation.',
        'Comprehensive compliance footer ensures regulatory awareness.'
      ],
      tips: [
        'Always review order details before submission',
        'Use appropriate order types for your strategy',
        'Monitor order status and be prepared to cancel if needed',
        'Test strategies in Paper Trading mode first',
        'Use Risk-Aware Trading Panel for enhanced safety'
      ],
      warnings: [
        'Live trading involves real money and risk of loss',
        'Ensure you understand order types before placing trades',
        'Market conditions can affect order execution',
        'Always acknowledge risk disclaimers before proceeding'
      ]
    },
    {
      id: 'charts',
      title: 'Advanced Charting',
      description: 'Technical analysis and chart tools',
      icon: LineChart,
      content: [
        'Advanced Charting provides professional-grade technical analysis tools with multi-panel support.',
        'Multiple timeframes from minute charts to monthly views are available.',
        'Comprehensive technical indicators including moving averages, oscillators, and momentum indicators.',
        'Drawing tools for trend lines, support/resistance levels, and pattern recognition.',
        'Multiple chart layouts allow for complex multi-symbol analysis.',
        'Real-Time Trading Chart integration enables direct order placement from charts.',
        'Candlestick Chart with advanced pattern recognition capabilities.',
        'Oracle Overlay provides AI insights directly on chart displays.',
        'Error Boundary protection ensures stable chart performance.'
      ],
      tips: [
        'Learn keyboard shortcuts for faster chart navigation',
        'Save chart templates for consistent analysis',
        'Use multiple timeframes to confirm signals',
        'Enable Oracle Overlay for AI-powered insights',
        'Utilize Drawing Tools for technical analysis'
      ]
    },
    {
      id: 'workspace',
      title: 'Elite Workspace',
      description: 'Multi-panel professional environment (Elite tier)',
      icon: Crown,
      content: [
        'The Elite Workspace provides a professional multi-panel trading environment exclusive to Elite tier subscribers.',
        'Drag-and-drop panels can be arranged in custom layouts for optimal workflow optimization.',
        'Multiple chart panels, order entry, position monitoring, and news can be displayed simultaneously.',
        'Saved workspace layouts can be quickly recalled for different trading scenarios.',
        'Bubble Mode provides distraction-free full-screen workspace experience.',
        'Keyboard shortcuts (Cmd/Ctrl + B) enable quick workspace toggling.',
        'Layout presets (1x1, 1x2, 2x1, 2x2) provide quick configuration options.',
        'Auto-save functionality preserves your workspace configuration.',
        'Advanced users can create complex monitoring and analysis setups.'
      ],
      tips: [
        'Create different workspace layouts for different strategies',
        'Use Bubble Mode for focused single-task work',
        'Save frequently used layouts for quick access',
        'Learn keyboard shortcuts for efficient workspace navigation',
        'Experiment with different panel arrangements for optimal workflow'
      ]
    },
    {
      id: 'tradebots',
      title: 'Trade Bots & Automation',
      description: 'Automated trading strategies and bot management',
      icon: Brain,
      content: [
        'Trade Bots provide automated trading capabilities with sophisticated risk management.',
        'Day Trading Cards offer quick setup for intraday trading strategies.',
        'Risk Goals Cards help establish and maintain appropriate risk parameters.',
        'Strategy Library provides proven algorithmic trading approaches.',
        'Bot Configuration Panel enables detailed strategy customization.',
        'Aggressive Mode Disclaimer ensures proper risk acknowledgment.',
        'Bot Feedback Panel provides performance analytics and adjustment recommendations.',
        'Risk Disclaimer Modal ensures proper understanding of automated trading risks.',
        'Integration with paper trading for safe strategy testing.'
      ],
      tips: [
        'Start with conservative risk settings',
        'Test all strategies in paper trading first',
        'Monitor bot performance regularly',
        'Understand risk disclaimers before enabling aggressive modes',
        'Use Strategy Library for proven approaches'
      ],
      warnings: [
        'Automated trading can lead to rapid losses',
        'Always understand the strategy before deployment',
        'Monitor market conditions that may require manual intervention',
        'Bot performance does not guarantee future results'
      ]
    },
    {
      id: 'brokerage-dock',
      title: 'Brokerage Dock',
      description: 'External account integration and management',
      icon: ExternalLink,
      content: [
        'Brokerage Dock allows you to connect and manage multiple external brokerage accounts securely.',
        'Secure credential storage with encryption protects your login information using advanced security protocols.',
        'Real-time synchronization keeps your positions and balances up to date across all connected accounts.',
        'Cross-platform trading enables order placement across different brokerages from a single interface.',
        'Aggregated portfolio view combines positions from all connected accounts.',
        'Brokerage Connection Cards provide intuitive account management.',
        'Alpaca integration offers comprehensive broker adapter functionality.',
        'Settings panel allows configuration of brokerage-specific preferences.'
      ],
      tips: [
        'Regularly update your brokerage credentials',
        'Monitor connection status for each account',
        'Use the dock for accessing brokerage-specific features',
        'Test connections before live trading',
        'Review security settings regularly'
      ],
      warnings: [
        'Only connect to legitimate, regulated brokerages',
        'Keep your brokerage credentials secure and up to date',
        'Be aware of different brokerage fees and policies',
        'Understand data sharing implications'
      ]
    },
    {
      id: 'cradle',
      title: 'Strategy Cradle & Development Lab',
      description: 'Advanced strategy development and backtesting environment',
      icon: Baby,
      content: [
        'The Strategy Cradle is your comprehensive development environment for creating and testing trading strategies.',
        'Excel-like spreadsheet interface allows for complex formula creation and data analysis with advanced formula support.',
        'Built-in functions provide access to market data, technical indicators, and portfolio information.',
        'Monte Carlo Simulation capabilities enable robust strategy validation.',
        'Strategy Testing framework provides comprehensive backtesting tools.',
        'Excel Toolbar and Formula Bar provide familiar spreadsheet functionality.',
        'Compliance Banner ensures educational use acknowledgment.',
        'Strategy Templates help you get started with proven approaches.',
        'Advanced Excel engine supports complex financial calculations.'
      ],
      tips: [
        'Start with simple strategies before building complex ones',
        'Use historical data to validate your approach',
        'Test strategies thoroughly before live implementation',
        'Leverage Monte Carlo simulations for robust testing',
        'Save strategy templates for reuse'
      ],
      warnings: [
        'Cradle is for educational and experimental use only',
        'Backtesting results do not guarantee future performance',
        'Always validate strategies with multiple testing methods'
      ]
    },
    {
      id: 'paper-trading',
      title: 'Paper Trading Sandbox',
      description: 'Risk-free trading practice and strategy validation',
      icon: Target,
      content: [
        'Paper Trading provides a comprehensive risk-free environment to practice trading strategies (Standard tier and above).',
        'Virtual $100,000 account allows realistic trading simulation without real money risk.',
        'All order types and market conditions are simulated to match real trading environments.',
        'Complete trade history and performance tracking help evaluate your strategies.',
        'Paper Trading Tester service validates strategy performance automatically.',
        'Demo Mode integration provides seamless transition between real and simulated trading.',
        'Perfect for learning the platform and testing new approaches safely.'
      ],
      tips: [
        'Treat paper trading seriously to build good habits',
        'Test different order types and strategies',
        'Use paper trading to learn the platform before live trading',
        'Monitor performance metrics just as you would in live trading',
        'Practice risk management techniques'
      ]
    },
    {
      id: 'compliance',
      title: 'Compliance & Risk Management',
      description: 'Regulatory compliance and risk oversight',
      icon: Shield,
      content: [
        'Comprehensive compliance system ensures adherence to financial regulations and best practices.',
        'Tier Compliance Guard manages access based on subscription level and compliance status.',
        'Risk Acknowledgment Modals ensure proper understanding of trading risks.',
        'Compliance Dashboard provides overview of regulatory status and requirements.',
        'Legal Documents Modal provides access to terms of service and agreements.',
        'Disclaimer Badges and Banners ensure continuous risk awareness.',
        'Compliance Onboarding guides users through regulatory requirements.',
        'Automatic compliance checking and reporting functionality.'
      ],
      tips: [
        'Complete all compliance requirements promptly',
        'Read and understand all risk disclosures',
        'Keep compliance status up to date',
        'Contact support for compliance questions'
      ],
      warnings: [
        'Non-compliance may restrict platform access',
        'Trading regulations vary by jurisdiction',
        'Always understand your regulatory obligations'
      ]
    },
    {
      id: 'subscription',
      title: 'Subscription Management',
      description: 'Plan management and billing',
      icon: CreditCard,
      content: [
        'Subscription system provides flexible tier-based access to platform features.',
        'Standard ($99/month): Dashboard, Intelligence, Market tabs + live trading access.',
        'Pro ($199/month): Adds Portfolio, Trading Desk, Charts + advanced features.',
        'Elite ($299/month): Full platform access including Workspace and Cradle.',
        'Billing Management provides invoice access and payment method updates.',
        'Plan Cards show feature comparisons and upgrade options.',
        'Demo Mode Banner guides subscription decisions.',
        'Lock Guards prevent access to premium features based on subscription tier.',
        'Upgrade CTA components facilitate plan changes.'
      ],
      tips: [
        'Choose the plan that matches your trading needs',
        'Start with lower tiers and upgrade as needed',
        'Monitor feature usage to optimize subscription value',
        'Keep billing information up to date'
      ]
    },
    {
      id: 'voice-interface',
      title: 'Voice Interface & AI Interaction',
      description: 'Voice-powered trading and analysis',
      icon: Brain,
      content: [
        'Global Voice Interface enables hands-free platform interaction throughout the application.',
        'Voice Analyst provides conversational market analysis and strategy discussion.',
        'Quick Analyst Button offers instant voice query functionality.',
        'Real-time audio processing enables natural conversation with AI systems.',
        'Voice-to-text services convert spoken queries into actionable insights.',
        'Global Voice Player provides audio feedback and responses.',
        'Integration with Intelligence Hub for voice-powered market analysis.',
        'Accessibility features for users who prefer voice interaction.'
      ],
      tips: [
        'Speak clearly for best voice recognition accuracy',
        'Use specific questions for more targeted responses',
        'Try voice commands during market analysis',
        'Use quiet environments for optimal recognition'
      ]
    },
    {
      id: 'settings',
      title: 'Settings & Configuration',
      description: 'Platform customization and preferences',
      icon: Settings,
      content: [
        'Settings allow comprehensive platform customization to match your preferences and trading style.',
        'User Settings Panel manages personal preferences and account information.',
        'Brokerage Dock Settings configure external account connections.',
        'System Learning Panel tracks AI adaptation to your trading patterns.',
        'Risk management settings help control position sizing and exposure limits.',
        'Notification preferences ensure you receive important alerts via preferred channels.',
        'Display settings control themes, layouts, and visual preferences including moonlit awareness mode.',
        'API connections and integrations can be managed from the settings panel.',
        'Keyboard shortcuts configuration for enhanced productivity.'
      ],
      tips: [
        'Review and adjust risk settings before live trading',
        'Set up notifications for important events',
        'Customize the interface for optimal productivity',
        'Configure keyboard shortcuts for frequent actions',
        'Regularly review security settings'
      ]
    },
    {
      id: 'system-monitoring',
      title: 'System Monitoring & Health',
      description: 'Platform performance and system status',
      icon: Monitor,
      content: [
        'System Monitoring provides comprehensive oversight of platform health and performance.',
        'System Health Monitor tracks real-time platform status and connectivity.',
        'System Audit Panel provides detailed performance metrics and diagnostics.',
        'Connection Status Bar indicates real-time data feed status.',
        'Performance monitoring helps identify and resolve potential issues.',
        'Automated health checks ensure optimal platform operation.',
        'Error boundaries protect against system failures and provide graceful recovery.',
        'Logging services track system events for debugging and optimization.'
      ],
      tips: [
        'Monitor system status during active trading',
        'Report any performance issues promptly',
        'Check connection status if experiencing delays',
        'Use system monitoring for troubleshooting'
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

          {/* Quick Start Guide */}
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
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
                      Initial Setup
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground pl-8">
                      <li>• Complete account registration and email verification</li>
                      <li>• Choose your subscription plan (Standard/Pro/Elite)</li>
                      <li>• Complete compliance onboarding requirements</li>
                      <li>• Configure basic settings and preferences</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</span>
                      Learning Phase
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground pl-8">
                      <li>• Start with Demo Mode to explore features safely</li>
                      <li>• Review this User Manual thoroughly</li>
                      <li>• Practice with Paper Trading ($100k virtual account)</li>
                      <li>• Familiarize yourself with the voice interface</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">3</span>
                      Market Analysis
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground pl-8">
                      <li>• Explore the Intelligence Hub and Oracle signals</li>
                      <li>• Set up watchlists in Market Center</li>
                      <li>• Test chart analysis tools and indicators</li>
                      <li>• Use AI Analyst for market insights</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">4</span>
                      Strategy Development
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground pl-8">
                      <li>• Experiment in Strategy Cradle (Elite tier)</li>
                      <li>• Configure Trade Bots with conservative settings</li>
                      <li>• Backtest strategies thoroughly</li>
                      <li>• Use Monte Carlo simulations for validation</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">5</span>
                      Live Trading Preparation
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground pl-8">
                      <li>• Connect and verify brokerage accounts</li>
                      <li>• Configure risk management settings</li>
                      <li>• Set up position sizing rules</li>
                      <li>• Review all compliance requirements</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">6</span>
                      Go Live
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground pl-8">
                      <li>• Start with small position sizes</li>
                      <li>• Monitor all trades closely</li>
                      <li>• Use the moonlit awareness interface</li>
                      <li>• Continuously refine your approach</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-warning mb-1">Important Reminders:</p>
                      <ul className="text-muted-foreground space-y-1">
                        <li>• Always start with paper trading to learn without risk</li>
                        <li>• Read and understand all risk disclosures before live trading</li>
                        <li>• Keep your brokerage credentials secure and regularly updated</li>
                        <li>• Monitor system status and your internet connection during active trading</li>
                        <li>• Never risk more than you can afford to lose</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Keyboard Shortcuts */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                Keyboard Shortcuts
              </CardTitle>
              <CardDescription>
                Essential keyboard shortcuts for efficient platform navigation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Workspace (Elite)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span>Toggle Bubble Mode</span>
                      <Badge variant="secondary">Cmd/Ctrl + Shift + B</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>1x1 Layout</span>
                      <Badge variant="secondary">Cmd/Ctrl + 1</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>2x1 Layout</span>
                      <Badge variant="secondary">Cmd/Ctrl + 2</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>2x2 Layout</span>
                      <Badge variant="secondary">Cmd/Ctrl + 4</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Exit Bubble Mode</span>
                      <Badge variant="secondary">Escape</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">General Navigation</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span>Search Manual</span>
                      <Badge variant="secondary">Focus search box</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Voice Query</span>
                      <Badge variant="secondary">Click Quick Analyst</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Toggle Sidebar</span>
                      <Badge variant="secondary">Sidebar trigger</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feature Availability by Tier */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                Feature Availability by Subscription Tier
              </CardTitle>
              <CardDescription>
                Comprehensive breakdown of features available in each subscription tier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Feature</th>
                      <th className="text-center p-3 font-semibold text-accent">Standard ($99)</th>
                      <th className="text-center p-3 font-semibold text-primary">Pro ($199)</th>
                      <th className="text-center p-3 font-semibold text-warning">Elite ($299)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-3">Dashboard Access</td>
                      <td className="text-center p-3">✅</td>
                      <td className="text-center p-3">✅</td>
                      <td className="text-center p-3">✅</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">Intelligence Hub</td>
                      <td className="text-center p-3">✅</td>
                      <td className="text-center p-3">✅</td>
                      <td className="text-center p-3">✅</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">Market Center</td>
                      <td className="text-center p-3">✅</td>
                      <td className="text-center p-3">✅</td>
                      <td className="text-center p-3">✅</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">Paper Trading</td>
                      <td className="text-center p-3">✅</td>
                      <td className="text-center p-3">✅</td>
                      <td className="text-center p-3">✅</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">Live Trading</td>
                      <td className="text-center p-3">✅</td>
                      <td className="text-center p-3">✅</td>
                      <td className="text-center p-3">✅</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">Portfolio Management</td>
                      <td className="text-center p-3">❌</td>
                      <td className="text-center p-3">✅</td>
                      <td className="text-center p-3">✅</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">Trading Desk</td>
                      <td className="text-center p-3">❌</td>
                      <td className="text-center p-3">✅</td>
                      <td className="text-center p-3">✅</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">Advanced Charts</td>
                      <td className="text-center p-3">❌</td>
                      <td className="text-center p-3">✅</td>
                      <td className="text-center p-3">✅</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">Brokerage Dock</td>
                      <td className="text-center p-3">❌</td>
                      <td className="text-center p-3">❌</td>
                      <td className="text-center p-3">✅</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">Strategy Cradle</td>
                      <td className="text-center p-3">❌</td>
                      <td className="text-center p-3">❌</td>
                      <td className="text-center p-3">✅</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">Elite Workspace</td>
                      <td className="text-center p-3">❌</td>
                      <td className="text-center p-3">❌</td>
                      <td className="text-center p-3">✅</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">Voice Interface</td>
                      <td className="text-center p-3">✅</td>
                      <td className="text-center p-3">✅</td>
                      <td className="text-center p-3">✅</td>
                    </tr>
                    <tr>
                      <td className="p-3">Trade Bots</td>
                      <td className="text-center p-3">Basic</td>
                      <td className="text-center p-3">Advanced</td>
                      <td className="text-center p-3">Full Suite</td>
                    </tr>
                  </tbody>
                </table>
               </div>
             </CardContent>
           </Card>
         </div>
       </div>
     </div>
   );
 }