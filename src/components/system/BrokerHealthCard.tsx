/**
 * Broker Health Card - Shows real-time status of broker connections
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Activity, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface BrokerHealth {
  workspace_id: string;
  broker: string;
  last_ok: string | null;
  last_check: string;
  status: string;
  error_message: string | null;
}

interface BrokerHealthCardProps {
  workspaceId: string;
}

export function BrokerHealthCard({ workspaceId }: BrokerHealthCardProps) {
  const [health, setHealth] = useState<BrokerHealth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const { data, error } = await supabase
          .from('broker_health')
          .select('*')
          .eq('workspace_id', workspaceId);

        if (error) throw error;
        setHealth(data || []);
      } catch (err) {
        console.error('Failed to fetch broker health:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();

    // Refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [workspaceId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'down':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'ok':
        return 'default';
      case 'degraded':
        return 'secondary';
      case 'down':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return 'Never';
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Broker Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (health.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Broker Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            No broker connections configured yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Broker Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {health.map((h) => (
            <div key={h.broker} className="flex items-center justify-between border-b pb-3 last:border-0">
              <div className="flex items-center gap-3">
                {getStatusIcon(h.status)}
                <div>
                  <div className="font-medium capitalize">{h.broker}</div>
                  <div className="text-xs text-muted-foreground">
                    Last check: {formatTimestamp(h.last_check)}
                    {h.last_ok && ` • OK: ${formatTimestamp(h.last_ok)}`}
                  </div>
                  {h.error_message && (
                    <div className="text-xs text-destructive mt-1">
                      {h.error_message}
                    </div>
                  )}
                </div>
              </div>
              <Badge variant={getStatusVariant(h.status)} className="capitalize">
                {h.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
