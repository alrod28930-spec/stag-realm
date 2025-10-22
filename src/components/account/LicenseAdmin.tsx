import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Shield } from "lucide-react";

export default function LicenseAdmin() {
  const [lastKey, setLastKey] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);

  async function generate() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('license-generate', {
        body: { metadata: { plan: "lifetime" } }
      });

      if (error || !data?.ok) {
        toast.error(error?.message || data?.error || "Failed to generate key");
        return;
      }

      setLastKey(data.key);
      toast.success("License key generated!");
    } catch (e) {
      toast.error("Failed to generate license key");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function copyKey() {
    if (lastKey) {
      navigator.clipboard.writeText(lastKey);
      toast.success("Key copied to clipboard");
    }
  }

  return (
    <Card className="border-amber-200 dark:border-amber-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-600" />
          Admin: Generate License Keys
        </CardTitle>
        <CardDescription>
          Generate new license keys for distribution (admin only)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={generate} disabled={loading} variant="default">
          {loading ? "Generating..." : "Generate New Key"}
        </Button>

        {lastKey && (
          <div className="p-3 rounded bg-muted space-y-2">
            <div className="text-sm font-medium">Generated Key:</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-sm bg-background p-2 rounded border">
                {lastKey}
              </code>
              <Button size="icon" variant="outline" onClick={copyKey}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Copy this key and provide it to the user. It can only be used once.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
