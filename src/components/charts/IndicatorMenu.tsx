import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Layers, Check } from 'lucide-react';

interface IndicatorMenuProps {
  indicators: Record<string, boolean>;
  onToggleIndicator: (indicator: string) => void;
}

export const IndicatorMenu: React.FC<IndicatorMenuProps> = ({ indicators, onToggleIndicator }) => {
  const indicatorList = [
    { key: 'SMA20', label: 'SMA 20' },
    { key: 'SMA50', label: 'SMA 50' },
    { key: 'EMA20', label: 'EMA 20' },
    { key: 'RSI', label: 'RSI' },
    { key: 'MACD', label: 'MACD' },
    { key: 'BB', label: 'Bollinger Bands' },
    { key: 'VWAP', label: 'VWAP' },
    { key: 'ATR', label: 'ATR' }
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Layers className="w-4 h-4" />
          Indicators
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {indicatorList.map((indicator) => (
          <DropdownMenuItem
            key={indicator.key}
            onClick={() => onToggleIndicator(indicator.key)}
            className="flex items-center justify-between"
          >
            <span>{indicator.label}</span>
            {indicators[indicator.key] && <Check className="w-4 h-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};