import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react';
import { format } from 'date-fns';

interface EquityPoint {
  timestamp: number;
  equity: number;
  realizedPnL: number;
  unrealizedPnL: number;
  dayTrades: number;
}

interface IntradayEquityCurveProps {
  data?: EquityPoint[];
  height?: number;
  startingEquity?: number;
  maxDailyLoss?: number;
  targetPnL?: number;
  isDemo?: boolean;
}

export const IntradayEquityCurve: React.FC<IntradayEquityCurveProps> = ({
  data,
  height = 300,
  startingEquity = 100000,
  maxDailyLoss = -1000,
  targetPnL = 500,
  isDemo = false
}) => {
  // Generate demo data if no real data provided
  const chartData = useMemo(() => {
    if (data && data.length > 0) {
      return data.map(point => ({
        time: format(new Date(point.timestamp), 'HH:mm'),
        equity: point.equity,
        realizedPnL: point.realizedPnL,
        unrealizedPnL: point.unrealizedPnL,
        totalPnL: point.realizedPnL + point.unrealizedPnL,
        dayTrades: point.dayTrades,
        timestamp: point.timestamp
      }));
    }

    // Generate demo intraday curve
    const now = new Date();
    const marketOpen = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30);
    const points: any[] = [];
    let currentEquity = startingEquity;
    let realizedPnL = 0;
    let unrealizedPnL = 0;
    let trades = 0;

    for (let i = 0; i < 390; i += 15) { // Every 15 minutes during market hours
      const timestamp = new Date(marketOpen.getTime() + i * 60000);
      
      // Simulate trading activity with some volatility
      const tradeProb = Math.random();
      if (tradeProb > 0.8) {
        const tradePnL = (Math.random() - 0.4) * 200; // Slight positive bias
        realizedPnL += tradePnL;
        trades += 1;
      }
      
      // Simulate unrealized P&L fluctuation
      unrealizedPnL = (Math.random() - 0.5) * 100;
      
      currentEquity = startingEquity + realizedPnL + unrealizedPnL;
      
      points.push({
        time: format(timestamp, 'HH:mm'),
        equity: currentEquity,
        realizedPnL,
        unrealizedPnL,
        totalPnL: realizedPnL + unrealizedPnL,
        dayTrades: trades,
        timestamp: timestamp.getTime()
      });
    }

    return points;
  }, [data, startingEquity]);

  const currentEquity = chartData.length > 0 ? chartData[chartData.length - 1].equity : startingEquity;
  const totalPnL = currentEquity - startingEquity;
  const realizedPnL = chartData.length > 0 ? chartData[chartData.length - 1].realizedPnL : 0;
  const unrealizedPnL = chartData.length > 0 ? chartData[chartData.length - 1].unrealizedPnL : 0;
  const dayTrades = chartData.length > 0 ? chartData[chartData.length - 1].dayTrades : 0;

  const isPositive = totalPnL >= 0;
  const hitMaxLoss = totalPnL <= maxDailyLoss;
  const hitTarget = totalPnL >= targetPnL;

  const getLineColor = () => {
    if (hitMaxLoss) return 'hsl(var(--destructive))';
    if (hitTarget) return 'hsl(var(--success))';
    return isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))';
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Intraday Equity Curve</CardTitle>
          <div className="flex items-center gap-2">
            {isDemo && (
              <Badge variant="secondary" className="text-xs">DEMO</Badge>
            )}
            <Badge variant={isPositive ? 'default' : 'destructive'} className="text-xs">
              {isPositive ? '+' : ''}${totalPnL.toFixed(0)}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">Equity:</span>
            <span className="font-medium">${currentEquity.toLocaleString()}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">Realized:</span>
            <span className={`font-medium ${realizedPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
              {realizedPnL >= 0 ? '+' : ''}${realizedPnL.toFixed(0)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Unrealized:</span>
            <span className={`font-medium ${unrealizedPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
              {unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toFixed(0)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Day Trades:</span>
            <Badge variant={dayTrades >= 3 ? 'destructive' : 'outline'} className="text-xs">
              {dayTrades}/3
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div style={{ height: `${height}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="time" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
                formatter={(value: any, name: string) => {
                  if (name === 'equity') {
                    return [`$${value.toLocaleString()}`, 'Equity'];
                  }
                  return [`${value >= 0 ? '+' : ''}$${value.toFixed(0)}`, name];
                }}
                labelFormatter={(label) => `Time: ${label}`}
              />
              
              {/* Starting equity reference line */}
              <ReferenceLine 
                y={startingEquity} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="2 2"
                strokeOpacity={0.5}
              />
              
              {/* Max daily loss line */}
              <ReferenceLine 
                y={startingEquity + maxDailyLoss} 
                stroke="hsl(var(--destructive))" 
                strokeDasharray="2 2"
                strokeOpacity={0.7}
              />
              
              {/* Target P&L line */}
              <ReferenceLine 
                y={startingEquity + targetPnL} 
                stroke="hsl(var(--success))" 
                strokeDasharray="2 2"
                strokeOpacity={0.7}
              />
              
              <Line
                type="monotone"
                dataKey="equity"
                stroke={getLineColor()}
                strokeWidth={2}
                dot={false}
                activeDot={{ 
                  r: 4, 
                  fill: getLineColor(),
                  stroke: 'hsl(var(--background))',
                  strokeWidth: 2
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>

      {/* Risk Status Footer */}
      <div className="px-4 pb-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {hitMaxLoss && (
              <Badge variant="destructive" className="text-xs">
                MAX LOSS HIT
              </Badge>
            )}
            {hitTarget && !hitMaxLoss && (
              <Badge variant="default" className="text-xs">
                TARGET REACHED
              </Badge>
            )}
            {dayTrades >= 3 && (
              <Badge variant="destructive" className="text-xs">
                PDT LIMIT
              </Badge>
            )}
          </div>
          
          <div className="text-muted-foreground">
            Return: {((totalPnL / startingEquity) * 100).toFixed(2)}%
          </div>
        </div>
      </div>
    </Card>
  );
};