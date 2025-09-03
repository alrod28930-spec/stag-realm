import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Filter } from 'lucide-react';

interface OrderRecord {
  id: string;
  ts: string;
  event_type: string;
  payload_json: any;
  summary: string;
}

export function OrderHistoryTable() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadOrderHistory();
  }, [filter]);

  const loadOrderHistory = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('rec_events')
        .select('*')
        .in('event_type', [
          'trade.manual.intent',
          'trade.manual.executed', 
          'trade.manual.rejected',
          'trade.bot.intent',
          'trade.bot.executed',
          'trade.bot.rejected',
          'trade.closed'
        ])
        .order('ts', { ascending: false })
        .limit(50);

      if (filter !== 'all') {
        query = query.eq('event_type', filter);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Failed to load order history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (eventType: string) => {
    switch (eventType) {
      case 'trade.manual.executed':
      case 'trade.bot.executed':
        return <Badge variant="default">Executed</Badge>;
      case 'trade.manual.rejected':
      case 'trade.bot.rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'trade.manual.intent':
      case 'trade.bot.intent':
        return <Badge variant="secondary">Pending</Badge>;
      case 'trade.closed':
        return <Badge variant="outline">Closed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getSideFromPayload = (payload: any) => {
    return payload?.side || payload?.direction || 'N/A';
  };

  const getSymbolFromPayload = (payload: any) => {
    return payload?.symbol || 'N/A';
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Order History</CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="trade.manual.executed">Manual Executed</SelectItem>
                <SelectItem value="trade.bot.executed">Bot Executed</SelectItem>
                <SelectItem value="trade.manual.rejected">Rejected</SelectItem>
                <SelectItem value="trade.closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No order history found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Your trading activity will appear here
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-sm text-muted-foreground">Time</th>
                  <th className="pb-2 font-medium text-sm text-muted-foreground">Symbol</th>
                  <th className="pb-2 font-medium text-sm text-muted-foreground">Side</th>
                  <th className="pb-2 font-medium text-sm text-muted-foreground">Status</th>
                  <th className="pb-2 font-medium text-sm text-muted-foreground">Summary</th>
                  <th className="pb-2 font-medium text-sm text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b last:border-0">
                    <td className="py-3">
                      <div className="text-sm">
                        {formatDistanceToNow(new Date(order.ts), { addSuffix: true })}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="font-semibold">
                        {getSymbolFromPayload(order.payload_json)}
                      </div>
                    </td>
                    <td className="py-3">
                      <Badge variant="outline" className="capitalize">
                        {getSideFromPayload(order.payload_json)}
                      </Badge>
                    </td>
                    <td className="py-3">
                      {getStatusBadge(order.event_type)}
                    </td>
                    <td className="py-3">
                      <div className="text-sm text-muted-foreground max-w-xs truncate">
                        {order.summary || 'No summary available'}
                      </div>
                    </td>
                    <td className="py-3">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}