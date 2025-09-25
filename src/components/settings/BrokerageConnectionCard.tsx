import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Link, Plus, Trash2, AlertTriangle } from 'lucide-react';
import type { BrokerageConnection } from '@/types/userSettings';

interface BrokerageConnectionCardProps {
  workspaceId: string;
  connections: BrokerageConnection[];
  onUpdate: () => void;
}

export function BrokerageConnectionCard({ workspaceId, connections, onUpdate }: BrokerageConnectionCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newConnection, setNewConnection] = useState({
    provider: '',
    accountLabel: '',
    apiKey: '',
    apiSecret: '',
    accountType: 'paper'
  });
  const { toast } = useToast();

  const handleAddConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newConnection.provider || !newConnection.apiKey || !newConnection.apiSecret || !newConnection.accountType) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('encrypt-brokerage-credentials', {
        body: {
          workspace_id: workspaceId,
          provider: newConnection.provider,
          account_label: newConnection.accountLabel || undefined,
          api_key: newConnection.apiKey,
          api_secret: newConnection.apiSecret,
          scope: { 
            paper: newConnection.accountType === 'paper',
            live: newConnection.accountType === 'live'
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Connection Added",
        description: `${newConnection.provider} connection has been securely stored.`,
      });

      setNewConnection({
        provider: '',
        accountLabel: '',
        apiKey: '',
        apiSecret: '',
        accountType: 'paper'
      });
      setIsAdding(false);
      onUpdate();

    } catch (error) {
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to add connection.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    if (!confirm('Are you sure you want to delete this connection?')) return;

    try {
      const { error } = await supabase
        .from('connections_brokerages')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      toast({
        title: "Connection Deleted",
        description: "The brokerage connection has been removed.",
      });

      onUpdate();

    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete the connection.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Link className="w-5 h-5 text-primary" />
            Brokerage Connections
          </CardTitle>
          <CardDescription>
            Securely connect your brokerage accounts for both live and paper trading
          </CardDescription>
        </div>
        <Button
          onClick={() => setIsAdding(true)}
          className="bg-gradient-primary hover:opacity-90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Connection
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Add New Connection Form */}
        {isAdding && (
          <Card className="bg-muted/20">
            <CardContent className="pt-6">
              <form onSubmit={handleAddConnection} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="provider">Broker Provider *</Label>
                    <Select
                      value={newConnection.provider}
                      onValueChange={(value) => setNewConnection({ ...newConnection, provider: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select broker" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alpaca">Alpaca Markets</SelectItem>
                        <SelectItem value="interactive_brokers">Interactive Brokers</SelectItem>
                        <SelectItem value="schwab">Charles Schwab</SelectItem>
                        <SelectItem value="td_ameritrade">TD Ameritrade</SelectItem>
                        <SelectItem value="e_trade">E*TRADE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="account-type">Account Type *</Label>
                    <Select
                      value={newConnection.accountType}
                      onValueChange={(value) => setNewConnection({ ...newConnection, accountType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paper">Paper Trading</SelectItem>
                        <SelectItem value="live">Live Trading</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="account-label">Account Label</Label>
                  <Input
                    id="account-label"
                    placeholder="e.g., Main Trading Account"
                    value={newConnection.accountLabel}
                    onChange={(e) => setNewConnection({ ...newConnection, accountLabel: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="api-key">API Key *</Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="Your API key"
                      value={newConnection.apiKey}
                      onChange={(e) => setNewConnection({ ...newConnection, apiKey: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="api-secret">API Secret *</Label>
                    <Input
                      id="api-secret"
                      type="password"
                      placeholder="Your API secret"
                      value={newConnection.apiSecret}
                      onChange={(e) => setNewConnection({ ...newConnection, apiSecret: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Your credentials will be encrypted and stored securely. StagAlgo never holds your funds.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAdding(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-gradient-primary hover:opacity-90"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Connection'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Existing Connections */}
        {connections.length === 0 && !isAdding && (
          <div className="text-center py-8 text-muted-foreground">
            <Link className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No brokerage connections yet.</p>
            <p className="text-sm">Add a connection to start trading with live or paper accounts.</p>
          </div>
        )}

        {connections.map((connection) => (
          <Card key={connection.id} className="bg-muted/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">
                      {connection.account_label || connection.provider}
                    </h3>
                    <Badge 
                      variant={connection.status === 'active' ? "default" : "secondary"}
                    >
                      {connection.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground capitalize">
                    {connection.provider.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Added {new Date(connection.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteConnection(connection.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
