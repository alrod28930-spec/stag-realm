import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ExternalLink, BarChart3, TrendingUp } from 'lucide-react';
import { useBrokerageDockStore } from '@/stores/brokerageDockStore';
import { useToast } from '@/hooks/use-toast';

interface SymbolIntegrationButtonProps {
  symbol: string;
  context?: {
    price?: number;
    direction?: 'buy' | 'sell';
    quantity?: number;
  };
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default';
}

export function SymbolIntegrationButton({ 
  symbol, 
  context, 
  variant = 'outline', 
  size = 'sm' 
}: SymbolIntegrationButtonProps) {
  const { sendSymbolContext, navigateToSymbolChart } = useBrokerageDockStore();
  const { toast } = useToast();

  const handleSendToDock = () => {
    sendSymbolContext(symbol, context);
    toast({
      title: "Symbol sent to Brokerage Dock",
      description: `${symbol} context has been sent to the dock`,
    });
  };

  const handleOpenChart = () => {
    navigateToSymbolChart(symbol);
    // Open Brokerage Dock in new tab if not already open
    window.open('/brokerage-dock', '_blank');
  };

  const handleOpenInNew = (provider: string) => {
    let url = '';
    switch (provider) {
      case 'tradingview':
        url = `https://www.tradingview.com/chart/?symbol=${symbol}`;
        break;
      case 'yahoo':
        url = `https://finance.yahoo.com/quote/${symbol}`;
        break;
      case 'marketwatch':
        url = `https://www.marketwatch.com/investing/stock/${symbol}`;
        break;
    }
    window.open(url, '_blank');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size}>
          <BarChart3 className="h-4 w-4 mr-1" />
          Chart
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleSendToDock}>
          <TrendingUp className="h-4 w-4 mr-2" />
          Send to Brokerage Dock
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOpenChart}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Open Chart in Dock
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleOpenInNew('tradingview')}>
          <ExternalLink className="h-4 w-4 mr-2" />
          TradingView (New Tab)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleOpenInNew('yahoo')}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Yahoo Finance (New Tab)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleOpenInNew('marketwatch')}>
          <ExternalLink className="h-4 w-4 mr-2" />
          MarketWatch (New Tab)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}