import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface AuditEntry {
  id: string;
  workspace_id: string;
  event: string;
  payload: any;
  created_at: string;
}

export function AuditLogPanel() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditLog();
    const interval = setInterval(loadAuditLog, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadAuditLog = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("execution_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setEntries(data || []);
    } catch (err) {
      console.error("Audit log error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (event: string) => {
    if (event.includes("circuit_breaker") || event.includes("exceeded")) {
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    }
    if (event.includes("success") || event.includes("generated")) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (event.includes("error") || event.includes("failed")) {
      return <XCircle className="h-4 w-4 text-destructive" />;
    }
    return <Shield className="h-4 w-4 text-muted-foreground" />;
  };

  const getEventVariant = (event: string): "default" | "secondary" | "destructive" => {
    if (event.includes("circuit_breaker") || event.includes("exceeded")) {
      return "destructive";
    }
    if (event.includes("error") || event.includes("failed")) {
      return "destructive";
    }
    return "default";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Execution Audit Log
        </CardTitle>
        <CardDescription>Security and execution events (last 100)</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-2">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading audit log...</div>
            ) : entries.length === 0 ? (
              <div className="text-sm text-muted-foreground">No audit entries yet</div>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} className="p-3 bg-muted rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      {getEventIcon(entry.event)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={getEventVariant(entry.event)}>
                            {entry.event}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.created_at).toLocaleString()}
                          </span>
                        </div>
                        {entry.payload && Object.keys(entry.payload).length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground font-mono bg-background p-2 rounded overflow-x-auto">
                            {JSON.stringify(entry.payload, null, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
