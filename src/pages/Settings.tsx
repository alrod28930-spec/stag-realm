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
  EyeOff,
  FileText,
  Download,
  Clock,
  CheckCircle,
  DollarSign,
  TrendingUp,
  User
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { complianceService } from '@/services/compliance';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { RiskToggle } from '@/components/ui/risk-toggle';
import { toggleService } from '@/services/toggleService';
import { UserSettingsPanel } from '@/components/settings/UserSettingsPanel';
import { BrokerageConnectionCard } from '@/components/settings/BrokerageConnectionCard';
import { BrokerageDockSettings } from '@/components/settings/BrokerageDockSettings';
import { supabase } from '@/integrations/supabase/client';
import type { BrokerageConnection } from '@/types/userSettings';
import { useEffect } from 'react';

export default function Settings() {
  const { toast } = useToast();
  const [toggleState, setToggleState] = useState(toggleService.getToggleState());
  const [toggleError, setToggleError] = useState<string | null>(null);
  
  // Brokerage connections state
  const [brokerageConnections, setBrokerageConnections] = useState<BrokerageConnection[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>('00000000-0000-0000-0000-000000000001'); // Default test workspace
  
  // Load compliance data
  const [complianceSettings, setComplianceSettings] = useState(complianceService.getComplianceSettings());
  const [acknowledgmentHistory, setAcknowledgmentHistory] = useState(complianceService.getAcknowledgmentHistory(20));
  const [complianceEvents, setComplianceEvents] = useState(complianceService.getComplianceEvents(20));

  // Load brokerage connections
  const loadBrokerageConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('connections_brokerages')
        .select('*')
        .eq('workspace_id', currentWorkspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map the database response to our BrokerageConnection type
      const connections: BrokerageConnection[] = (data || []).map(conn => ({
        id: conn.id,
        workspace_id: conn.workspace_id,
        provider: conn.provider,
        account_label: conn.account_label,
        scope: conn.scope,
        status: conn.status as 'active' | 'revoked' | 'error',
        last_sync: conn.last_sync,
        created_at: conn.created_at,
        updated_at: conn.updated_at
      }));
      
      setBrokerageConnections(connections);
    } catch (error) {
      console.error('Error loading brokerage connections:', error);
      toast({
        title: "Error",
        description: "Failed to load brokerage connections",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadBrokerageConnections();
  }, [currentWorkspaceId]);

  // Subscribe to toggle service changes with error handling
  useEffect(() => {
    const unsubscribe = toggleService.subscribe((newState) => {
      setToggleState(newState);
      setToggleError(null); // Clear errors on successful updates
    });
    
    return unsubscribe;
  }, []);

  // Force refresh from service to ensure synchronization
  const refreshState = () => {
    const currentState = toggleService.getToggleState();
    setToggleState(currentState);
    setToggleError(null);
  };

  // Refresh state on mount to ensure sync
  useEffect(() => {
    refreshState();
  }, []);

  // Enhanced toggle handler with validation and error handling
  const handleToggleChange = async (toggleKey: keyof typeof toggleState, enabled: boolean) => {
    try {
      setToggleError(null);
      
      // Get fresh state for validation
      const currentState = toggleService.getToggleState();
      
      // Validate critical combinations
      if (toggleKey === 'hardPullEnabled' && !enabled && !currentState.softPullEnabled) {
        throw new Error('Cannot disable Hard Pull while Soft Pull is also disabled. Enable Soft Pull first.');
      }
      
      if (toggleKey === 'riskGovernorsEnabled' && !enabled) {
        const activeRiskControls = [
          currentState.hardPullEnabled,
          currentState.softPullEnabled,
          currentState.exposureLimitsEnabled,
          currentState.dailyDrawdownGuard
        ].filter(Boolean).length;
        
        if (activeRiskControls < 2) {
          throw new Error('Cannot disable Risk Governors with insufficient active risk controls. Enable more controls first.');
        }
      }
      
      toggleService.setRiskToggle(toggleKey, enabled, 'user_settings_change');
      
      // Force refresh to ensure UI synchronization
      setTimeout(() => refreshState(), 100);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Toggle update failed';
      setToggleError(errorMessage);
      
      toast({
        title: "Toggle Update Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };
  
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

  const handleUpdateComplianceSettings = (updates: any) => {
    const newSettings = { ...complianceSettings, ...updates };
    setComplianceSettings(newSettings);
    complianceService.updateComplianceSettings(updates);
    
    toast({
      title: "Compliance settings updated",
      description: "Your compliance preferences have been saved.",
    });
  };

  const handleExportComplianceData = () => {
    const data = complianceService.exportComplianceData();
    
    // Create and download JSON file
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Compliance data exported",
      description: "Your compliance data has been downloaded as JSON.",
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

      <Tabs defaultValue="user" className="w-full">
        <TabsList className="grid w-full grid-cols-10">
          <TabsTrigger value="user">User</TabsTrigger>
          <TabsTrigger value="brokers">Brokers</TabsTrigger>
          <TabsTrigger value="dock">Dock</TabsTrigger>
          <TabsTrigger value="risk">Risk Controls</TabsTrigger>
          <TabsTrigger value="capital">Capital Risk</TabsTrigger>
          <TabsTrigger value="gains">Gains</TabsTrigger>
          <TabsTrigger value="filters">Trade Filters</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="display">Display</TabsTrigger>
          <TabsTrigger value="legal">Legal</TabsTrigger>
        </TabsList>

        {/* User Settings */}
        <TabsContent value="user" className="space-y-6">
          <UserSettingsPanel />
        </TabsContent>

        {/* Broker API Keys */}
        <TabsContent value="brokers" className="space-y-6">
          <BrokerageConnectionCard
            workspaceId={currentWorkspaceId}
            connections={brokerageConnections}
            onUpdate={loadBrokerageConnections}
          />

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

        {/* Brokerage Dock Settings */}
        <TabsContent value="dock" className="space-y-6">
          <BrokerageDockSettings />
        </TabsContent>

        {/* Risk Controls */}
        <TabsContent value="risk" className="space-y-6">
          {/* Error Display */}
          {toggleError && (
            <Card className="bg-destructive/10 border-destructive/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <p className="text-sm text-destructive font-medium">{toggleError}</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setToggleError(null)}
                    className="ml-auto"
                  >
                    ×
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Global Risk Governors
              </CardTitle>
              <CardDescription>
                System-wide risk enforcement controls and safety measures
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RiskToggle
                id="risk-governors"
                label="Risk Governors"
                description="Master control for all risk checks - Monarch & Overseer enforcement"
                enabled={toggleState.riskGovernorsEnabled}
                onChange={(enabled) => handleToggleChange('riskGovernorsEnabled', enabled)}
                riskLevel="critical"
                requiresConfirmation={true}
              />

              <RiskToggle
                id="soft-pull"
                label="Soft Pull Enforcement"
                description="Allow risk adjustments (position size, stops) instead of outright blocks"
                enabled={toggleState.softPullEnabled}
                onChange={(enabled) => handleToggleChange('softPullEnabled', enabled)}
                riskLevel="medium"
              />

              <RiskToggle
                id="hard-pull"
                label="Hard Pull Enforcement"
                description="Force block trades or close positions when thresholds breached"
                enabled={toggleState.hardPullEnabled}
                onChange={(enabled) => handleToggleChange('hardPullEnabled', enabled)}
                riskLevel="high"
                requiresConfirmation={true}
              />

              <RiskToggle
                id="blacklist-enforcement"
                label="Blacklist Enforcement"
                description="Block trades in symbols flagged by risk governors"
                enabled={toggleState.blacklistEnforced}
                onChange={(enabled) => handleToggleChange('blacklistEnforced', enabled)}
                riskLevel="medium"
              />

              <RiskToggle
                id="exposure-limits"
                label="Exposure Limits"
                description="Enforce maximum exposure per ticker, sector, or region"
                enabled={toggleState.exposureLimitsEnabled}
                onChange={(enabled) => handleToggleChange('exposureLimitsEnabled', enabled)}
                riskLevel="high"
              />

              <RiskToggle
                id="drawdown-guard"
                label="Daily Drawdown Guard"
                description="Auto-halt trading if daily losses exceed threshold"
                enabled={toggleState.dailyDrawdownGuard}
                onChange={(enabled) => handleToggleChange('dailyDrawdownGuard', enabled)}
                riskLevel="high"
              />

              <RiskToggle
                id="minimum-thresholds"
                label="Minimum Trade Thresholds" 
                description="Enforce minimum stock price and trade size requirements"
                enabled={toggleState.minimumTradeThresholds}
                onChange={(enabled) => handleToggleChange('minimumTradeThresholds', enabled)}
                riskLevel="low"
              />
            </CardContent>
          </Card>

          {/* Risk Status Summary */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Risk Status Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const riskStatus = toggleService.getRiskStatus();
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Safety Mode</span>
                      <Badge className={riskStatus.safeModeEnabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                        {riskStatus.safeModeEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Overall Risk Level</span>
                      <Badge className={
                        riskStatus.riskLevel === 'low' ? 'bg-green-500/20 text-green-400' :
                        riskStatus.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }>
                        <span className="capitalize">{riskStatus.riskLevel}</span>
                      </Badge>
                    </div>

                    {riskStatus.disabledRiskControls.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-sm font-medium text-muted-foreground">Disabled Controls:</span>
                        <div className="flex flex-wrap gap-2">
                          {riskStatus.disabledRiskControls.map(control => (
                            <Badge key={control} variant="outline" className="text-xs">
                              {control}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Capital Risk Controls */}
        <TabsContent value="capital" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Capital at Risk Controls
              </CardTitle>
              <CardDescription>
                Define maximum loss limits per trade, sector, and portfolio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RiskToggle
                id="per-trade-risk"
                label="Per Trade Capital Risk"
                description="Limit risk exposure per individual trade (e.g., max 2% of equity per trade)"
                enabled={toggleState.perTradeRiskEnabled}
                onChange={(enabled) => handleToggleChange('perTradeRiskEnabled', enabled)}
                riskLevel="medium"
              />

              <RiskToggle
                id="sector-risk"
                label="Per Sector Risk Limits"
                description="Cap exposure to any sector/industry (e.g., max 15% in tech)"
                enabled={toggleState.sectorRiskEnabled}
                onChange={(enabled) => handleToggleChange('sectorRiskEnabled', enabled)}
                riskLevel="medium"
              />

              <RiskToggle
                id="portfolio-risk"
                label="Total Portfolio Risk"
                description="Daily maximum drawdown enforcement (halt trades at -3% daily loss)"
                enabled={toggleState.portfolioRiskEnabled}
                onChange={(enabled) => handleToggleChange('portfolioRiskEnabled', enabled)}
                riskLevel="high"
              />

              <RiskToggle
                id="leverage-risk"
                label="Leverage Risk Controls"
                description="Restrict leverage usage and margin requirements"
                enabled={toggleState.leverageRiskEnabled}
                onChange={(enabled) => handleToggleChange('leverageRiskEnabled', enabled)}
                riskLevel="high"
              />
            </CardContent>
          </Card>

          {/* Capital Risk Settings */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle>Capital Risk Parameters</CardTitle>
              <CardDescription>
                Configure specific risk limits and thresholds
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

        {/* Possible Gains Controls */}
        <TabsContent value="gains" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Possible Gains Controls
              </CardTitle>
              <CardDescription>
                Configure profit targets and reward scaling relative to risk
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RiskToggle
                id="take-profit-scaling"
                label="Take-Profit Scaling"
                description="Set profit targets as multiples of risk (e.g., 2:1 reward-to-risk ratio)"
                enabled={toggleState.takeProfitScaling}
                onChange={(enabled) => toggleService.setRiskToggle('takeProfitScaling', enabled)}
                riskLevel="low"
              />

              <RiskToggle
                id="profit-lock-in"
                label="Profit Lock-In (Trailing Stops)"
                description="Trail stop-losses upward to lock in profits as trades move favorably"
                enabled={toggleState.profitLockIn}
                onChange={(enabled) => toggleService.setRiskToggle('profitLockIn', enabled)}
                riskLevel="low"
              />

              <RiskToggle
                id="aggressive-gains"
                label="Aggressive Gains Mode"
                description="Wider profit targets (3-5x risk) for higher potential returns"
                enabled={toggleState.aggressiveGains}
                onChange={(enabled) => toggleService.setRiskToggle('aggressiveGains', enabled)}
                riskLevel="medium"
              />

              <RiskToggle
                id="partial-exits"
                label="Partial Position Exits"
                description="Scale out positions at defined profit levels (e.g., 50% off at +10%)"
                enabled={toggleState.partialExits}
                onChange={(enabled) => toggleService.setRiskToggle('partialExits', enabled)}
                riskLevel="low"
              />
            </CardContent>
          </Card>

          {/* Gains Settings */}
          <Card className="bg-gradient-card shadow-card">  
            <CardHeader>
              <CardTitle>Profit Target Parameters</CardTitle>  
              <CardDescription>
                Configure specific profit targets and scaling ratios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <Label htmlFor="rewardRiskRatio">Reward:Risk Ratio</Label>
                  <Select 
                    value={`${settings.takeProfitPercentage / settings.stopLossPercentage}`}
                    onValueChange={(value) => {
                      const ratio = parseFloat(value);
                      handleSettingChange('takeProfitPercentage', settings.stopLossPercentage * ratio);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1:1 (Conservative)</SelectItem>
                      <SelectItem value="1.5">1.5:1 (Balanced)</SelectItem>
                      <SelectItem value="2">2:1 (Standard)</SelectItem>
                      <SelectItem value="3">3:1 (Aggressive)</SelectItem>
                      <SelectItem value="4">4:1 (High Risk)</SelectItem>
                    </SelectContent>
                  </Select>
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

        {/* Legal & Compliance */}
        <TabsContent value="legal" className="space-y-6">
          {/* Full Disclaimers */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Legal Disclaimers
              </CardTitle>
              <CardDescription>
                Complete disclaimer and legal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/30">
                <h3 className="font-semibold mb-3">StagAlgo Platform Disclaimer</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    <strong>IMPORTANT LEGAL NOTICE:</strong> StagAlgo is an educational and portfolio-mirroring assistant. 
                    It does not provide financial advice, hold funds, or act as a broker. All trades occur through your 
                    connected brokerage, and you are solely responsible for any investment decisions.
                  </p>
                  
                  <p>
                    <strong>NOT FINANCIAL ADVICE:</strong> Nothing provided by StagAlgo constitutes financial, investment, 
                    trading, or other professional advice. All content is for informational and educational purposes only.
                  </p>
                  
                  <p>
                    <strong>YOUR RESPONSIBILITY:</strong> You are solely responsible for your trading and investment decisions. 
                    Always conduct your own research and consider consulting with qualified financial advisors before making 
                    any investment decisions.
                  </p>
                  
                  <p>
                    <strong>NO GUARANTEES:</strong> Past performance does not guarantee future results. Trading involves 
                    substantial risk of loss. You should carefully consider your financial situation and risk tolerance 
                    before using any trading tools or strategies.
                  </p>
                  
                  <p>
                    <strong>SOFTWARE TOOL:</strong> StagAlgo is a portfolio mirror and analysis tool. We do not custody 
                    funds, execute trades directly, or act as a broker-dealer. All trades are executed through your 
                    connected licensed broker.
                  </p>

                  <p>
                    <strong>REGULATORY COMPLIANCE:</strong> By using StagAlgo, you acknowledge that trading regulations 
                    vary by jurisdiction, and it is your responsibility to ensure compliance with applicable laws in 
                    your region.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compliance Settings */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Compliance Settings
              </CardTitle>
              <CardDescription>
                Manage how disclaimers and compliance features work
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Disclaimers</Label>
                    <p className="text-sm text-muted-foreground">
                      Show disclaimer prompts when accessing features
                    </p>
                  </div>
                  <Switch
                    checked={complianceSettings.disclaimersEnabled}
                    onCheckedChange={(checked) => handleUpdateComplianceSettings({ disclaimersEnabled: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Acknowledgments</Label>
                    <p className="text-sm text-muted-foreground">
                      Require user confirmation for important disclaimers
                    </p>
                  </div>
                  <Switch
                    checked={complianceSettings.requireAcknowledgments}
                    onCheckedChange={(checked) => handleUpdateComplianceSettings({ requireAcknowledgments: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Log All Interactions</Label>
                    <p className="text-sm text-muted-foreground">
                      Keep detailed logs for compliance auditing
                    </p>
                  </div>
                  <Switch
                    checked={complianceSettings.logAllInteractions}
                    onCheckedChange={(checked) => handleUpdateComplianceSettings({ logAllInteractions: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Broker Compliance Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Enhanced compliance for broker-dealer requirements
                    </p>
                  </div>
                  <Switch
                    checked={complianceSettings.brokerComplianceMode}
                    onCheckedChange={(checked) => handleUpdateComplianceSettings({ brokerComplianceMode: checked })}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Current Subscription Tier</Label>
                  <div className="mt-2 p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{complianceSettings.subscriptionTier.name}</span>
                        <Badge className="ml-2" variant="outline">
                          {complianceSettings.subscriptionTier.level.toUpperCase()}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Compliance Level: {complianceSettings.subscriptionTier.complianceLevel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Acknowledgment History */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Acknowledgment History
                </CardTitle>
                <CardDescription>
                  Recent disclaimer acknowledgments and compliance events
                </CardDescription>
              </div>
              <Button variant="outline" onClick={handleExportComplianceData}>
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {acknowledgmentHistory.length > 0 ? (
                    acknowledgmentHistory.map((ack) => (
                      <div key={ack.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-accent" />
                            <span className="text-sm font-medium">Disclaimer Acknowledged</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            ID: {ack.disclaimerId} • Session: {ack.sessionId.slice(0, 8)}...
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {ack.acknowledgedAt.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No disclaimer acknowledgments recorded yet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Compliance Events Log */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Recent Compliance Events
              </CardTitle>
              <CardDescription>
                System compliance events and activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {complianceEvents.length > 0 ? (
                    complianceEvents.map((event) => (
                      <div key={event.id} className="p-3 border rounded-lg bg-muted/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium capitalize">
                            {event.type.replace(/_/g, ' ')}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {event.timestamp.toLocaleString()}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Context: {event.context}
                        </p>
                        {event.details && Object.keys(event.details).length > 0 && (
                          <div className="mt-2 text-xs">
                            <details className="cursor-pointer">
                              <summary className="text-muted-foreground hover:text-foreground">
                                View details
                              </summary>
                              <pre className="mt-1 text-xs bg-muted/50 p-2 rounded overflow-x-auto">
                                {JSON.stringify(event.details, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No compliance events recorded yet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
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