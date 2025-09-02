import { useState, useEffect } from 'react';
import { Search, Filter, Save, Bell, BellOff, TrendingUp, Calendar, Target, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OraclePanel } from '@/components/oracle/OraclePanel';
import { marketSearchService } from '@/services/marketSearch';
import { bid } from '@/services/bid';
import { useToast } from '@/hooks/use-toast';
import { SearchMode, SearchFilters, Recommendation, SavedSearch, SearchResult } from '@/types/search';

export function ResearchRail() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'simple' | 'advanced'>('simple');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [activeTab, setActiveTab] = useState('search');

  const { toast } = useToast();

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const recs = await marketSearchService.generateRecommendations();
      setRecommendations(recs);
      setSavedSearches(marketSearchService.getSavedSearches());
    } catch (error) {
      console.error('Failed to load research data:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const mode: SearchMode = {
        type: searchMode,
        query: searchQuery,
        filters,
        sortBy: 'relevance',
        sortOrder: 'desc',
        limit: 20,
        offset: 0
      };

      const { results } = await marketSearchService.executeSearch(mode);
      setSearchResults(results);
      setActiveTab('results');
    } catch (error) {
      toast({
        title: "Search Failed",
        description: "Failed to execute search. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveSearch = async () => {
    if (!saveSearchName.trim() || !searchQuery.trim()) return;

    try {
      const query = {
        id: `query_${Date.now()}`,
        queryText: searchQuery,
        filters,
        notify: false,
        createdAt: new Date(),
        isActive: true
      };

      await marketSearchService.saveSearch(saveSearchName, query, true);
      setSavedSearches(marketSearchService.getSavedSearches());
      setShowSaveDialog(false);
      setSaveSearchName('');
      
      toast({
        title: "Search Saved",
        description: `"${saveSearchName}" has been saved to your searches.`
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save search. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDraftTradeIdea = (symbol: string) => {
    // Emit trade intent draft event
    toast({
      title: "Trade Idea Drafted",
      description: `Draft trade idea created for ${symbol}. Check your drafts in the Trade Bots tab.`
    });
  };

  const handleAddToWatchlist = (symbol: string) => {
    // Emit watchlist add event
    toast({
      title: "Added to Watchlist",
      description: `${symbol} has been added to your watchlist.`
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-muted-foreground';
    }
  };

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case 'bullish': return 'text-green-400';
      case 'bearish': return 'text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const formatNumber = (num: number, decimals = 2) => {
    return new Intl.NumberFormat('en-US', { 
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals 
    }).format(num);
  };

  const MiniSparkline = ({ data, color = "rgb(34, 197, 94)" }: { data: number[], color?: string }) => {
    if (!data || data.length < 2) return <div className="w-16 h-6 bg-muted/20 rounded" />;
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * 60; // 60px width
      const y = 20 - ((value - min) / range) * 16; // 20px height, 16px data range
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width="60" height="20" className="inline-block">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          className="opacity-80"
        />
      </svg>
    );
  };

  return (
    <div className="w-80 min-w-[320px] max-w-[400px] bg-background border-l border-border flex flex-col h-full">
      <div className="p-3 border-b border-border flex-shrink-0">
        <h2 className="text-lg font-semibold text-foreground mb-3">Research</h2>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="search" className="text-xs">Search</TabsTrigger>
            <TabsTrigger value="oracle" className="text-xs">Oracle</TabsTrigger>
            <TabsTrigger value="recommendations" className="text-xs">Recs</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-3 mt-3 flex-1 overflow-hidden">
            {/* Search Interface */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Search markets, news, signals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSearch} 
                  disabled={isSearching}
                  size="sm"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>

              {/* Quick Filters */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Filter className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Filters</span>
                </div>
                
                <div className="grid grid-cols-2 gap-1.5">
                  <Select
                    value={filters.sentiment || ''}
                    onValueChange={(value) => setFilters(f => ({ ...f, sentiment: value as any }))}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Sentiment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bullish">Bullish</SelectItem>
                      <SelectItem value="bearish">Bearish</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.timeframe || ''}
                    onValueChange={(value) => setFilters(f => ({ ...f, timeframe: value as any }))}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Timeframe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1d">1 Day</SelectItem>
                      <SelectItem value="1w">1 Week</SelectItem>
                      <SelectItem value="1m">1 Month</SelectItem>
                      <SelectItem value="3m">3 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-1.5">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-7 text-xs flex-1"
                    onClick={() => setShowSaveDialog(true)}
                    disabled={!searchQuery.trim()}
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-7 text-xs flex-1"
                    onClick={() => setSearchMode(searchMode === 'simple' ? 'advanced' : 'simple')}
                  >
                    {searchMode === 'simple' ? 'Adv' : 'Simple'}
                  </Button>
                </div>

                {searchMode === 'advanced' && (
                  <div className="p-2 bg-muted/20 rounded text-xs text-muted-foreground">
                    <p>Advanced query syntax:</p>
                    <p>sector:tech AND event:earnings</p>
                    <p>momentum:high OR volume:high</p>
                  </div>
                )}
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2 flex-1 min-h-0">
                <h3 className="text-xs font-medium text-foreground">Results ({searchResults.length})</h3>
                <ScrollArea className="h-full max-h-64">
                  <div className="space-y-2">
                    {searchResults.map((result) => (
                      <Card key={result.id} className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{result.symbol}</span>
                              <Badge variant="outline" className="text-xs">
                                {(result.relevanceScore * 100).toFixed(0)}%
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {result.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs">${result.features.price.toFixed(2)}</span>
                              <span className={`text-xs ${result.features.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {result.features.changePercent >= 0 ? '+' : ''}{result.features.changePercent.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                          <MiniSparkline 
                            data={result.features.priceHistory} 
                            color={result.features.change >= 0 ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"}
                          />
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Saved Searches */}
            {savedSearches.length > 0 && (
              <div className="space-y-2 flex-shrink-0">
                <h3 className="text-xs font-medium text-foreground">Saved Searches</h3>
                <div className="space-y-1">
                  {savedSearches.slice(0, 3).map((saved) => (
                    <div key={saved.id} className="flex items-center justify-between p-2 bg-muted/20 rounded">
                      <div className="flex-1">
                        <p className="text-xs font-medium truncate">{saved.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {saved.resultCount} results
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {saved.alertsEnabled ? (
                          <Bell className="w-3 h-3 text-primary" />
                        ) : (
                          <BellOff className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="oracle" className="mt-3 flex-1 overflow-hidden">
            <OraclePanel />
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-3 mt-3 flex-1 overflow-hidden">
            {/* Recommendations */}
            <div className="space-y-2 h-full flex flex-col">
              <div className="flex items-center justify-between flex-shrink-0">
                <h3 className="text-xs font-medium text-foreground">Recommendations</h3>
                <Badge variant="outline" className="text-xs">
                  Updated {new Date().toLocaleTimeString()}
                </Badge>
              </div>

              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-3">
                  {recommendations.slice(0, 8).map((rec) => (
                    <Card key={rec.id} className="p-3">
                      <div className="space-y-2">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{rec.symbol}</span>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getDirectionColor(rec.direction)}`}
                              >
                                {rec.direction}
                              </Badge>
                              <div className="flex items-center">
                                <TrendingUp className="w-3 h-3 text-muted-foreground mr-1" />
                                <span className="text-xs text-muted-foreground">
                                  {(rec.score * 100).toFixed(0)}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {rec.name}
                            </p>
                          </div>
                          <MiniSparkline 
                            data={rec.priceHistory}
                            color={rec.direction === 'bullish' ? "rgb(34, 197, 94)" : rec.direction === 'bearish' ? "rgb(239, 68, 68)" : "rgb(156, 163, 175)"}
                          />
                        </div>

                        {/* Key Stats */}
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Price</span>
                            <p className="font-medium">${rec.keyStats.currentPrice.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">ATR</span>
                            <p className="font-medium">{rec.keyStats.atr.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Beta</span>
                            <p className="font-medium">{rec.keyStats.beta.toFixed(2)}</p>
                          </div>
                        </div>

                        {/* Why Bullets */}
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-foreground">Why:</p>
                          <ul className="space-y-0.5">
                            {rec.whyBullets.map((bullet, index) => (
                              <li key={index} className="text-xs text-muted-foreground flex items-start">
                                <span className="text-primary mr-1">•</span>
                                <span className="flex-1">{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-1 pt-1">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-xs flex-1"
                            onClick={() => handleDraftTradeIdea(rec.symbol)}
                          >
                            <Target className="w-3 h-3 mr-1" />
                            Draft Idea
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-xs"
                            onClick={() => handleAddToWatchlist(rec.symbol)}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>

                        {/* Data Freshness */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-1">
                          <span>Updated {rec.dataFreshness.toLocaleTimeString()}</span>
                          <span>{rec.timeframe} term</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>

              {/* Disclaimer */}
              <div className="p-2 bg-muted/10 rounded border border-border">
                <p className="text-xs text-muted-foreground">
                  <strong>Disclaimer:</strong> These are informational insights only, not financial advice. 
                  Always conduct your own research before making investment decisions.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Save Search Dialog */}
      {showSaveDialog && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-72 p-4">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-sm">Save Search</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-3">
              <Input
                placeholder="Search name..."
                value={saveSearchName}
                onChange={(e) => setSaveSearchName(e.target.value)}
                autoFocus
              />
              <div className="flex items-center space-x-2">
                <Checkbox id="notifications" defaultChecked />
                <Label htmlFor="notifications" className="text-xs">
                  Notify me of new matches
                </Label>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleSaveSearch}
                  disabled={!saveSearchName.trim()}
                  size="sm"
                  className="flex-1"
                >
                  Save
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowSaveDialog(false)}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}