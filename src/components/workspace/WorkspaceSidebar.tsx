import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DraggableTab } from './DraggableTab';
import { 
  TrendingUp, 
  BarChart3, 
  Briefcase, 
  Brain, 
  Eye, 
  Play, 
  Newspaper, 
  Star, 
  Palette, 
  ExternalLink,
  Clock,
  Search,
  Plus
} from 'lucide-react';

// Available internal tabs/modules
export const AVAILABLE_TABS = [
  {
    id: 'charts',
    title: 'Charts',
    icon: TrendingUp,
    description: 'Live market charts with indicators',
    category: 'trading'
  },
  {
    id: 'trading-desk',
    title: 'Trading Desk',
    icon: BarChart3,
    description: 'Order management and execution',
    category: 'trading'
  },
  {
    id: 'portfolio',
    title: 'Portfolio',
    icon: Briefcase,
    description: 'Portfolio overview and positions',
    category: 'trading'
  },
  {
    id: 'analyst',
    title: 'Analyst',
    icon: Brain,
    description: 'AI analyst and insights',
    category: 'analysis'
  },
  {
    id: 'intelligence',
    title: 'Intelligence',
    icon: Eye,
    description: 'Market intelligence dashboard',
    category: 'analysis'
  },
  {
    id: 'cradle',
    title: 'Cradle',
    icon: Palette,
    description: 'Excel-like analysis sheets',
    category: 'analysis'
  },
  {
    id: 'brokerage-dock',
    title: 'Brokerage Dock',
    icon: ExternalLink,
    description: 'External broker platforms',
    category: 'external'
  }
];

// Quick external URL presets
const URL_PRESETS = [
  {
    id: 'tradingview',
    title: 'TradingView',
    url: 'https://tradingview.com/',
    icon: TrendingUp
  },
  {
    id: 'finviz',
    title: 'Finviz',
    url: 'https://finviz.com/',
    icon: Eye
  },
  {
    id: 'yahoo-finance',
    title: 'Yahoo Finance',
    url: 'https://finance.yahoo.com/',
    icon: Newspaper
  }
];

export const WorkspaceSidebar: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  // Filter tabs based on search
  const filteredTabs = AVAILABLE_TABS.filter(tab =>
    tab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tab.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group tabs by category
  const groupedTabs = filteredTabs.reduce((acc, tab) => {
    if (!acc[tab.category]) acc[tab.category] = [];
    acc[tab.category].push(tab);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_TABS>);

  const handleAddCustomUrl = () => {
    if (!customUrl.trim()) return;
    
    // Simple URL validation
    try {
      new URL(customUrl);
    } catch {
      return;
    }

    setCustomUrl('');
  };

  const CategoryIcon = ({ category }: { category: string }) => {
    switch (category) {
      case 'trading': return <BarChart3 className="w-4 h-4" />;
      case 'analysis': return <Brain className="w-4 h-4" />;
      case 'external': return <ExternalLink className="w-4 h-4" />;
      default: return <Palette className="w-4 h-4" />;
    }
  };

  return (
    <Card className="w-80 h-full rounded-none border-r border-l-0 border-t-0 border-b-0">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          Available Tabs
        </CardTitle>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tabs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <Tabs defaultValue="tabs" className="h-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tabs">Tabs</TabsTrigger>
            <TabsTrigger value="urls">URLs</TabsTrigger>
          </TabsList>

          <TabsContent value="tabs" className="mt-4 h-full">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-6">
                {/* Grouped Tabs */}
                {Object.entries(groupedTabs).map(([category, tabs]) => (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-3">
                      <CategoryIcon category={category} />
                      <span className="text-sm font-medium text-muted-foreground capitalize">
                        {category}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {tabs.length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {tabs.map(tab => (
                        <DraggableTab key={tab.id} tab={tab} />
                      ))}
                    </div>
                    <Separator className="mt-4" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="urls" className="mt-4">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-4">
                {/* Custom URL Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Add Custom URL</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://example.com"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCustomUrl()}
                    />
                    <Button size="sm" onClick={handleAddCustomUrl}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* URL Presets */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Quick Access</span>
                  </div>
                  <div className="space-y-2">
                    {URL_PRESETS.map(preset => (
                      <DraggableTab 
                        key={preset.id} 
                        tab={{
                          ...preset,
                          description: `External: ${preset.url}`,
                          category: 'external'
                        }} 
                        isUrl
                      />
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};