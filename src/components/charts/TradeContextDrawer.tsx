import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, DollarSign } from 'lucide-react';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { useAuthStore } from '@/stores/authStore';
import { useSecurityAudit } from '@/hooks/useSecurityAudit';

interface TradeContextDrawerProps {
  symbol: string | null;
  onClose: () => void;
}

export const TradeContextDrawer: React.FC<TradeContextDrawerProps> = ({ symbol, onClose }) => {
  const { portfolio } = usePortfolioStore();
  const { user, isAuthenticated } = useAuthStore();
  const securityAudit = useSecurityAudit();
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('');
  const [orderType, setOrderType] = useState('market');
  const [price, setPrice] = useState('');

  const position = portfolio?.positions?.find(p => p.symbol === symbol);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold">Trade & Context</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Position Card */}
        {position && (
          <Card className="p-4">
            <h4 className="font-medium mb-3">Current Position</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Shares:</span>
                <span className="font-medium">{position.shares}</span>
              </div>
              <div className="flex justify-between">
                <span>Avg Price:</span>
                <span className="font-medium">${position.avgPrice?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Current Price:</span>
                <span className="font-medium">${position.currentPrice?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>P&L:</span>
                <span className={`font-medium ${
                  (position.gainLoss || 0) >= 0 ? 'text-success' : 'text-destructive'
                }`}>
                  ${position.gainLoss?.toFixed(2)} ({position.gainLossPercent?.toFixed(2)}%)
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Order Ticket */}
        <Card className="p-4">
          <h4 className="font-medium mb-4">Quick Order</h4>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={orderSide === 'buy' ? 'default' : 'outline'}
                onClick={() => setOrderSide('buy')}
                className="text-success border-success"
              >
                Buy
              </Button>
              <Button
                variant={orderSide === 'sell' ? 'default' : 'outline'}
                onClick={() => setOrderSide('sell')}
                className="text-destructive border-destructive"
              >
                Sell
              </Button>
            </div>

            <div>
              <label className="text-sm font-medium">Quantity</label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="100"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Order Type</label>
              <Select value={orderType} onValueChange={setOrderType}>
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

            {orderType === 'limit' && (
              <div>
                <label className="text-sm font-medium">Limit Price</label>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" disabled={!isAuthenticated || !securityAudit.isSecure}>
                Check Risk
              </Button>
              <Button size="sm" disabled={!quantity || !isAuthenticated || !securityAudit.isSecure}>
                Submit Order
              </Button>
            </div>
          </div>
        </Card>

        {/* Security Status */}
        {securityAudit.criticalCount > 0 && (
          <Card className="p-4 border-destructive/50 bg-destructive/5">
            <h4 className="font-medium mb-2 text-destructive">Security Alert</h4>
            <div className="text-sm text-destructive">
              {securityAudit.checks.filter(c => c.level === 'critical')[0]?.message}
            </div>
          </Card>
        )}

        {/* Risk Readout */}
        <Card className="p-4">
          <h4 className="font-medium mb-3">Risk Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Daily P&L:</span>
              <Badge variant="outline" className="text-success">+$234.56</Badge>
            </div>
            <div className="flex justify-between">
              <span>Exposure:</span>
              <Badge variant="outline">15.2%</Badge>
            </div>
            <div className="flex justify-between">
              <span>User:</span>
              <span className="font-medium">{user?.name || 'Not logged in'}</span>
            </div>
            <div className="flex justify-between">
              <span>Security Status:</span>
              <Badge variant={securityAudit.isSecure ? "default" : "destructive"}>
                {securityAudit.isSecure ? 'Secure' : 'Issues'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Buying Power:</span>
              <span className="font-medium">${portfolio?.availableCash?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};