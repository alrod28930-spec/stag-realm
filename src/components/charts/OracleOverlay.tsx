import React from 'react';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface OracleOverlayProps {
  symbol: string;
  timeframe: string;
  chartData: any[];
}

export const OracleOverlay: React.FC<OracleOverlayProps> = ({ symbol, timeframe, chartData }) => {
  // Mock Oracle signals
  const signals = [
    { time: '2024-01-15T10:30:00Z', type: 'buy', strength: 0.85, reason: 'Momentum breakout' },
    { time: '2024-01-15T14:15:00Z', type: 'sell', strength: 0.72, reason: 'Resistance hit' }
  ];

  return (
    <div className="absolute top-20 right-4 z-10 space-y-2">
      {signals.map((signal, index) => (
        <Badge 
          key={index} 
          variant={signal.type === 'buy' ? 'default' : 'destructive'}
          className="flex items-center gap-1"
        >
          {signal.type === 'buy' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {signal.type.toUpperCase()} {(signal.strength * 100).toFixed(0)}%
        </Badge>
      ))}
    </div>
  );
};