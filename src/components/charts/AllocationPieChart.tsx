import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PieChart as PieIcon, BarChart3 } from 'lucide-react';

interface AllocationData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

interface AllocationPieChartProps {
  data?: AllocationData[];
  title?: string;
  viewMode?: 'symbol' | 'sector' | 'strategy';
  onViewModeChange?: (mode: 'symbol' | 'sector' | 'strategy') => void;
  height?: number;
  className?: string;
  isDemo?: boolean;
}

const DEMO_SYMBOL_DATA: AllocationData[] = [
  { name: 'AAPL', value: 45000, color: 'hsl(var(--primary))', percentage: 30 },
  { name: 'MSFT', value: 30000, color: 'hsl(var(--secondary))', percentage: 20 },
  { name: 'GOOGL', value: 22500, color: 'hsl(var(--success))', percentage: 15 },
  { name: 'TSLA', value: 15000, color: 'hsl(var(--warning))', percentage: 10 },
  { name: 'NVDA', value: 12000, color: 'hsl(var(--info))', percentage: 8 },
  { name: 'Others', value: 25500, color: 'hsl(var(--muted))', percentage: 17 },
];

const DEMO_SECTOR_DATA: AllocationData[] = [
  { name: 'Technology', value: 75000, color: 'hsl(var(--primary))', percentage: 50 },
  { name: 'Financial', value: 30000, color: 'hsl(var(--secondary))', percentage: 20 },
  { name: 'Healthcare', value: 22500, color: 'hsl(var(--success))', percentage: 15 },
  { name: 'Consumer', value: 15000, color: 'hsl(var(--warning))', percentage: 10 },
  { name: 'Energy', value: 7500, color: 'hsl(var(--destructive))', percentage: 5 },
];

const DEMO_STRATEGY_DATA: AllocationData[] = [
  { name: 'Growth Bot', value: 60000, color: 'hsl(var(--primary))', percentage: 40 },
  { name: 'Value Bot', value: 45000, color: 'hsl(var(--secondary))', percentage: 30 },
  { name: 'Dividend Bot', value: 30000, color: 'hsl(var(--success))', percentage: 20 },
  { name: 'Manual Trades', value: 15000, color: 'hsl(var(--warning))', percentage: 10 },
];

export const AllocationPieChart: React.FC<AllocationPieChartProps> = ({
  data,
  title = 'Portfolio Allocation',
  viewMode = 'symbol',
  onViewModeChange,
  height = 300,
  className = '',
  isDemo = false
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  
  const getCurrentData = () => {
    if (data) return data;
    
    // Only show demo data for demo accounts, empty for real accounts
    if (!isDemo) return [];
    
    switch (viewMode) {
      case 'sector':
        return DEMO_SECTOR_DATA;
      case 'strategy':
        return DEMO_STRATEGY_DATA;
      default:
        return DEMO_SYMBOL_DATA;
    }
  };

  const chartData = getCurrentData();
  const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(data.value)} ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <div className="flex items-center gap-2">
            {isDemo && (
              <Badge variant="secondary" className="text-xs">
                DEMO
              </Badge>
            )}
            <div className="text-sm text-muted-foreground">
              {formatCurrency(totalValue)}
            </div>
          </div>
        </div>
        
        {onViewModeChange && (
          <div className="flex gap-1">
            <Button
              variant={viewMode === 'symbol' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewModeChange('symbol')}
            >
              Symbols
            </Button>
            <Button
              variant={viewMode === 'sector' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewModeChange('sector')}
            >
              Sectors
            </Button>
            <Button
              variant={viewMode === 'strategy' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewModeChange('strategy')}
            >
              Strategies
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center">
          <ResponsiveContainer width="60%" height={height}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke={activeIndex === index ? 'hsl(var(--foreground))' : 'none'}
                    strokeWidth={activeIndex === index ? 2 : 0}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          
          <div className="flex-1 space-y-2">
            {chartData.map((item, index) => (
              <div
                key={item.name}
                className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                  activeIndex === index ? 'bg-muted' : 'hover:bg-muted/50'
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{item.percentage}%</div>
                  <div className="text-xs text-muted-foreground">
                    {formatCurrency(item.value)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};