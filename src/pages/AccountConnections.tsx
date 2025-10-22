import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BrokerageDock from "@/components/brokerage/BrokerageDock";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database, Users, Activity } from "lucide-react";

export default function AccountConnections() {
  const { data: candlesCount } = useQuery({
    queryKey: ['candles-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('candles')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    }
  });

  const { data: healthData } = useQuery({
    queryKey: ['broker-health'],
    queryFn: async () => {
      const { data } = await supabase
        .from('broker_health')
        .select('*')
        .eq('broker', 'alpaca')
        .maybeSingle();
      return data;
    },
    refetchInterval: 30000
  });

  const { data: workspaceMembers } = useQuery({
    queryKey: ['workspace-members'],
    queryFn: async () => {
      const { data } = await supabase
        .from('workspace_members')
        .select('role')
        .limit(10);
      return data || [];
    }
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Account & Connections</h1>
        <p className="text-muted-foreground">
          Manage your broker connections, data health, and workspace access
        </p>
      </div>

      {/* Brokerage Connection */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Broker Connection
        </h2>
        <BrokerageDock />
      </section>

      {/* Data Health */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Database className="w-5 h-5" />
          Data Health
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Market Data</CardTitle>
              <CardDescription>Historical candles in database</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{candlesCount?.toLocaleString() || 0}</div>
              <p className="text-sm text-muted-foreground mt-2">Total bars ingested</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Broker Status</CardTitle>
              <CardDescription>Connection health</CardDescription>
            </CardHeader>
            <CardContent>
              {healthData ? (
                <div className="space-y-2">
                  <Badge variant={healthData.status === 'ok' ? 'default' : 'destructive'}>
                    {healthData.status.toUpperCase()}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Last check: {new Date(healthData.last_check).toLocaleString()}
                  </p>
                  {healthData.error_message && (
                    <p className="text-xs text-destructive">{healthData.error_message}</p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Not connected</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Workspace Members */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Workspace Access
        </h2>
        <Card>
          <CardHeader>
            <CardTitle>Members & Roles</CardTitle>
            <CardDescription>Active workspace members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {workspaceMembers?.map((member, i) => (
                <Badge key={i} variant="secondary">
                  {member.role}
                </Badge>
              ))}
              {!workspaceMembers?.length && (
                <p className="text-muted-foreground">No members found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
