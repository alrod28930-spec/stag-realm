import { useState, useEffect } from 'react';
import { Search, Filter, Save, Download, Grid, List, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { marketSearchService } from '@/services/marketSearch';
import { useToast } from '@/hooks/use-toast';
import { SearchMode, SearchFilters, SearchResult, SavedSearch } from '@/types/search';

export function FullSearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'simple' | 'advanced'>('simple');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'relevance' | 'momentum' | 'volume' | 'change'>('relevance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCompareMode, setShowCompareMode] = useState(false);

  const { toast } = useToast();
  const resultsPerPage = 20;

  useEffect(() => {
    loadSavedSearches();
  }, []);

  const loadSavedSearches = () => {
    setSavedSearches(marketSearchService.getSavedSearches());
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setCurrentPage(1);
    
    try {
      const mode: SearchMode = {
        type: searchMode,
        query: searchQuery,
        filters,
        sortBy,
        sortOrder,
        limit: resultsPerPage * 5, // Load more for pagination
        offset: 0
      };

      const { results, context } = await marketSearchService.executeSearch(mode);
      setSearchResults(results);
      
      toast({
        title: "Search Complete",
        description: `Found ${results.length} results in ${context.queryProcessingTime}ms`
      });
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
    const name = prompt('Enter a name for this search:');
    if (!name?.trim() || !searchQuery.trim()) return;

    try {
      const query = {
        id: `query_${Date.now()}`,
        queryText: searchQuery,
        filters,
        notify: false,
        createdAt: new Date(),
        isActive: true
      };

      await marketSearchService.saveSearch(name, query, true);
      loadSavedSearches();
      
      toast({
        title: "Search Saved",
        description: `"${name}" has been saved to your searches.`
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save search.",
        variant: "destructive"
      });
    }
  };

  const handleResultSelect = (resultId: string, selected: boolean) => {
    const newSelected = new Set(selectedResults);
    if (selected) {
      newSelected.add(resultId);
    } else {
      newSelected.delete(resultId);
    }
    setSelectedResults(newSelected);
  };

  const handleBulkSave = () => {
    const selectedSymbols = searchResults
      .filter(r => selectedResults.has(r.id))
      .map(r => r.symbol);
    
    toast({
      title: "Added to Watchlist",
      description: `${selectedSymbols.length} symbols added to watchlist: ${selectedSymbols.join(', ')}`
    });
    
    setSelectedResults(new Set());
  };

  const handleExport = () => {
    const selectedData = searchResults.filter(r => selectedResults.has(r.id));
    const csvContent = [
      ['Symbol', 'Name', 'Price', 'Change %', 'Volume', 'Market Cap', 'Sector'],
      ...selectedData.map(r => [
        r.symbol,
        r.name,
        r.features.price.toString(),
        r.features.changePercent.toFixed(2),
        r.features.volume.toString(),
        r.features.marketCap.toString(),
        r.features.sector
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search_results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${selectedData.length} results to CSV`
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  const paginatedResults = searchResults.slice(
    (currentPage - 1) * resultsPerPage,
    currentPage * resultsPerPage
  );

  const totalPages = Math.ceil(searchResults.length / resultsPerPage);

  const MiniSparkline = ({ data, color = "rgb(34, 197, 94)" }: { data: number[], color?: string }) => {
    if (!data || data.length < 2) return <div className="w-20 h-8 bg-muted/20 rounded" />;
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * 80;
      const y = 24 - ((value - min) / range) * 20;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width="80" height="24" className="inline-block">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          className="opacity-80"
        />
      </svg>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Search Header */}
      <div className="border-b border-border p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-foreground">Market Search</h1>
            <Badge variant="outline">
              {searchResults.length} results
            </Badge>
          </div>

          {/* Search Bar */}
          <div className="flex gap-4">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Search stocks, sectors, events, or enter advanced query..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSaveSearch} disabled={!searchQuery.trim()}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              
              {selectedResults.size > 0 && (
                <>
                  <Button variant="outline" onClick={handleBulkSave}>
                    Add {selectedResults.size} to Watchlist
                  </Button>
                  <Button variant="outline" onClick={handleExport}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Filters */}
          <Tabs defaultValue="filters" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="filters">Filters</TabsTrigger>
              <TabsTrigger value="saved">Saved Searches ({savedSearches.length})</TabsTrigger>
              <TabsTrigger value="advanced">Advanced Query</TabsTrigger>
            </TabsList>

            <TabsContent value="filters" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div>
                  <Label className="text-sm">Sector</Label>
                  <Select
                    value={filters.sectors?.[0] || ''}
                    onValueChange={(value) => setFilters(f => ({ ...f, sectors: value ? [value] : undefined }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All sectors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Technology">Technology</SelectItem>
                      <SelectItem value="Healthcare">Healthcare</SelectItem>
                      <SelectItem value="Financial">Financial</SelectItem>
                      <SelectItem value="Energy">Energy</SelectItem>
                      <SelectItem value="Consumer">Consumer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm">Market Cap</Label>
                  <Select
                    value={filters.marketCaps?.[0] || ''}
                    onValueChange={(value) => setFilters(f => ({ ...f, marketCaps: value ? [value as any] : undefined }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All caps" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mega">Mega Cap</SelectItem>
                      <SelectItem value="large">Large Cap</SelectItem>
                      <SelectItem value="mid">Mid Cap</SelectItem>
                      <SelectItem value="small">Small Cap</SelectItem>
                      <SelectItem value="micro">Micro Cap</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm">Sentiment</Label>
                  <Select
                    value={filters.sentiment || ''}
                    onValueChange={(value) => setFilters(f => ({ ...f, sentiment: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any sentiment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bullish">Bullish</SelectItem>
                      <SelectItem value="bearish">Bearish</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm">Momentum</Label>
                  <Select
                    value={filters.momentum || ''}
                    onValueChange={(value) => setFilters(f => ({ ...f, momentum: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any momentum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm">Sort By</Label>
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Relevance</SelectItem>
                      <SelectItem value="momentum">Momentum</SelectItem>
                      <SelectItem value="volume">Volume</SelectItem>
                      <SelectItem value="change">Change %</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm">View</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid className="w-4 h-4" />
                    </Button>
                     <Button
                       variant={showCompareMode ? 'default' : 'outline'}
                       size="sm"
                       onClick={() => setShowCompareMode(!showCompareMode)}
                     >
                       Compare
                     </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="saved" className="space-y-2">
              <ScrollArea className="h-32">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {savedSearches.map((saved) => (
                    <Card key={saved.id} className="p-3 cursor-pointer hover:bg-muted/50">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{saved.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {saved.resultCount}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {saved.query.queryText}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-2">
              <div className="bg-muted/20 p-4 rounded">
                <h3 className="font-medium text-sm mb-2">Advanced Query Syntax</h3>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><code>sector:technology AND event:earnings</code> - Tech stocks with earnings</p>
                  <p><code>momentum:high OR volume:high</code> - High momentum or high volume</p>
                  <p><code>beta:&lt;1.2 AND price:&gt;50</code> - Low beta stocks over $50</p>
                  <p><code>window:7d AND sentiment:bullish</code> - Bullish signals in last 7 days</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          {searchResults.length > 0 ? (
            <div className="space-y-4">
              {/* Results Header */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * resultsPerPage + 1}-{Math.min(currentPage * resultsPerPage, searchResults.length)} of {searchResults.length} results
                </span>
                
                {selectedResults.size > 0 && (
                  <span className="text-sm text-primary">
                    {selectedResults.size} selected
                  </span>
                )}
              </div>

              {/* Results List/Grid */}
              {viewMode === 'list' ? (
                <div className="space-y-2">
                  {paginatedResults.map((result) => (
                    <Card key={result.id} className="p-4">
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={selectedResults.has(result.id)}
                          onCheckedChange={(checked) => handleResultSelect(result.id, !!checked)}
                        />
                        
                        <div className="flex-1 grid grid-cols-7 gap-4 items-center">
                          <div>
                            <div className="font-medium">{result.symbol}</div>
                            <div className="text-sm text-muted-foreground truncate">
                              {result.name}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="font-medium">${result.features.price.toFixed(2)}</div>
                            <div className={`text-sm ${result.features.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {result.features.changePercent >= 0 ? '+' : ''}{result.features.changePercent.toFixed(2)}%
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-sm">{formatNumber(result.features.volume)}</div>
                            <div className="text-xs text-muted-foreground">Volume</div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-sm">{formatNumber(result.features.marketCap)}</div>
                            <div className="text-xs text-muted-foreground">Market Cap</div>
                          </div>
                          
                          <div>
                            <Badge variant="outline" className="text-xs">
                              {result.features.sector}
                            </Badge>
                          </div>
                          
                          <div className="text-center">
                            <div className="text-sm font-medium">
                              {(result.relevanceScore * 100).toFixed(0)}%
                            </div>
                            <div className="text-xs text-muted-foreground">Relevance</div>
                          </div>
                          
                          <div className="text-right">
                            <MiniSparkline 
                              data={result.features.priceHistory}
                              color={result.features.change >= 0 ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"}
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {paginatedResults.map((result) => (
                    <Card key={result.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <Checkbox
                            checked={selectedResults.has(result.id)}
                            onCheckedChange={(checked) => handleResultSelect(result.id, !!checked)}
                          />
                          <Badge variant="outline" className="text-xs">
                            {(result.relevanceScore * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        
                        <div>
                          <div className="font-medium text-lg">{result.symbol}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {result.name}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Price</span>
                            <span className="font-medium">${result.features.price.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Change</span>
                            <span className={`font-medium ${result.features.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {result.features.changePercent >= 0 ? '+' : ''}{result.features.changePercent.toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Volume</span>
                            <span className="text-sm">{formatNumber(result.features.volume)}</span>
                          </div>
                        </div>
                        
                        <div className="pt-2">
                          <MiniSparkline 
                            data={result.features.priceHistory}
                            color={result.features.change >= 0 ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"}
                          />
                        </div>
                        
                        <Badge variant="outline" className="text-xs w-full justify-center">
                          {result.features.sector}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">Ready to Search</h3>
                <p className="text-muted-foreground">
                  Enter your search query above to find stocks, analyze sectors, and discover opportunities.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}