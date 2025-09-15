import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Pause,
  Play,
  RotateCcw,
  Activity
} from 'lucide-react';

export type OrderStatus = 'pending' | 'submitted' | 'partial' | 'filled' | 'cancelled' | 'rejected';

export interface OrderUpdate {
  id: string;
  orderId: string;
  timestamp: string;
  status: OrderStatus;
  message: string;
  filledQuantity?: number;
  remainingQuantity?: number;
  avgFillPrice?: number;
}

export interface TrackedOrder {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  status: OrderStatus;
  submittedAt: string;
  updates: OrderUpdate[];
  filledQuantity: number;
  avgFillPrice?: number;
}

interface OrderStatusTrackerProps {
  orders: TrackedOrder[];
  onCancelOrder: (orderId: string) => void;
  onRetryOrder: (orderId: string) => void;
}

export function OrderStatusTracker({ orders, onCancelOrder, onRetryOrder }: OrderStatusTrackerProps) {
  const [liveUpdates, setLiveUpdates] = useState(true);

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-warning" />;
      case 'submitted': return <Activity className="w-4 h-4 text-primary animate-pulse" />;
      case 'partial': return <AlertCircle className="w-4 h-4 text-warning" />;
      case 'filled': return <CheckCircle className="w-4 h-4 text-accent" />;
      case 'cancelled': return <Pause className="w-4 h-4 text-muted-foreground" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="border-warning text-warning">Pending</Badge>;
      case 'submitted': return <Badge className="bg-primary">Submitted</Badge>;
      case 'partial': return <Badge variant="outline" className="border-warning text-warning">Partial</Badge>;
      case 'filled': return <Badge className="bg-accent">Filled</Badge>;
      case 'cancelled': return <Badge variant="secondary">Cancelled</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'border-l-warning';
      case 'submitted': return 'border-l-primary';
      case 'partial': return 'border-l-warning';
      case 'filled': return 'border-l-accent';
      case 'cancelled': return 'border-l-muted-foreground';
      case 'rejected': return 'border-l-destructive';
    }
  };

  const activeOrders = orders.filter(o => ['pending', 'submitted', 'partial'].includes(o.status));
  const completedOrders = orders.filter(o => ['filled', 'cancelled', 'rejected'].includes(o.status));

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getFillPercentage = (order: TrackedOrder) => {
    return (order.filledQuantity / order.quantity) * 100;
  };

  // Simulate real-time updates for demo
  useEffect(() => {
    if (!liveUpdates) return;

    const interval = setInterval(() => {
      // This would be replaced with real WebSocket updates
      console.log('Checking for order updates...');
    }, 2000);

    return () => clearInterval(interval);
  }, [liveUpdates]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Order Status Tracker
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLiveUpdates(!liveUpdates)}
              className="flex items-center gap-2"
            >
              {liveUpdates ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {liveUpdates ? 'Pause' : 'Resume'} Live Updates
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{activeOrders.length}</div>
              <div className="text-sm text-muted-foreground">Active Orders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">{completedOrders.filter(o => o.status === 'filled').length}</div>
              <div className="text-sm text-muted-foreground">Filled Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-muted-foreground">{completedOrders.filter(o => o.status === 'cancelled').length}</div>
              <div className="text-sm text-muted-foreground">Cancelled</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Orders */}
      {activeOrders.length > 0 && (
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle>Active Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeOrders.map((order) => (
                <div key={order.id} className={`p-4 rounded-lg border-l-4 bg-muted/20 ${getStatusColor(order.status)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(order.status)}
                      <div>
                        <div className="font-semibold">{order.symbol}</div>
                        <div className="text-sm text-muted-foreground">
                          {order.side.toUpperCase()} {order.quantity} @ ${order.price.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(order.status)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onCancelOrder(order.id)}
                        disabled={order.status === 'filled'}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>

                  {/* Fill Progress */}
                  {order.status === 'partial' && (
                    <div className="mb-2">
                      <div className="flex justify-between text-sm text-muted-foreground mb-1">
                        <span>Fill Progress</span>
                        <span>{order.filledQuantity}/{order.quantity} ({getFillPercentage(order).toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-accent h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${getFillPercentage(order)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Latest Update */}
                  {order.updates.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Latest: {order.updates[order.updates.length - 1].message} • {formatTime(order.updates[order.updates.length - 1].timestamp)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {orders.slice(0, 20).map((order) => (
                <div key={order.id} className={`p-3 rounded-lg border-l-4 bg-muted/10 ${getStatusColor(order.status)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(order.status)}
                      <div>
                        <div className="font-medium">{order.symbol}</div>
                        <div className="text-sm text-muted-foreground">
                          {order.side.toUpperCase()} {order.quantity} @ ${order.price.toFixed(2)}
                          {order.avgFillPrice && ` • Avg Fill: $${order.avgFillPrice.toFixed(2)}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTime(order.submittedAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(order.status)}
                      {order.status === 'rejected' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRetryOrder(order.id)}
                          className="text-xs flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Retry
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Order Updates Timeline */}
                  {order.updates.length > 1 && (
                    <div className="mt-3 ml-7">
                      <div className="text-xs text-muted-foreground">
                        <div className="border-l-2 border-muted pl-3 space-y-2">
                          {order.updates.slice(-3).map((update, index) => (
                            <div key={update.id} className="flex justify-between">
                              <span>{update.message}</span>
                              <span>{formatTime(update.timestamp)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}