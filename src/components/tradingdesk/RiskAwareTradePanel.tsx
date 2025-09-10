// Risk-Aware Trade Panel - Integrates risk enforcement with trading interface

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Shield,
  Eye
} from 'lucide-react';
import { riskEnforcement, type TradeRequest } from '@/services/riskEnforcement';
import { useToggleService } from '@/hooks/useToggleService';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export interface RiskAwareTradePanel {
  onTradeExecute?: (request: TradeRequest) => void;
  className?: string;
}

export function RiskAwareTradePanel({ onTradeExecute, className }: RiskAwareTradePanel) {
  const { toast } = useToast();
  const { toggleState } = useToggleService();
  
  const [symbol, setSymbol] = useState('');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [lastRiskCheck, setLastRiskCheck] = useState<any>(null);

  const handleRiskCheck = async () => {
    if (!symbol || !quantity) {
      toast({
        title: "Missing Information", 
        description: "Please enter symbol and quantity",
        variant: "destructive"
      });
      return;
    }

    setIsChecking(true);
    
    const request: TradeRequest = {
      symbol: symbol.toUpperCase(),
      side,
      quantity: parseInt(quantity),
      price: price ? parseFloat(price) : undefined,
      orderType: price ? 'limit' : 'market',
      source: 'manual'
    };

    try {
      const riskResult = await riskEnforcement.checkTradeRisk(request, {
        totalValue: 100000, // Mock portfolio value
        availableCash: 25000,
        positions: []
      });
      
      setLastRiskCheck({ request, result: riskResult });
      
      // Show risk check results
      if (!riskResult.allowed) {
        toast({
          title: "Trade Blocked", 
          description: `Risk violations: ${riskResult.violations.join(', ')}`,
          variant: "destructive"
        });
      } else if (riskResult.warnings.length > 0) {
        toast({
          title: "Risk Warnings",
          description: riskResult.warnings.join(', '),
          variant: "default"
        });
      } else {
        toast({
          title: "Trade Approved",
          description: "No risk violations detected",
          variant: "default"
        });
      }
      
    } catch (error) {
      toast({
        title: "Risk Check Failed",
        description: "Unable to validate trade risk",
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleExecuteTrade = () => {
    if (lastRiskCheck && onTradeExecute) {
      let finalRequest = lastRiskCheck.request;
      
      // Apply any modifications from risk check
      if (lastRiskCheck.result.modifications) {
        finalRequest = { ...finalRequest, ...lastRiskCheck.result.modifications };
      }
      
      onTradeExecute(finalRequest);
      
      toast({
        title: "Trade Executed",
        description: `${finalRequest.side.toUpperCase()} ${finalRequest.quantity} shares of ${finalRequest.symbol}`,
        variant: "default"
      });
      
      // Reset form
      setSymbol('');
      setQuantity('');
      setPrice('');
      setLastRiskCheck(null);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default: return 'bg-green-500/20 text-green-300 border-green-500/30';
    }
  };

  const enforcementStatus = riskEnforcement.getRiskEnforcementStatus();

  return (
    <Card className={cn("bg-gradient-card shadow-card", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Risk-Controlled Trading
            </CardTitle>
            <CardDescription>
              Trade execution with integrated risk management
            </CardDescription>
          </div>
          <Badge 
            className={cn("text-xs", 
              enforcementStatus.tradingAllowed 
                ? "bg-green-500/20 text-green-300" 
                : "bg-red-500/20 text-red-300"
            )}
          >
            {enforcementStatus.tradingAllowed ? 'Trading Enabled' : 'Trading Halted'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Risk Status Display */}
        <Alert className={cn("border", 
          toggleState.riskGovernorsEnabled 
            ? "border-green-500/30 bg-green-500/10" 
            : "border-red-500/30 bg-red-500/10"
        )}>
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <div className="flex items-center justify-between">
              <span>
                Risk Controls: {toggleState.riskGovernorsEnabled ? 'ACTIVE' : 'DISABLED'}
              </span>
              <Badge variant="outline" className="text-xs">
                {enforcementStatus.enforcementLevel}
              </Badge>
            </div>
            {enforcementStatus.activeControls.length > 0 && (
              <p className="text-xs mt-1 text-muted-foreground">
                Active: {enforcementStatus.activeControls.join(', ')}
              </p>
            )}
          </AlertDescription>
        </Alert>

        {/* Trade Input Form */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="symbol">Symbol</Label>
            <Input
              id="symbol"
              placeholder="AAPL"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="uppercase"
            />
          </div>
          <div>
            <Label htmlFor="side">Side</Label>
            <select
              id="side" 
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={side}
              onChange={(e) => setSide(e.target.value as 'buy' | 'sell')}
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              placeholder="100"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="price">Price (Optional)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              placeholder="Market"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>

        {/* Risk Check Results */}
        {lastRiskCheck && (
          <Alert className={cn("border", getRiskLevelColor(lastRiskCheck.result.riskLevel))}>
            <Eye className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Risk Assessment Complete</span>
                  <Badge className={cn("text-xs", getRiskLevelColor(lastRiskCheck.result.riskLevel))}>
                    {lastRiskCheck.result.riskLevel.toUpperCase()}
                  </Badge>
                </div>
                
                {lastRiskCheck.result.violations.length > 0 && (
                  <div>
                    <p className="font-medium text-xs text-red-300 mb-1">Violations:</p>
                    <ul className="text-xs space-y-1">
                      {lastRiskCheck.result.violations.map((violation: string, index: number) => (
                        <li key={index} className="flex items-center gap-2">
                          <AlertTriangle className="w-3 h-3 text-red-400" />
                          {violation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {lastRiskCheck.result.warnings.length > 0 && (
                  <div>
                    <p className="font-medium text-xs text-yellow-300 mb-1">Warnings:</p>
                    <ul className="text-xs space-y-1">
                      {lastRiskCheck.result.warnings.map((warning: string, index: number) => (
                        <li key={index} className="flex items-center gap-2">
                          <AlertTriangle className="w-3 h-3 text-yellow-400" />
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {lastRiskCheck.result.modifications && (
                  <div>
                    <p className="font-medium text-xs text-blue-300 mb-1">Modifications Applied:</p>
                    <ul className="text-xs space-y-1">
                      {Object.entries(lastRiskCheck.result.modifications).map(([key, value]) => (
                        <li key={key} className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-blue-400" />
                          {key}: {String(value)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={handleRiskCheck}
            disabled={isChecking || !enforcementStatus.tradingAllowed}
            className="flex-1"
            variant="outline"
          >
            {isChecking ? 'Checking Risk...' : 'Check Risk'}
          </Button>
          
          <Button
            onClick={handleExecuteTrade}
            disabled={!lastRiskCheck || !lastRiskCheck.result.allowed || !enforcementStatus.tradingAllowed}
            className="flex-1 bg-accent hover:bg-accent/90"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Execute Trade
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}