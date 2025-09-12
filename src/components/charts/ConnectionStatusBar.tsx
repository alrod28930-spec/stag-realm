import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, Clock, AlertCircle } from 'lucide-react';
import { usePortfolioStore } from '@/stores/portfolioStore';

export const ConnectionStatusBar: React.FC = () => {
  const { isConnected } = usePortfolioStore();

  return (
    <div className="border-t border-border bg-card/30 p-3">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <Badge variant={isConnected ? "default" : "destructive"} className="gap-1">
            <Wifi className="w-3 h-3" />
            {isConnected ? 'Paper Trading' : 'Disconnected'}
          </Badge>
          
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            Stream: 45ms
          </Badge>
          
          <span className="text-muted-foreground">
            Last update: {new Date().toLocaleTimeString()}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-warning" />
          <span className="text-muted-foreground text-xs">
            Educational only. StagAlgo does not hold funds.
          </span>
        </div>
      </div>
    </div>
  );
};