import { AlertTriangle, Info, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DisclaimerBadgeProps {
  variant?: 'minimal' | 'standard' | 'detailed';
  component: string;
  className?: string;
}

export function DisclaimerBadge({ variant = 'minimal', component, className }: DisclaimerBadgeProps) {
  const getContent = () => {
    switch (variant) {
      case 'minimal':
        return 'Not financial advice';
      case 'standard':
        return 'Educational purposes only. Not financial advice.';
      case 'detailed':
        return 'StagAlgo provides market analysis tools for educational purposes only. This is not financial, investment, or trading advice. You are solely responsible for your investment decisions.';
      default:
        return 'Not financial advice';
    }
  };

  const getIcon = () => {
    switch (component) {
      case 'trade_bots':
        return <Shield className="w-3 h-3" />;
      case 'analyst':
        return <AlertTriangle className="w-3 h-3" />;
      default:
        return <Info className="w-3 h-3" />;
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge 
            variant="outline" 
            className={`text-xs bg-muted/50 text-muted-foreground hover:bg-muted/70 ${className}`}
          >
            {getIcon()}
            <span className="ml-1">
              {variant === 'minimal' ? 'Disclaimer' : getContent()}
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-xs">{getContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}