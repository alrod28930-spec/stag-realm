import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PositionMiniChart } from './PositionMiniChart';
import { IntradayEquityCurve } from '@/components/charts/IntradayEquityCurve';
import { AllocationPieChart } from '@/components/charts/AllocationPieChart';
import { 
  Grid3X3, 
  List, 
  BarChart3, 
  TrendingUp, 
  Target,
  RefreshCw,
  Filter,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  side: 'long' | 'short';
  entryTime: number;
  marketValue: number;
}

interface PortfolioGridProps {
  positions?: Position[];
  portfolioValue?: number;
  totalPnL?: number;
  onTradeAction?: (action: 'add' | 'reduce' | 'close', symbol: string) => void;
  onChartExpand?: (symbol: string) => void;
  isDemo?: boolean;
}

export const PortfolioGrid: React.FC<PortfolioGridProps> = ({
  positions = [],
  portfolioValue = 125000,
  totalPnL = 2500,
  onTradeAction,
  onChartExpand,
  isDemo = false
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'pnl' | 'value' | 'percent'>('pnl');
  const [filterBy, setFilterBy] = useState<'all' | 'winners' | 'losers'>('all');
  
  const { toast } = useToast();

  // Demo positions if none provided
  const demoPositions: Position[] = [
    {
      symbol: 'AAPL',
      quantity: 100,
      avgPrice: 148.50,
      currentPrice: 152.25,
      unrealizedPnL: 375,
      realizedPnL: 0,
      side: 'long',
      entryTime: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
      marketValue: 15225
    },
    {
      symbol: 'TSLA',
      quantity: 50,
      avgPrice: 248.75,
      currentPrice: 245.50,
      unrealizedPnL: -162.5,
      realizedPnL: 0,
      side: 'long',
      entryTime: Date.now() - 4 * 60 * 60 * 1000, // 4 hours ago
      marketValue: 12275
    },
    {
      symbol: 'MSFT',
      quantity: 75,
      avgPrice: 334.20,
      currentPrice: 338.90,
      unrealizedPnL: 352.5,
      realizedPnL: 0,
      side: 'long',
      entryTime: Date.now() - 1 * 60 * 60 * 1000, // 1 hour ago
      marketValue: 25417.5
    },
    {
      symbol: 'GOOGL',
      quantity: 25,
      avgPrice: 142.80,
      currentPrice: 141.25,
      unrealizedPnL: -38.75,
      realizedPnL: 0,
      side: 'long',
      entryTime: Date.now() - 3 * 60 * 60 * 1000, // 3 hours ago
      marketValue: 3531.25
    },
    {
      symbol: 'NVDA',
      quantity: 40,
      avgPrice: 875.25,
      currentPrice: 892.50,
      unrealizedPnL: 690,
      realizedPnL: 0,
      side: 'long',
      entryTime: Date.now() - 30 * 60 * 1000, // 30 minutes ago
      marketValue: 35700
    },
    {
      symbol: 'SPY',
      quantity: 200,
      avgPrice: 425.75,
      currentPrice: 427.10,
      unrealizedPnL: 270,
      realizedPnL: 0,
      side: 'long',
      entryTime: Date.now() - 5 * 60 * 60 * 1000, // 5 hours ago
      marketValue: 85420
    }
  ];

  // ONLY show demo positions for the single demo account, empty for all other accounts
  const activePositions = positions.length > 0 ? positions : (isDemo ? demoPositions : []);

  // Filter and sort positions
  const filteredPositions = activePositions
    .filter(pos => {
      if (filterBy === 'winners') return pos.unrealizedPnL > 0;
      if (filterBy === 'losers') return pos.unrealizedPnL < 0;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'pnl':
          return b.unrealizedPnL - a.unrealizedPnL;
        case 'value':
          return b.marketValue - a.marketValue;
        case 'percent':
          const aPercent = ((a.currentPrice - a.avgPrice) / a.avgPrice) * 100;
          const bPercent = ((b.currentPrice - b.avgPrice) / b.avgPrice) * 100;
          return bPercent - aPercent;
        default:
          return 0;
      }
    });

  const handleFlattenAll = () => {
    activePositions.forEach(pos => {
      onTradeAction?.('close', pos.symbol);
    });
    
    toast({
      title: "Flattening All Positions",
      description: `Closing ${activePositions.length} positions`,
    });
  };

  const winners = activePositions.filter(pos => pos.unrealizedPnL > 0).length;
  const losers = activePositions.filter(pos => pos.unrealizedPnL < 0).length;

  return (
    <div className="space-y-6">
      {/* Portfolio Summary Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Intraday Equity Curve */}
        <IntradayEquityCurve 
          height={250}
          startingEquity={portfolioValue - totalPnL}
          targetPnL={1000}
          maxDailyLoss={-2000}
          isDemo={isDemo}
        />

        {/* Allocation Chart */}
        <AllocationPieChart
          title="Position Allocation"
          viewMode="symbol"
          height={250}
          isDemo={isDemo}
        />
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-lg">Active Positions</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs">
                  {winners} Winners
                </Badge>
                <Badge variant="destructive" className="text-xs">
                  {losers} Losers
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {activePositions.length} Total
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center border rounded">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              {/* Filter */}
              <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
                <SelectTrigger className="w-32">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  <SelectItem value="winners">Winners Only</SelectItem>
                  <SelectItem value="losers">Losers Only</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pnl">By P&L</SelectItem>
                  <SelectItem value="value">By Value</SelectItem>
                  <SelectItem value="percent">By %</SelectItem>
                </SelectContent>
              </Select>

              {/* Flatten All */}
              <Button
                variant="outline"
                onClick={handleFlattenAll}
                className="text-destructive border-destructive hover:bg-destructive/10"
              >
                <Target className="w-4 h-4 mr-2" />
                Flatten All
              </Button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Total Value:</span>
              <span className="font-semibold">${portfolioValue.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Total P&L:</span>
              <span className={`font-semibold ${totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(0)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Day Return:</span>
              <span className={`font-semibold ${totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                {((totalPnL / (portfolioValue - totalPnL)) * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Positions Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPositions.map((position) => (
            <PositionMiniChart
              key={position.symbol}
              position={position}
              height={200}
              onTradeClick={onTradeAction}
              onChartExpand={onChartExpand}
              isDemo={isDemo}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-0">
              {/* Table Header */}
              <div className="grid grid-cols-7 gap-4 p-4 border-b bg-muted/30 text-sm font-medium text-muted-foreground">
                <div>Symbol</div>
                <div className="text-center">Quantity</div>
                <div className="text-right">Avg Price</div>
                <div className="text-right">Current</div>
                <div className="text-right">Market Value</div>
                <div className="text-right">P&L</div>
                <div className="text-center">Actions</div>
              </div>

              {/* Position Rows */}
              {filteredPositions.map((position) => (
                <div
                  key={position.symbol}
                  className="grid grid-cols-7 gap-4 p-4 border-b hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{position.symbol}</span>
                    <Badge variant={position.side === 'long' ? 'default' : 'secondary'} className="text-xs">
                      {position.side}
                    </Badge>
                  </div>
                  
                  <div className="text-center font-mono">
                    {Math.abs(position.quantity)}
                  </div>
                  
                  <div className="text-right font-mono">
                    ${position.avgPrice.toFixed(2)}
                  </div>
                  
                  <div className="text-right font-mono">
                    ${position.currentPrice.toFixed(2)}
                  </div>
                  
                  <div className="text-right font-mono">
                    ${position.marketValue.toLocaleString()}
                  </div>
                  
                  <div className="text-right">
                    <div className={`font-semibold ${position.unrealizedPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {position.unrealizedPnL >= 0 ? '+' : ''}${position.unrealizedPnL.toFixed(0)}
                    </div>
                    <div className={`text-xs ${position.unrealizedPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {(((position.currentPrice - position.avgPrice) / position.avgPrice) * 100).toFixed(2)}%
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onTradeAction?.('add', position.symbol)}
                      className="text-xs px-2 text-success border-success hover:bg-success/10"
                    >
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onTradeAction?.('close', position.symbol)}
                      className="text-xs px-2 text-destructive border-destructive hover:bg-destructive/10"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {filteredPositions.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Positions Found</h3>
            <p className="text-muted-foreground">
              {filterBy === 'winners' 
                ? 'No winning positions in your portfolio'
                : filterBy === 'losers'
                ? 'No losing positions in your portfolio'
                : 'Your portfolio is currently empty'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};