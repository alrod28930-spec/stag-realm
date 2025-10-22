import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function LicensePanel() {
  const [key, setKey] = React.useState("");
  const [status, setStatus] = React.useState<{ key: string | null; features: Record<string, boolean> } | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function load() {
    try {
      const { data, error } = await supabase.functions.invoke('license-status');
      if (error || !data?.ok) {
        console.error("Status error:", error || data?.error);
        return;
      }
      setStatus({ key: data.key ?? null, features: data.features ?? {} });
    } catch (e) {
      console.error("Failed to load license status:", e);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function activate() {
    if (!key.trim()) {
      toast.error("Please enter a license key");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('license-activate', {
        body: { key: key.trim().toUpperCase() }
      });

      if (error || !data?.ok) {
        toast.error(error?.message || data?.error || "Activation failed");
        return;
      }

      toast.success(`License activated! Features: ${(data.flags || []).join(", ")}`);
      setKey("");
      load();
    } catch (e) {
      toast.error("Failed to activate license");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>License Key</CardTitle>
        <CardDescription>
          Activate a license key to unlock features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.key ? (
          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Active key:</span>{" "}
              <span className="font-mono font-semibold">{status.key}</span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-yellow-600 dark:text-yellow-500">
            No license activated
          </div>
        )}

        <div>
          <div className="text-sm font-medium mb-2">Features</div>
          <div className="flex flex-wrap gap-2">
            {status?.features && Object.entries(status.features).length > 0 ? (
              Object.entries(status.features).map(([k, v]) => (
                <Badge
                  key={k}
                  variant={v ? "default" : "secondary"}
                  className={v ? "" : "opacity-50"}
                >
                  {k.replace(/_/g, " ")}: {v ? "on" : "off"}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No features configured</span>
            )}
          </div>
        </div>

        <div className="flex gap-2 items-center pt-2">
          <Input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Enter license key (XXXXX-XXXXX-XXXXX-XXXXX)"
            className="flex-1 font-mono"
            disabled={loading}
          />
          <Button onClick={activate} disabled={loading || !key.trim()}>
            {loading ? "Activating..." : "Activate"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
