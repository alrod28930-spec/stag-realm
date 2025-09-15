import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  Target,
  StopCircle,
  Calculator,
  AlertTriangle,
  CheckCircle,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OrderTicketProps {
  symbol?: string;
  currentPrice?: number;
  onOrderSubmit?: (order: any) => void;
  maxRiskPercent?: number;
  accountEquity?: number;
  isDemo?: boolean;
}

export const OrderTicket: React.FC<OrderTicketProps> = ({
  symbol = 'AAPL',
  currentPrice = 150.25,
  onOrderSubmit,
  maxRiskPercent = 2,
  accountEquity = 100000,
  isDemo = false
}) => {
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('100');
  const [price, setPrice] = useState(currentPrice.toString());
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [useStops, setUseStops] = useState(false);
  const [riskPercent, setRiskPercent] = useState('1');
  const [autoCalculate, setAutoCalculate] = useState(true);

  const { toast } = useToast();

  // Auto-update price when currentPrice changes
  useEffect(() => {
    if (orderType === 'market') {
      setPrice(currentPrice.toString());
    }
  }, [currentPrice, orderType]);

  // Risk calculation
  const calculateRisk = () => {
    const qty = parseInt(quantity) || 0;
    const orderPrice = parseFloat(price) || 0;
    const stopPrice = parseFloat(stopLoss) || 0;
    
    if (!qty || !orderPrice || !stopPrice) return null;
    
    const riskPerShare = Math.abs(orderPrice - stopPrice);
    const totalRisk = riskPerShare * qty;
    const riskPercentOfAccount = (totalRisk / accountEquity) * 100;
    
    return {
      riskPerShare,
      totalRisk,
      riskPercentOfAccount,
      maxShares: Math.floor((accountEquity * (parseFloat(riskPercent) / 100)) / riskPerShare)
    };
  };

  const riskCalc = calculateRisk();

  // Auto-calculate quantity based on risk
  useEffect(() => {
    if (autoCalculate && useStops && riskCalc?.maxShares) {
      setQuantity(Math.min(riskCalc.maxShares, 1000).toString());
    }
  }, [stopLoss, riskPercent, autoCalculate, useStops, riskCalc?.maxShares]);

  // Calculate potential profit
  const calculateProfit = () => {
    const qty = parseInt(quantity) || 0;
    const orderPrice = parseFloat(price) || 0;
    const profitPrice = parseFloat(takeProfit) || 0;
    
    if (!qty || !orderPrice || !profitPrice) return null;
    
    const profitPerShare = Math.abs(profitPrice - orderPrice);
    const totalProfit = profitPerShare * qty;
    
    return {
      profitPerShare,
      totalProfit,
      riskReward: riskCalc ? totalProfit / riskCalc.totalRisk : 0
    };
  };

  const profitCalc = calculateProfit();

  const handleSubmit = () => {
    const order = {
      symbol,
      side,
      type: orderType,
      quantity: parseInt(quantity),
      price: orderType === 'market' ? currentPrice : parseFloat(price),
      stopLoss: useStops && stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: useStops && takeProfit ? parseFloat(takeProfit) : undefined,
      timestamp: Date.now(),
      riskPercent: riskCalc?.riskPercentOfAccount || 0
    };

    // Risk validation
    if (riskCalc && riskCalc.riskPercentOfAccount > maxRiskPercent) {
      toast({
        title: "Risk Limit Exceeded",
        description: `Order risk ${riskCalc.riskPercentOfAccount.toFixed(2)}% exceeds limit of ${maxRiskPercent}%`,
        variant: "destructive"
      });
      return;
    }

    onOrderSubmit?.(order);
    
    toast({
      title: "Order Submitted",
      description: `${side.toUpperCase()} ${quantity} ${symbol} ${orderType === 'market' ? 'at market' : `@ $${price}`}`,
    });
  };

  const getRiskColor = () => {
    if (!riskCalc) return 'text-muted-foreground';
    if (riskCalc.riskPercentOfAccount > maxRiskPercent) return 'text-destructive';
    if (riskCalc.riskPercentOfAccount > maxRiskPercent * 0.7) return 'text-warning';
    return 'text-success';
  };

  const isValidOrder = () => {
    const qty = parseInt(quantity);
    const orderPrice = parseFloat(price);
    
    return qty > 0 && orderPrice > 0 && (!riskCalc || riskCalc.riskPercentOfAccount <= maxRiskPercent);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Order Ticket</CardTitle>
          {isDemo && (
            <Badge variant="secondary" className="text-xs">DEMO</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm font-mono">
            {symbol}
          </Badge>
          <Badge variant="outline" className="text-sm">
            ${currentPrice.toFixed(2)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Side Selection */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={side === 'buy' ? 'default' : 'outline'}
            onClick={() => setSide('buy')}
            className={side === 'buy' ? 'bg-success hover:bg-success/90' : 'border-success text-success hover:bg-success/10'}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            BUY
          </Button>
          <Button
            variant={side === 'sell' ? 'default' : 'outline'}
            onClick={() => setSide('sell')}
            className={side === 'sell' ? 'bg-destructive hover:bg-destructive/90' : 'border-destructive text-destructive hover:bg-destructive/10'}
          >
            <TrendingDown className="w-4 h-4 mr-2" />
            SELL
          </Button>
        </div>

        {/* Order Type */}
        <div className="space-y-2">
          <Label>Order Type</Label>
          <Select value={orderType} onValueChange={(value: any) => setOrderType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="market">Market</SelectItem>
              <SelectItem value="limit">Limit</SelectItem>
              <SelectItem value="stop">Stop</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quantity and Price */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="100"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Price</Label>
            <Input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={orderType === 'market'}
              placeholder={currentPrice.toFixed(2)}
            />
          </div>
        </div>

        {/* Risk Management Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="use-stops">Risk Management</Label>
          <Switch
            id="use-stops"
            checked={useStops}
            onCheckedChange={setUseStops}
          />
        </div>

        {/* Stop Loss and Take Profit */}
        {useStops && (
          <div className="space-y-3 border rounded-lg p-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Auto-Calculate Size</Label>
              <Switch
                checked={autoCalculate}
                onCheckedChange={setAutoCalculate}
              />
            </div>

            {autoCalculate && (
              <div className="space-y-2">
                <Label>Risk Percent</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    value={riskPercent}
                    onChange={(e) => setRiskPercent(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <StopCircle className="w-3 h-3 text-destructive" />
                  Stop Loss
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  placeholder="148.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-success" />
                  Take Profit
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  placeholder="152.00"
                />
              </div>
            </div>
          </div>
        )}

        {/* Risk Calculation Display */}
        {riskCalc && (
          <div className="space-y-2 border rounded-lg p-3 bg-muted/10">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              <Label className="text-sm">Risk Analysis</Label>
            </div>
            
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Risk per share:</span>
                <span className="font-mono">${riskCalc.riskPerShare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total risk:</span>
                <span className="font-mono">${riskCalc.totalRisk.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Risk %:</span>
                <span className={`font-mono ${getRiskColor()}`}>
                  {riskCalc.riskPercentOfAccount.toFixed(2)}%
                </span>
              </div>
              
              {profitCalc && (
                <>
                  <Separator className="my-1" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Potential profit:</span>
                    <span className="font-mono text-success">
                      ${profitCalc.totalProfit.toFixed(0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Risk/Reward:</span>
                    <span className="font-mono">
                      1:{profitCalc.riskReward.toFixed(1)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Risk Progress Bar */}
            <Progress 
              value={(riskCalc.riskPercentOfAccount / maxRiskPercent) * 100}
              className="h-2"
            />
          </div>
        )}

        {/* Order Summary */}
        <div className="space-y-2 border rounded-lg p-3 bg-primary/5">
          <Label className="text-sm">Order Summary</Label>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>Action:</span>
              <Badge variant={side === 'buy' ? 'default' : 'destructive'}>
                {side.toUpperCase()} {quantity} {symbol}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Type:</span>
              <span className="font-mono">{orderType.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span>Price:</span>
              <span className="font-mono">
                {orderType === 'market' ? 'Market' : `$${price}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Value:</span>
              <span className="font-mono">
                ${((parseInt(quantity) || 0) * (parseFloat(price) || 0)).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit}
          disabled={!isValidOrder()}
          className={`w-full ${
            side === 'buy' 
              ? 'bg-success hover:bg-success/90' 
              : 'bg-destructive hover:bg-destructive/90'
          }`}
          size="lg"
        >
          {!isValidOrder() ? (
            <>
              <AlertTriangle className="w-4 h-4 mr-2" />
              Invalid Order
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Place {side.toUpperCase()} Order
            </>
          )}
        </Button>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setSide('buy');
              setOrderType('limit');
              setPrice((currentPrice * 0.995).toFixed(2)); // 0.5% below market
            }}
          >
            Buy @ Bid
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setSide('sell');
              setOrderType('limit');
              setPrice((currentPrice * 1.005).toFixed(2)); // 0.5% above market
            }}
          >
            Sell @ Ask
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};