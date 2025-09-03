import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function ManualOrderCard() {
  const [symbol, setSymbol] = useState('');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop' | 'stop_limit'>('market');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const estimatedCost = parseFloat(quantity) * parseFloat(price || '0');
  const riskReward = takeProfit && stopLoss ? 
    (Math.abs(parseFloat(takeProfit) - parseFloat(price || '0')) / Math.abs(parseFloat(price || '0') - parseFloat(stopLoss))).toFixed(2) : 
    '—';

  const handlePreview = () => {
    if (!symbol || !quantity) {
      toast({
        title: "Validation Error",
        description: "Please enter symbol and quantity",
        variant: "destructive"
      });
      return;
    }

    // Show preview modal here
    toast({
      title: "Order Preview",
      description: `${side.toUpperCase()} ${quantity} shares of ${symbol.toUpperCase()}`
    });
  };

  const handleExecute = async () => {
    if (!symbol || !quantity) {
      toast({
        title: "Validation Error", 
        description: "Please enter symbol and quantity",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('trade-execute', {
        body: {
          symbol: symbol.toUpperCase(),
          side,
          order_type: orderType,
          quantity: parseFloat(quantity),
          price: price ? parseFloat(price) : null,
          stop_price: stopPrice ? parseFloat(stopPrice) : null,
          stop_loss: stopLoss ? parseFloat(stopLoss) : null,
          take_profit: takeProfit ? parseFloat(takeProfit) : null
        }
      });

      if (error) throw error;

      toast({
        title: "Order Executed",
        description: `Successfully placed ${side} order for ${quantity} shares of ${symbol.toUpperCase()}`,
      });

      // Reset form
      setSymbol('');
      setQuantity('');
      setPrice('');
      setStopPrice('');
      setStopLoss('');
      setTakeProfit('');

    } catch (error: any) {
      toast({
        title: "Execution Failed",
        description: error.message || "Failed to place order",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="sticky top-6 bg-gradient-card shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Manual Order
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Symbol */}
        <div className="space-y-2">
          <Label htmlFor="symbol">Symbol</Label>
          <Input
            id="symbol"
            placeholder="AAPL"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="uppercase"
          />
        </div>

        {/* Side & Type */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label>Side</Label>
            <Select value={side} onValueChange={(value: 'buy' | 'sell') => setSide(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={orderType} onValueChange={(value: any) => setOrderType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="market">Market</SelectItem>
                <SelectItem value="limit">Limit</SelectItem>
                <SelectItem value="stop">Stop</SelectItem>
                <SelectItem value="stop_limit">Stop Limit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity (Shares)</Label>
          <Input
            id="quantity"
            type="number"
            placeholder="100"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>

        {/* Price (for limit orders) */}
        {orderType !== 'market' && (
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        )}

        {/* Stop Price (for stop orders) */}
        {(orderType === 'stop' || orderType === 'stop_limit') && (
          <div className="space-y-2">
            <Label htmlFor="stopPrice">Stop Price</Label>
            <Input
              id="stopPrice"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
            />
          </div>
        )}

        <Separator />

        {/* Risk Management */}
        <div className="space-y-4">
          <Label className="text-sm font-semibold">Risk Management (Optional)</Label>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="stopLoss">Stop Loss</Label>
              <Input
                id="stopLoss"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="takeProfit">Take Profit</Label>
              <Input
                id="takeProfit"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
              />
            </div>
          </div>

          {stopLoss && takeProfit && (
            <div className="flex justify-between text-sm">
              <span>Risk:Reward</span>
              <Badge variant="outline">1:{riskReward}</Badge>
            </div>
          )}
        </div>

        <Separator />

        {/* Order Summary */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Estimated Cost:</span>
            <span className="font-semibold">${estimatedCost.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Risk Status:</span>
            <Badge variant="secondary" className="text-xs">
              Within Caps
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button onClick={handlePreview} variant="outline" className="w-full">
            Preview Order
          </Button>
          <Button 
            onClick={handleExecute} 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? 'Executing...' : 'Execute Order'}
          </Button>
        </div>

        {/* Compliance Notice */}
        <div className="p-3 bg-muted/30 rounded-md">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Orders are mirrored via your brokerage; StagAlgo does not custody funds. 
              Performance targets are goals, not guarantees.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}