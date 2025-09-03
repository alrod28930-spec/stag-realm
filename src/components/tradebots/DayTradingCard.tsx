import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, Clock, TrendingUp, Shield, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { IntradaySettings, INTRADAY_PRESETS, IntradayStopStyle } from '@/types/intraday';
import { DailyTargetMode } from '@/types/botProfile';
import { DayTradingRiskDisclaimer } from './DayTradingRiskDisclaimer';
import { getBotProfile, saveBotProfile } from '@/services/botProfile';
import { acknowledgeRiskToggle, logSettingsChange } from '@/services/botProfile';

interface DayTradingCardProps {
  workspaceId: string;
  userId: string;
  dailyTargetMode?: DailyTargetMode;
  onSettingsChange?: (settings: IntradaySettings) => void;
}

export function DayTradingCard({ workspaceId, userId, dailyTargetMode = '1p', onSettingsChange }: DayTradingCardProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<IntradaySettings>({
    intraday_enabled: false,
    intraday_max_trades: 6,
    intraday_time_window: '09:35-15:45',
    intraday_stop_style: 'tight' as IntradayStopStyle,
    intraday_rr_min: 1.5,
    intraday_min_volume_usd: 1000000,
    intraday_blackout_json: { pre_open: 5, pre_close: 10 },
    pdt_guard: true,
    intraday_daily_loss_halt_pct: 1.0
  });
  const [originalSettings, setOriginalSettings] = useState<IntradaySettings>(settings);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [pendingSettings, setPendingSettings] = useState<IntradaySettings | null>(null);

  useEffect(() => {
    loadSettings();
  }, [workspaceId]);

  useEffect(() => {
    // Apply preset when daily target mode changes
    if (dailyTargetMode && INTRADAY_PRESETS[dailyTargetMode]) {
      const preset = INTRADAY_PRESETS[dailyTargetMode];
      setSettings(prev => ({ ...prev, ...preset }));
    }
  }, [dailyTargetMode]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const profile = await getBotProfile(workspaceId);
      
      if (profile) {
        const intradaySettings: IntradaySettings = {
          intraday_enabled: profile.intraday_enabled || false,
          intraday_max_trades: profile.intraday_max_trades || 6,
          intraday_time_window: profile.intraday_time_window || '09:35-15:45',
          intraday_stop_style: (profile.intraday_stop_style as IntradayStopStyle) || 'tight',
          intraday_rr_min: profile.intraday_rr_min || 1.5,
          intraday_min_volume_usd: profile.intraday_min_volume_usd || 1000000,
          intraday_blackout_json: profile.intraday_blackout_json || { pre_open: 5, pre_close: 10 },
          pdt_guard: profile.pdt_guard !== false,
          intraday_daily_loss_halt_pct: profile.intraday_daily_loss_halt_pct || 1.0
        };
        
        setSettings(intradaySettings);
        setOriginalSettings(intradaySettings);
      }
    } catch (error) {
      console.error('Failed to load intraday settings:', error);
      toast({
        title: "Error",
        description: "Failed to load day trading settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  const handleToggleIntraday = (enabled: boolean) => {
    if (enabled) {
      const newSettings = { ...settings, intraday_enabled: true };
      setPendingSettings(newSettings);
      setShowDisclaimer(true);
    } else {
      setSettings(prev => ({ ...prev, intraday_enabled: false }));
    }
  };

  const handleSettingChange = (key: keyof IntradaySettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    // Show disclaimer for critical changes
    if ((key === 'intraday_max_trades' && value > 10) || 
        (key === 'intraday_stop_style' && value === 'very_tight') ||
        (key === 'intraday_rr_min' && value < 1.5)) {
      setPendingSettings(newSettings);
      setShowDisclaimer(true);
    }
  };

  const handleDisclaimerAccept = async () => {
    try {
      setSaving(true);
      
      // Log compliance acknowledgment
      await acknowledgeRiskToggle(workspaceId, userId);
      
      if (pendingSettings) {
        setSettings(pendingSettings);
        await saveSettings(pendingSettings);
      } else {
        await saveSettings(settings);
      }
      
      setPendingSettings(null);
      setShowDisclaimer(false);
      
      toast({
        title: "Day Trading Mode Updated",
        description: "Settings saved and compliance logged"
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: "Error",
        description: "Failed to save day trading settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDisclaimerCancel = () => {
    if (pendingSettings?.intraday_enabled && !originalSettings.intraday_enabled) {
      // Revert toggle if canceling initial enable
      setSettings(prev => ({ ...prev, intraday_enabled: false }));
    }
    setPendingSettings(null);
    setShowDisclaimer(false);
  };

  const saveSettings = async (settingsToSave: IntradaySettings = settings) => {
    try {
      setSaving(true);
      
      await saveBotProfile(workspaceId, settingsToSave);
      
      // Log the settings change
      await logSettingsChange(workspaceId, 'settings.intraday.updated', {
        intraday_enabled: settingsToSave.intraday_enabled,
        max_trades: settingsToSave.intraday_max_trades,
        time_window: settingsToSave.intraday_time_window,
        stop_style: settingsToSave.intraday_stop_style,
        min_rr: settingsToSave.intraday_rr_min,
        min_volume_usd: settingsToSave.intraday_min_volume_usd,
        pdt_guard: settingsToSave.pdt_guard
      }, 2);
      
      setOriginalSettings(settingsToSave);
      onSettingsChange?.(settingsToSave);
      
      toast({
        title: "Success",
        description: "Day trading settings saved"
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const formatTimeWindow = (window: string) => {
    const [start, end] = window.split('-');
    return `${start} - ${end} ET`;
  };

  const formatVolume = (volume: number) => {
    return `$${(volume / 1000000).toFixed(1)}M`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded w-48 mb-2"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="flex items-center gap-2">
                  Day Trading Mode
                  {settings.intraday_enabled && (
                    <Badge variant="destructive" className="text-xs">
                      High Risk
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Intraday operation with enhanced risk controls and compliance
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.intraday_enabled}
              onCheckedChange={handleToggleIntraday}
              disabled={saving}
            />
          </div>
        </CardHeader>

        {settings.intraday_enabled && (
          <CardContent className="space-y-6">
            {/* Max Trades */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="max-trades">Max Trades per Day</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Maximum number of intraday trades allowed per session</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="max-trades"
                type="number"
                min="1"
                max="15"
                value={settings.intraday_max_trades}
                onChange={(e) => handleSettingChange('intraday_max_trades', parseInt(e.target.value) || 1)}
                className="w-32"
              />
            </div>

            {/* Time Window */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label>Trading Window</Label>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={settings.intraday_time_window}
                  onChange={(e) => handleSettingChange('intraday_time_window', e.target.value)}
                  placeholder="09:35-15:45"
                  className="w-40"
                />
                <span className="text-sm text-muted-foreground">
                  {formatTimeWindow(settings.intraday_time_window)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Excludes first {settings.intraday_blackout_json.pre_open} min and last {settings.intraday_blackout_json.pre_close} min
              </p>
            </div>

            {/* Stop Style */}
            <div className="space-y-2">
              <Label>Stop Loss Style</Label>
              <Select
                value={settings.intraday_stop_style}
                onValueChange={(value: IntradayStopStyle) => handleSettingChange('intraday_stop_style', value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="tight">Tight (Default)</SelectItem>
                  <SelectItem value="very_tight">Very Tight</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Min R:R Ratio */}
            <div className="space-y-2">
              <Label htmlFor="min-rr">Minimum Risk/Reward Ratio</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm">1:</span>
                <Input
                  id="min-rr"
                  type="number"
                  min="1.0"
                  max="5.0"
                  step="0.1"
                  value={settings.intraday_rr_min}
                  onChange={(e) => handleSettingChange('intraday_rr_min', parseFloat(e.target.value) || 1.5)}
                  className="w-24"
                />
              </div>
            </div>

            {/* Min Volume */}
            <div className="space-y-2">
              <Label htmlFor="min-volume">Minimum Liquidity (USD Volume)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="min-volume"
                  type="number"
                  min="100000"
                  step="100000"
                  value={settings.intraday_min_volume_usd}
                  onChange={(e) => handleSettingChange('intraday_min_volume_usd', parseInt(e.target.value) || 1000000)}
                  className="w-40"
                />
                <span className="text-sm text-muted-foreground">
                  {formatVolume(settings.intraday_min_volume_usd)}
                </span>
              </div>
            </div>

            {/* PDT Guard */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="pdt-guard"
                  checked={settings.pdt_guard}
                  onCheckedChange={(checked) => handleSettingChange('pdt_guard', checked)}
                />
                <Label htmlFor="pdt-guard" className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Pattern Day Trader (PDT) Guard
                </Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Monitor and warn about PDT rule compliance (informational only)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                Tracks round-trip trades and provides warnings. You are responsible for compliance.
              </p>
            </div>

            {/* Save Button */}
            {hasChanges && (
              <div className="pt-4 border-t">
                <Button
                  onClick={() => saveSettings()}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? "Saving..." : "Save Day Trading Settings"}
                </Button>
              </div>
            )}

            {/* Risk Warning */}
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive">
                    Day Trading Risk Notice
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Intraday trading involves extremely high risk. These are targets and aims, not guarantees. 
                    Orders are executed via your brokerage; StagAlgo never holds funds. You are solely 
                    responsible for all trading decisions and outcomes.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <DayTradingRiskDisclaimer
        open={showDisclaimer}
        settings={pendingSettings || settings}
        onAccept={handleDisclaimerAccept}
        onCancel={handleDisclaimerCancel}
      />
    </TooltipProvider>
  );
}