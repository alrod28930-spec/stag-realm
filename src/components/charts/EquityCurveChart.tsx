import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface EquityPoint {
  date: string;
  equity: number;
  benchmark?: number;
  drawdown?: number;
}

interface EquityCurveChartProps {
  data: EquityPoint[];
  title?: string;
  showBenchmark?: boolean;
  showDrawdown?: boolean;
  height?: number;
  className?: string;
  isDemo?: boolean;
}

const DEMO_EQUITY_DATA: EquityPoint[] = [
  { date: '2024-01-01', equity: 100000, benchmark: 100000, drawdown: 0 },
  { date: '2024-01-15', equity: 102500, benchmark: 101200, drawdown: 0 },
  { date: '2024-02-01', equity: 98800, benchmark: 99800, drawdown: -3.6 },
  { date: '2024-02-15', equity: 104200, benchmark: 102100, drawdown: 0 },
  { date: '2024-03-01', equity: 107500, benchmark: 103500, drawdown: 0 },
  { date: '2024-03-15', equity: 105800, benchmark: 104200, drawdown: -1.6 },
  { date: '2024-04-01', equity: 111200, benchmark: 105800, drawdown: 0 },
  { date: '2024-04-15', equity: 114500, benchmark: 107200, drawdown: 0 },
];

export const EquityCurveChart: React.FC<EquityCurveChartProps> = ({
  data = DEMO_EQUITY_DATA,
  title = 'Portfolio Equity Curve',
  showBenchmark = true,
  showDrawdown = false,
  height = 300,
  className = '',
  isDemo = false
}) => {
  const currentEquity = data[data.length - 1]?.equity || 0;
  const startingEquity = data[0]?.equity || 0;
  const totalReturn = ((currentEquity - startingEquity) / startingEquity) * 100;
  const isPositive = totalReturn >= 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
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
            <div className={`flex items-center gap-1 ${isPositive ? 'text-success' : 'text-destructive'}`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="font-semibold">{formatPercent(totalReturn)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Current: {formatCurrency(currentEquity)}</span>
          <span>Starting: {formatCurrency(startingEquity)}</span>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={formatCurrency}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                color: 'hsl(var(--popover-foreground))',
              }}
              formatter={(value: number, name: string) => [
                name === 'equity' ? formatCurrency(value) : 
                name === 'benchmark' ? formatCurrency(value) :
                formatPercent(value),
                name === 'equity' ? 'Portfolio' :
                name === 'benchmark' ? 'Benchmark' : 'Drawdown'
              ]}
              labelFormatter={(date) => new Date(date).toLocaleDateString()}
            />
            
            <ReferenceLine y={startingEquity} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" />
            
            <Line
              type="monotone"
              dataKey="equity"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
            />
            
            {showBenchmark && (
              <Line
                type="monotone"
                dataKey="benchmark"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
              />
            )}
            
            {showDrawdown && (
              <Line
                type="monotone"
                dataKey="drawdown"
                stroke="hsl(var(--destructive))"
                strokeWidth={1}
                dot={false}
                yAxisId="drawdown"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};