import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  getBotProfile, 
  saveBotProfile, 
  acknowledgeRiskToggle, 
  logSettingsChange, 
  calculateRiskIndicator,
  applyTargetModePresets,
  TARGET_MODE_PRESETS
} from "@/services/botProfile";
import { BotProfile, RiskGoalsSettings, DailyTargetMode } from "@/types/botProfile";
import { RiskDisclaimerModal } from "./RiskDisclaimerModal";
import { AggressiveModeDisclaimer } from "./AggressiveModeDisclaimer";

interface RiskGoalsCardProps {
  workspaceId: string;
  userId: string;
  onModeChange?: (mode: DailyTargetMode) => void;
}

export function RiskGoalsCard({ workspaceId, userId, onModeChange }: RiskGoalsCardProps) {
  const [profile, setProfile] = useState<BotProfile | null>(null);
  const [settings, setSettings] = useState<RiskGoalsSettings>({
    capitalRisk: 0.05,
    dailyTarget: 0.01,
    executionMode: 'manual',
    dailyTargetMode: '1p'
  });
  const [originalSettings, setOriginalSettings] = useState<RiskGoalsSettings>({
    capitalRisk: 0.05,
    dailyTarget: 0.01,
    executionMode: 'manual',
    dailyTargetMode: '1p'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showAggressiveDisclaimer, setShowAggressiveDisclaimer] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<RiskGoalsSettings | null>(null);
  const { toast } = useToast();

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, [workspaceId]);

  const loadProfile = async () => {
    setLoading(true);
    const data = await getBotProfile(workspaceId);
    if (data) {
      setProfile(data);
      const profileSettings: RiskGoalsSettings = {
        capitalRisk: data.capital_risk_pct,
        dailyTarget: data.daily_return_target_pct,
        executionMode: data.execution_mode,
        dailyTargetMode: data.daily_target_mode
      };
      setSettings(profileSettings);
      setOriginalSettings(profileSettings);
    }
    setLoading(false);
  };

  // Calculate current risk indicator
  const riskIndicator = calculateRiskIndicator(
    settings.dailyTargetMode,
    settings.capitalRisk,
    profile?.risk_per_trade_pct,
    profile?.max_trades_per_day,
    profile?.rr_min
  );

  // Check if settings have changed
  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  // Get risk badge styling
  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30';
      case 'medium': return 'bg-amber-500/20 text-amber-700 border-amber-500/30';
      case 'high': return 'bg-red-500/20 text-red-700 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Handle save with disclaimer check
  const handleSave = () => {
    // Check if switching to aggressive mode
    const isAggressiveMode = settings.dailyTargetMode === '5p' || settings.dailyTargetMode === '10p';
    const wasAggressiveMode = originalSettings.dailyTargetMode === '5p' || originalSettings.dailyTargetMode === '10p';
    
    if (isAggressiveMode && !wasAggressiveMode) {
      setPendingChanges(settings);
      setShowAggressiveDisclaimer(true);
      return;
    }

    // Show standard disclaimer if changing execution mode or significant risk changes
    const needsDisclaimer = settings.executionMode !== originalSettings.executionMode ||
                           settings.dailyTargetMode !== originalSettings.dailyTargetMode ||
                           Math.abs(settings.capitalRisk - originalSettings.capitalRisk) >= 0.05;
    
    if (needsDisclaimer) {
      setPendingChanges(settings);
      setShowDisclaimer(true);
    } else {
      saveChanges(settings);
    }
  };

  // Save changes to database
  const saveChanges = async (newSettings: RiskGoalsSettings) => {
    setSaving(true);
    try {
      // Apply target mode presets and prepare update
      const baseUpdate = {
        capital_risk_pct: newSettings.capitalRisk,
        daily_return_target_pct: newSettings.dailyTarget,
        execution_mode: newSettings.executionMode
      };
      
      const updateWithPresets = applyTargetModePresets(newSettings.dailyTargetMode, baseUpdate);
      
      const saved = await saveBotProfile(workspaceId, updateWithPresets);
        if (saved) {
          setProfile(saved);
          setOriginalSettings(newSettings);
          
          // Notify parent of mode change
          onModeChange?.(newSettings.dailyTargetMode);

          // Log the change with appropriate severity
          const isAggressiveMode = newSettings.dailyTargetMode === '5p' || newSettings.dailyTargetMode === '10p';
          await logSettingsChange(
            workspaceId,
            'daily_target_mode.changed',
            { 
              from: originalSettings.dailyTargetMode, 
              to: newSettings.dailyTargetMode,
              presets: TARGET_MODE_PRESETS[newSettings.dailyTargetMode],
              is_aggressive: isAggressiveMode
            },
            isAggressiveMode ? 3 : (newSettings.executionMode === 'automated' ? 2 : 1)
          );

        toast({
          title: "Settings Updated",
          description: "Risk & goals configuration saved successfully.",
        });
      } else {
        throw new Error('Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle disclaimer acceptance
  const handleDisclaimerAccept = async () => {
    if (!pendingChanges) return;
    
    // Log compliance acknowledgment
    await acknowledgeRiskToggle(workspaceId, userId);
    
    // Save the changes
    await saveChanges(pendingChanges);
    
    setShowDisclaimer(false);
    setPendingChanges(null);
  };

  // Handle aggressive mode disclaimer acceptance
  const handleAggressiveDisclaimerAccept = async () => {
    if (!pendingChanges) return;
    
    // Log aggressive mode acknowledgment
    await acknowledgeRiskToggle(workspaceId, userId);
    
    // Additional logging for aggressive mode
    await logSettingsChange(
      workspaceId,
      'compliance.aggressive_mode.acknowledged',
      { 
        mode: pendingChanges.dailyTargetMode,
        timestamp: new Date().toISOString(),
        user_id: userId
      },
      3
    );
    
    // Save the changes
    await saveChanges(pendingChanges);
    
    setShowAggressiveDisclaimer(false);
    setPendingChanges(null);
  };

  // Handle disclaimer cancel
  const handleDisclaimerCancel = () => {
    setShowDisclaimer(false);
    setPendingChanges(null);
  };

  // Handle aggressive mode disclaimer cancel
  const handleAggressiveDisclaimerCancel = () => {
    setShowAggressiveDisclaimer(false);
    setPendingChanges(null);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Risk & Goals
            <Badge variant="outline" className={getRiskBadgeColor(riskIndicator)}>
              {riskIndicator.charAt(0).toUpperCase() + riskIndicator.slice(1)} Risk
            </Badge>
          </CardTitle>
          <CardDescription>
            Configure trade bot risk parameters and daily targets. These are goals, not guarantees.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Daily Target Mode */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Daily Target Mode</Label>
            <RadioGroup
              value={settings.dailyTargetMode}
              onValueChange={(value: DailyTargetMode) => 
                setSettings({ ...settings, dailyTargetMode: value })
              }
              className="grid grid-cols-2 gap-4"
            >
              {Object.entries(TARGET_MODE_PRESETS).map(([mode, preset]) => (
                <div key={mode} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value={mode} id={mode} />
                  <div className="flex-1">
                    <Label htmlFor={mode} className="cursor-pointer">
                      <div className="font-medium">{mode.replace('p', '%')} - {preset.name}</div>
                      <div className="text-xs text-muted-foreground">{preset.description}</div>
                    </Label>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Capital at Risk */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Capital at Risk</Label>
            <RadioGroup
              value={settings.capitalRisk.toString()}
              onValueChange={(value) => 
                setSettings({ ...settings, capitalRisk: parseFloat(value) })
              }
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="0.05" id="risk-5" />
                <Label htmlFor="risk-5" className="cursor-pointer">5%</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="0.10" id="risk-10" />
                <Label htmlFor="risk-10" className="cursor-pointer">10%</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="0.20" id="risk-20" />
                <Label htmlFor="risk-20" className="cursor-pointer">20%</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Execution Mode */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Execution Mode</Label>
            <Tabs
              value={settings.executionMode}
              onValueChange={(value: 'manual' | 'automated') =>
                setSettings({ ...settings, executionMode: value })
              }
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">Manual</TabsTrigger>
                <TabsTrigger value="automated">Automated</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Info Text */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Targets are goals, not guarantees. Outcomes depend on market conditions.</p>
            <p>• Automated mode mirrors orders via your brokerage API; StagAlgo never holds funds.</p>
            {profile && (
              <p>• Current mode allows up to {profile.max_trades_per_day} trades/day with {(profile.risk_per_trade_pct * 100).toFixed(1)}% risk per trade.</p>
            )}
          </div>

          {/* Save Button */}
          <Button 
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="w-full"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* Disclaimer Modals */}
      <RiskDisclaimerModal
        open={showDisclaimer}
        settings={pendingChanges || settings}
        riskIndicator={riskIndicator}
        onAccept={handleDisclaimerAccept}
        onCancel={handleDisclaimerCancel}
      />
      
      <AggressiveModeDisclaimer
        open={showAggressiveDisclaimer}
        mode={pendingChanges?.dailyTargetMode || settings.dailyTargetMode}
        onAccept={handleAggressiveDisclaimerAccept}
        onCancel={handleAggressiveDisclaimerCancel}
      />
    </>
  );
}