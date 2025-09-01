import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  Key, 
  Bell, 
  Monitor, 
  AlertTriangle,
  Plus,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BrokerConfig {
  id: string;
  name: string;
  broker: string;
  apiKey: string;
  secretKey: string;
  isActive: boolean;
  createdAt: Date;
}

export default function Settings() {
  const { toast } = useToast();
  const [showApiKeys, setShowApiKeys] = useState<{ [key: string]: boolean }>({});
  
  // Mock broker configurations
  const [brokerConfigs, setBrokerConfigs] = useState<BrokerConfig[]>([
    {
      id: '1',
      name: 'Main Trading Account',
      broker: 'Interactive Brokers',
      apiKey: 'IB_API_12345***',
      secretKey: '***hidden***',
      isActive: true,
      createdAt: new Date('2024-01-15')
    },
    {
      id: '2',
      name: 'Backup Account',
      broker: 'Alpaca Markets',
      apiKey: 'ALPACA_67890***',
      secretKey: '***hidden***',
      isActive: false,
      createdAt: new Date('2024-02-01')
    }
  ]);

  // Settings state
  const [settings, setSettings] = useState({
    // Risk Controls
    maxPositionSize: 10000,
    maxDailyLoss: 5000,
    stopLossPercentage: 5,
    takeProfitPercentage: 15,
    maxOpenPositions: 10,
    
    // Trade Filters
    minPrice: 1.00,
    maxPrice: 1000,
    minVolume: 100000,
    allowedSymbols: 'AAPL,GOOGL,MSFT,TSLA,NVDA',
    
    // Licensing
    licensingTier: 'Professional',
    
    // Notifications
    emailNotifications: true,
    pushNotifications: true,
    desktopNotifications: false,
    tradingAlerts: true,
    
    // Display
    theme: 'dark',
    currency: 'USD',
    timeFormat: '24h',
    chartType: 'candlestick'
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = () => {
    // In a real app, save to Supabase
    toast({
      title: "Settings saved",
      description: "Your configuration has been updated successfully.",
    });
  };

  const toggleKeyVisibility = (configId: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [configId]: !prev[configId]
    }));
  };

  const handleDeleteBrokerConfig = (configId: string) => {
    setBrokerConfigs(prev => prev.filter(config => config.id !== configId));
    toast({
      title: "Broker configuration deleted",
      description: "The broker configuration has been removed.",
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure your trading platform and manage your account
        </p>
      </div>

      <Tabs defaultValue="brokers" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="brokers">Brokers</TabsTrigger>
          <TabsTrigger value="risk">Risk Controls</TabsTrigger>
          <TabsTrigger value="filters">Trade Filters</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="display">Display</TabsTrigger>
        </TabsList>

        {/* Broker API Keys */}
        <TabsContent value="brokers" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Broker API Configuration
                </CardTitle>
                <CardDescription>
                  Connect your broker accounts for live trading
                </CardDescription>
              </div>
              <Button className="bg-gradient-primary hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Add Broker
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {brokerConfigs.map((config) => (
                  <div 
                    key={config.id}
                    className="p-4 rounded-lg bg-muted/30 border border-border"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{config.name}</h3>
                          <Badge 
                            variant={config.isActive ? "default" : "secondary"}
                          >
                            {config.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{config.broker}</p>
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">API Key</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Input
                                value={showApiKeys[config.id] ? config.apiKey : config.apiKey.replace(/\*/g, '•')}
                                readOnly
                                className="text-sm"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleKeyVisibility(config.id)}
                              >
                                {showApiKeys[config.id] ? 
                                  <EyeOff className="w-4 h-4" /> : 
                                  <Eye className="w-4 h-4" />
                                }
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Secret Key</Label>
                            <Input
                              value="•••••••••••••••••••"
                              readOnly
                              className="text-sm mt-1"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={config.isActive}
                          onCheckedChange={(checked) => {
                            setBrokerConfigs(prev => prev.map(c => 
                              c.id === config.id ? { ...c, isActive: checked } : c
                            ));
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBrokerConfig(config.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Licensing Tier */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Licensing Tier
              </CardTitle>
              <CardDescription>
                Your current subscription plan and features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-accent/10 border border-accent/20">
                <div>
                  <h3 className="font-semibold text-accent">Professional Plan</h3>
                  <p className="text-sm text-muted-foreground">
                    Up to 20 bots, real-time data, advanced analytics
                  </p>
                </div>
                <Badge className="bg-accent text-accent-foreground">Active</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                • Up to 20 active trading bots
                • Real-time market data feeds
                • Advanced technical analysis tools
                • Priority customer support
              </div>
              <Button variant="outline">Upgrade Plan</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Controls */}
        <TabsContent value="risk" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Risk Management
              </CardTitle>
              <CardDescription>
                Configure risk controls and position limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="maxPositionSize">Max Position Size ($)</Label>
                  <Input
                    id="maxPositionSize"
                    type="number"
                    value={settings.maxPositionSize}
                    onChange={(e) => handleSettingChange('maxPositionSize', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxDailyLoss">Max Daily Loss ($)</Label>
                  <Input
                    id="maxDailyLoss"
                    type="number"
                    value={settings.maxDailyLoss}
                    onChange={(e) => handleSettingChange('maxDailyLoss', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stopLoss">Stop Loss (%)</Label>
                  <Input
                    id="stopLoss"
                    type="number"
                    value={settings.stopLossPercentage}
                    onChange={(e) => handleSettingChange('stopLossPercentage', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="takeProfit">Take Profit (%)</Label>
                  <Input
                    id="takeProfit"
                    type="number"
                    value={settings.takeProfitPercentage}
                    onChange={(e) => handleSettingChange('takeProfitPercentage', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxPositions">Max Open Positions</Label>
                  <Input
                    id="maxPositions"
                    type="number"
                    value={settings.maxOpenPositions}
                    onChange={(e) => handleSettingChange('maxOpenPositions', Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trade Filters */}
        <TabsContent value="filters" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle>Trade Filters</CardTitle>
              <CardDescription>
                Set minimum requirements for trade execution
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="minPrice">Minimum Price ($)</Label>
                  <Input
                    id="minPrice"
                    type="number"
                    step="0.01"
                    value={settings.minPrice}
                    onChange={(e) => handleSettingChange('minPrice', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxPrice">Maximum Price ($)</Label>
                  <Input
                    id="maxPrice"
                    type="number"
                    value={settings.maxPrice}
                    onChange={(e) => handleSettingChange('maxPrice', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minVolume">Minimum Volume</Label>
                  <Input
                    id="minVolume"
                    type="number"
                    value={settings.minVolume}
                    onChange={(e) => handleSettingChange('minVolume', Number(e.target.value))}
                  />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="allowedSymbols">Allowed Symbols (comma-separated)</Label>
                <Input
                  id="allowedSymbols"
                  value={settings.allowedSymbols}
                  onChange={(e) => handleSettingChange('allowedSymbols', e.target.value)}
                  placeholder="AAPL,GOOGL,MSFT,TSLA"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to allow all symbols
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Manage how you receive alerts and updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive trade confirmations and alerts via email
                    </p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Mobile push notifications for important events
                    </p>
                  </div>
                  <Switch
                    checked={settings.pushNotifications}
                    onCheckedChange={(checked) => handleSettingChange('pushNotifications', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Desktop Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Browser notifications on your desktop
                    </p>
                  </div>
                  <Switch
                    checked={settings.desktopNotifications}
                    onCheckedChange={(checked) => handleSettingChange('desktopNotifications', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Trading Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Real-time alerts for position changes
                    </p>
                  </div>
                  <Switch
                    checked={settings.tradingAlerts}
                    onCheckedChange={(checked) => handleSettingChange('tradingAlerts', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Display Settings */}
        <TabsContent value="display" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Display Preferences
              </CardTitle>
              <CardDescription>
                Customize the appearance and behavior of the platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select 
                    value={settings.currency} 
                    onValueChange={(value) => handleSettingChange('currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="JPY">JPY (¥)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Time Format</Label>
                  <Select 
                    value={settings.timeFormat} 
                    onValueChange={(value) => handleSettingChange('timeFormat', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12 Hour</SelectItem>
                      <SelectItem value="24h">24 Hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Chart Type</Label>
                  <Select 
                    value={settings.chartType} 
                    onValueChange={(value) => handleSettingChange('chartType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="candlestick">Candlestick</SelectItem>
                      <SelectItem value="line">Line Chart</SelectItem>
                      <SelectItem value="bar">Bar Chart</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSaveSettings}
          className="bg-gradient-primary hover:opacity-90"
        >
          Save Settings
        </Button>
      </div>
    </div>
  );
}