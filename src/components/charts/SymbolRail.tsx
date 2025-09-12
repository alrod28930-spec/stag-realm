import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { useChartState } from '@/hooks/useChartState';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Clock,
  Star,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SymbolRailProps {
  selectedSymbol: string | null;
  onSymbolSelect: (symbol: string) => void;
}

// Mock watchlist data - would come from user preferences
const mockWatchlist = [
  { symbol: 'SPY', name: 'SPDR S&P 500', price: 442.15, change: 2.34, changePercent: 0.53 },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', price: 378.92, change: -1.87, changePercent: -0.49 },
  { symbol: 'TSLA', name: 'Tesla Inc', price: 248.50, change: 5.23, changePercent: 2.15 },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 875.30, change: -12.45, changePercent: -1.40 },
  { symbol: 'AMZN', name: 'Amazon.com Inc', price: 151.94, change: 0.76, changePercent: 0.50 }
];

const SymbolItem: React.FC<{
  symbol: string;
  name: string;
  price?: number;
  change?: number;
  changePercent?: number;
  position?: any;
  isSelected: boolean;
  onClick: () => void;
}> = ({ symbol, name, price, change, changePercent, position, isSelected, onClick }) => {
  const isPositive = (change || 0) >= 0;
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "p-3 rounded-lg border cursor-pointer transition-all",
        isSelected 
          ? "bg-primary/10 border-primary text-primary" 
          : "bg-card border-border hover:bg-accent hover:border-accent-foreground/20"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{symbol}</span>
          {position && (
            <Badge variant="outline" className="text-xs">
              {position.shares > 0 ? 'LONG' : 'SHORT'}
            </Badge>
          )}
        </div>
        {price && (
          <span className="text-sm font-medium">${price.toFixed(2)}</span>
        )}
      </div>
      
      <div className="text-xs text-muted-foreground mb-2 truncate">
        {name}
      </div>
      
      <div className="flex items-center justify-between">
        {change !== undefined && changePercent !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-xs",
            isPositive ? "text-success" : "text-destructive"
          )}>
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{isPositive ? '+' : ''}{change.toFixed(2)}</span>
            <span>({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)</span>
          </div>
        )}
        
        {position && (
          <div className={cn(
            "text-xs font-medium",
            position.gainLoss >= 0 ? "text-success" : "text-destructive"
          )}>
            ${position.gainLoss?.toFixed(2) || '0.00'}
          </div>
        )}
      </div>
      
      {/* Mini Sparkline Placeholder */}
      <div className="mt-2 h-6 bg-muted/50 rounded flex items-end justify-center">
        <div className="text-xs text-muted-foreground">📈</div>
      </div>
    </motion.div>
  );
};

export const SymbolRail: React.FC<SymbolRailProps> = ({ selectedSymbol, onSymbolSelect }) => {
  const { portfolio } = usePortfolioStore();
  const { recentSymbols } = useChartState();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Mock search function - would integrate with real symbol search API
  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    // Simulate API search
    const mockResults = [
      { symbol: 'AAPL', name: 'Apple Inc', price: 189.95, change: 1.23, changePercent: 0.65 },
      { symbol: 'GOOGL', name: 'Alphabet Inc', price: 140.85, change: -0.95, changePercent: -0.67 },
      { symbol: 'MSFT', name: 'Microsoft Corporation', price: 378.85, change: 2.14, changePercent: 0.57 }
    ].filter(item => 
      item.symbol.toLowerCase().includes(query.toLowerCase()) ||
      item.name.toLowerCase().includes(query.toLowerCase())
    );
    
    setSearchResults(mockResults);
  };

  const positions = useMemo(() => {
    return portfolio?.positions || [];
  }, [portfolio]);

  const recentSymbolsData = useMemo(() => {
    return recentSymbols.map(symbol => ({
      symbol,
      name: `${symbol} Corporation`, // Mock name
      price: Math.random() * 100 + 50,
      change: (Math.random() - 0.5) * 10,
      changePercent: (Math.random() - 0.5) * 5
    }));
  }, [recentSymbols]);

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Symbol Selector</h3>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search symbols..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            className="pl-10"
          />
        </div>
      </div>

      {/* Symbol Lists */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="positions" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 mx-4 mt-4">
            <TabsTrigger value="positions" className="text-xs">
              Positions ({positions.length})
            </TabsTrigger>
            <TabsTrigger value="watchlist" className="text-xs">
              Watchlist ({mockWatchlist.length})
            </TabsTrigger>
            <TabsTrigger value="search" className="text-xs">
              Search
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="positions" className="h-full mt-0">
              <ScrollArea className="h-full px-4">
                <div className="space-y-3 py-4">
                  {positions.length > 0 ? (
                    positions.map((position) => (
                      <SymbolItem
                        key={position.symbol}
                        symbol={position.symbol}
                        name={position.name}
                        position={position}
                        isSelected={selectedSymbol === position.symbol}
                        onClick={() => onSymbolSelect(position.symbol)}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No positions</p>
                      <p className="text-xs">Your portfolio positions will appear here</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="watchlist" className="h-full mt-0">
              <ScrollArea className="h-full px-4">
                <div className="space-y-3 py-4">
                  {mockWatchlist.map((item) => (
                    <SymbolItem
                      key={item.symbol}
                      symbol={item.symbol}
                      name={item.name}
                      price={item.price}
                      change={item.change}
                      changePercent={item.changePercent}
                      isSelected={selectedSymbol === item.symbol}
                      onClick={() => onSymbolSelect(item.symbol)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="search" className="h-full mt-0">
              <ScrollArea className="h-full px-4">
                <div className="space-y-3 py-4">
                  {searchQuery.length >= 2 ? (
                    searchResults.length > 0 ? (
                      searchResults.map((item) => (
                        <SymbolItem
                          key={item.symbol}
                          symbol={item.symbol}
                          name={item.name}
                          price={item.price}
                          change={item.change}
                          changePercent={item.changePercent}
                          isSelected={selectedSymbol === item.symbol}
                          onClick={() => onSymbolSelect(item.symbol)}
                        />
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No results found</p>
                        <p className="text-xs">Try a different search term</p>
                      </div>
                    )
                  ) : (
                    <div className="space-y-4">
                      {recentSymbolsData.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">Recent</span>
                          </div>
                          <div className="space-y-2">
                            {recentSymbolsData.map((item) => (
                              <SymbolItem
                                key={item.symbol}
                                symbol={item.symbol}
                                name={item.name}
                                price={item.price}
                                change={item.change}
                                changePercent={item.changePercent}
                                isSelected={selectedSymbol === item.symbol}
                                onClick={() => onSymbolSelect(item.symbol)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="text-center py-4 text-muted-foreground">
                        <Search className="w-6 h-6 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Search for symbols</p>
                        <p className="text-xs">Type 2+ characters to search</p>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </Card>
  );
};