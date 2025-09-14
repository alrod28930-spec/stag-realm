import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, TrendingDown } from 'lucide-react';

interface RiskMetric {
  name: string;
  value: number;
  threshold: number;
  status: 'safe' | 'warning' | 'danger';
}

interface RiskMetricsChartProps {
  metrics?: RiskMetric[];
  title?: string;
  height?: number;
  className?: string;
  isDemo?: boolean;
}

const DEMO_RISK_METRICS: RiskMetric[] = [
  { name: 'Daily VaR', value: -2.1, threshold: -3.0, status: 'safe' },
  { name: 'Max Drawdown', value: -5.8, threshold: -10.0, status: 'safe' },
  { name: 'Beta', value: 1.2, threshold: 1.5, status: 'safe' },
  { name: 'Concentration', value: 35, threshold: 40, status: 'warning' },
  { name: 'Leverage', value: 0.8, threshold: 1.0, status: 'safe' },
  { name: 'Liquidity Score', value: 85, threshold: 70, status: 'safe' },
];

export const RiskMetricsChart: React.FC<RiskMetricsChartProps> = ({
  metrics = DEMO_RISK_METRICS,
  title = 'Risk Metrics Dashboard',
  height = 300,
  className = '',
  isDemo = false
}) => {
  const getColorByStatus = (status: string) => {
    switch (status) {
      case 'safe':
        return 'hsl(var(--success))';
      case 'warning':
        return 'hsl(var(--warning))';
      case 'danger':
        return 'hsl(var(--destructive))';
      default:
        return 'hsl(var(--muted))';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'safe':
        return <Shield className="w-4 h-4 text-success" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'danger':
        return <TrendingDown className="w-4 h-4 text-destructive" />;
      default:
        return null;
    }
  };

  const formatValue = (value: number, name: string) => {
    if (name.includes('VaR') || name.includes('Drawdown')) {
      return `${value.toFixed(1)}%`;
    } else if (name === 'Beta' || name === 'Leverage') {
      return value.toFixed(2);
    } else if (name.includes('Score') || name === 'Concentration') {
      return `${value.toFixed(0)}${name.includes('Score') ? '' : '%'}`;
    }
    return value.toFixed(1);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm">
            Current: <span className="font-semibold">{formatValue(data.value, data.name)}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Threshold: {formatValue(data.threshold, data.name)}
          </p>
          <div className="flex items-center gap-1 mt-1">
            {getStatusIcon(data.status)}
            <span className="text-xs capitalize">{data.status}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const overallRiskLevel = () => {
    const dangerCount = metrics.filter(m => m.status === 'danger').length;
    const warningCount = metrics.filter(m => m.status === 'warning').length;
    
    if (dangerCount > 0) return 'danger';
    if (warningCount > 0) return 'warning';
    return 'safe';
  };

  const riskLevel = overallRiskLevel();

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
            <div className="flex items-center gap-1">
              {getStatusIcon(riskLevel)}
              <Badge 
                variant={riskLevel === 'safe' ? 'default' : riskLevel === 'warning' ? 'secondary' : 'destructive'}
              >
                {riskLevel.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={metrics} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {metrics.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColorByStatus(entry.status)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {metrics.map((metric) => (
            <div key={metric.name} className="flex items-center justify-between p-2 rounded border">
              <div className="flex items-center gap-2">
                {getStatusIcon(metric.status)}
                <span className="text-sm font-medium">{metric.name}</span>
              </div>
              <span className="text-sm font-semibold">
                {formatValue(metric.value, metric.name)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};