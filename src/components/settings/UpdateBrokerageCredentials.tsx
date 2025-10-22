import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const UpdateBrokerageCredentials = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");

  const handleUpdate = async () => {
    if (!apiKey || !secretKey) {
      toast.error("Please provide both API key and secret");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-brokerage-credentials', {
        body: {
          provider: 'alpaca',
          mode: 'paper',
          apiKey: apiKey.trim(),
          secretKey: secretKey.trim()
        }
      });

      if (error) throw error;

      if (!data?.ok) {
        throw new Error(data?.error || 'Failed to update credentials');
      }

      toast.success("Credentials updated successfully!");
      setApiKey("");
      setSecretKey("");
      
      // Trigger a sync to test the new credentials
      toast.info("Testing connection...");
      const { data: syncData, error: syncError } = await supabase.functions.invoke('brokerage-sync', {
        body: { workspace_id: data.workspace_id }
      });

      if (syncError || !syncData?.ok) {
        toast.warning("Credentials stored but sync test failed. Please check your keys.");
      } else {
        toast.success("Connection test successful!");
      }

    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(error.message || "Failed to update credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update Alpaca Credentials</CardTitle>
        <CardDescription>
          Update your Alpaca API credentials to connect to your brokerage account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="apiKey">API Key</Label>
          <Input
            id="apiKey"
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="PKEWI3O4VG3QENX2EXHUAZ53S7"
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="secretKey">Secret Key</Label>
          <Input
            id="secretKey"
            type="password"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder="Your secret key"
            disabled={isLoading}
          />
        </div>
        <Button 
          onClick={handleUpdate} 
          disabled={isLoading || !apiKey || !secretKey}
          className="w-full"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update & Test Connection
        </Button>
      </CardContent>
    </Card>
  );
};
