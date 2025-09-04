import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Globe, ExternalLink } from 'lucide-react';
import { useBrokerageDockStore } from '@/stores/brokerageDockStore';
import { useToast } from '@/hooks/use-toast';

export function BrokerageDockSettings() {
  const { config, updateConfig } = useBrokerageDockStore();
  const { toast } = useToast();
  const [newUrl, setNewUrl] = useState({ name: '', url: '', category: 'trading' as const });

  const handleAddUrl = () => {
    if (!newUrl.name || !newUrl.url) {
      toast({
        title: "Error",
        description: "Please fill in both name and URL",
        variant: "destructive"
      });
      return;
    }

    const updatedUrls = [
      ...config.quickAccessUrls,
      { ...newUrl }
    ];

    updateConfig({ quickAccessUrls: updatedUrls });
    setNewUrl({ name: '', url: '', category: 'trading' });

    toast({
      title: "URL Added",
      description: `${newUrl.name} has been added to quick access`,
    });
  };

  const handleRemoveUrl = (index: number) => {
    const updatedUrls = config.quickAccessUrls.filter((_, i) => i !== index);
    updateConfig({ quickAccessUrls: updatedUrls });

    toast({
      title: "URL Removed",
      description: "Quick access URL has been removed",
    });
  };

  const handleConfigChange = (key: keyof typeof config, value: any) => {
    updateConfig({ [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            General Settings
          </CardTitle>
          <CardDescription>
            Configure default behavior and preferences for the Brokerage Dock
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="defaultUrl">Default URL</Label>
            <Input
              id="defaultUrl"
              value={config.defaultUrl}
              onChange={(e) => handleConfigChange('defaultUrl', e.target.value)}
              placeholder="https://www.tradingview.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="chartProvider">Preferred Chart Provider</Label>
            <Select
              value={config.preferredChartProvider}
              onValueChange={(value) => handleConfigChange('preferredChartProvider', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tradingview">TradingView</SelectItem>
                <SelectItem value="yahoo">Yahoo Finance</SelectItem>
                <SelectItem value="marketwatch">MarketWatch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Auto-load Symbol Charts</Label>
              <p className="text-sm text-muted-foreground">
                Automatically navigate to charts when symbols are sent from Trading Desk
              </p>
            </div>
            <Switch
              checked={config.autoLoadSymbols}
              onCheckedChange={(checked) => handleConfigChange('autoLoadSymbols', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Access URLs */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Access URLs</CardTitle>
          <CardDescription>
            Manage your frequently used trading and research websites
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current URLs */}
          <div className="space-y-2">
            {config.quickAccessUrls.map((url, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium">{url.name}</p>
                    <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                      {url.url}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {url.category}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(url.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveUrl(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Add New URL */}
          <div className="space-y-4">
            <h4 className="font-medium">Add New Quick Access URL</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newUrlName">Name</Label>
                <Input
                  id="newUrlName"
                  value={newUrl.name}
                  onChange={(e) => setNewUrl(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Finviz"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newUrlUrl">URL</Label>
                <Input
                  id="newUrlUrl"
                  value={newUrl.url}
                  onChange={(e) => setNewUrl(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://finviz.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newUrlCategory">Category</Label>
                <Select
                  value={newUrl.category}
                  onValueChange={(value: any) => setNewUrl(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trading">Trading</SelectItem>
                    <SelectItem value="research">Research</SelectItem>
                    <SelectItem value="news">News</SelectItem>
                    <SelectItem value="analysis">Analysis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleAddUrl} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Quick Access URL
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}