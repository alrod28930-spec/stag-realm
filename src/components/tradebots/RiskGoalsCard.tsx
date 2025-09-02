import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Info, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BotProfile, RiskGoalsSettings } from "@/types/botProfile";
import { 
  getBotProfile, 
  saveBotProfile, 
  calculateRiskIndicator,
  acknowledgeRiskToggle,
  logSettingsChange
} from "@/services/botProfile";
import { RiskDisclaimerModal } from "./RiskDisclaimerModal";

interface RiskGoalsCardProps {
  workspaceId: string;
  userId: string;
}

export function RiskGoalsCard({ workspaceId, userId }: RiskGoalsCardProps) {
  const { toast } = useToast();
  const [profile, setProfile] = useState<BotProfile | null>(null);
  const [settings, setSettings] = useState<RiskGoalsSettings>({
    capitalRisk: 0.05,
    dailyTarget: 0.01,
    executionMode: 'manual'
  });
  const [originalSettings, setOriginalSettings] = useState<RiskGoalsSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<RiskGoalsSettings | null>(null);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, [workspaceId]);

  const loadProfile = async () => {
    setLoading(true);
    const data = await getBotProfile(workspaceId);
    
    if (data) {
      setProfile(data);
      const newSettings = {
        capitalRisk: data.capital_risk_pct,
        dailyTarget: data.daily_return_target_pct,
        executionMode: data.execution_mode
      };
      setSettings(newSettings);
      setOriginalSettings(newSettings);
    } else {
      // Use defaults if no profile exists
      setOriginalSettings(settings);
    }
    setLoading(false);
  };

  const riskIndicator = calculateRiskIndicator(settings.capitalRisk, settings.dailyTarget);
  const hasChanges = originalSettings && (
    settings.capitalRisk !== originalSettings.capitalRisk ||
    settings.dailyTarget !== originalSettings.dailyTarget ||
    settings.executionMode !== originalSettings.executionMode
  );

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleSave = () => {
    // Check if any material change requires disclaimer
    const needsDisclaimer = hasChanges && (
      settings.capitalRisk !== originalSettings?.capitalRisk ||
      settings.dailyTarget !== originalSettings?.dailyTarget ||
      (settings.executionMode === 'automated' && originalSettings?.executionMode === 'manual')
    );

    if (needsDisclaimer) {
      setPendingChanges(settings);
      setShowDisclaimer(true);
    } else {
      saveChanges(settings);
    }
  };

  const saveChanges = async (newSettings: RiskGoalsSettings) => {
    setSaving(true);
    
    try {
      const newRiskIndicator = calculateRiskIndicator(newSettings.capitalRisk, newSettings.dailyTarget);
      
      const update = {
        capital_risk_pct: newSettings.capitalRisk,
        daily_return_target_pct: newSettings.dailyTarget,
        execution_mode: newSettings.executionMode,
        risk_indicator: newRiskIndicator
      };

      const savedProfile = await saveBotProfile(workspaceId, update);
      
      if (savedProfile) {
        setProfile(savedProfile);
        setOriginalSettings(newSettings);
        
        // Log the change
        await logSettingsChange(
          workspaceId,
          'risk_profile.changed',
          {
            from: originalSettings,
            to: newSettings,
            risk_indicator: newRiskIndicator
          },
          newSettings.executionMode === 'automated' ? 2 : 1
        );

        if (newSettings.executionMode !== originalSettings?.executionMode) {
          await logSettingsChange(
            workspaceId,
            'execution_mode.changed',
            {
              from: originalSettings?.executionMode,
              to: newSettings.executionMode
            },
            2
          );
        }

        toast({
          title: "Risk & goals updated",
          description: "Your trading preferences have been saved."
        });
      } else {
        throw new Error('Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDisclaimerAccept = async () => {
    if (!pendingChanges) return;

    // Log compliance acknowledgment
    const acknowledged = await acknowledgeRiskToggle(
      workspaceId,
      userId,
      // Note: In a real app, you'd get these from the browser
      undefined, // IP address
      navigator.userAgent
    );

    if (acknowledged) {
      await logSettingsChange(
        workspaceId,
        'compliance.document.acknowledged',
        {
          type: 'risk_toggle_disclaimer',
          version: 'v1-2025-09-02'
        },
        2
      );
    }

    await saveChanges(pendingChanges);
    setShowDisclaimer(false);
    setPendingChanges(null);
  };

  const handleDisclaimerCancel = () => {
    setShowDisclaimer(false);
    setPendingChanges(null);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Risk & Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Risk & Goals
            <Badge 
              variant="outline" 
              className={`ml-auto ${getRiskBadgeColor(riskIndicator)}`}
            >
              {riskIndicator.toUpperCase()} RISK
            </Badge>
          </CardTitle>
          <CardDescription>
            Configure your trading targets and execution preferences
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Capital at Risk */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Capital at Risk</Label>
            <RadioGroup
              value={settings.capitalRisk.toString()}
              onValueChange={(value) => setSettings(prev => ({ ...prev, capitalRisk: parseFloat(value) }))}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="0.05" id="risk-5" />
                <Label htmlFor="risk-5">5%</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="0.10" id="risk-10" />
                <Label htmlFor="risk-10">10%</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="0.20" id="risk-20" />
                <Label htmlFor="risk-20">20%</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Daily Return Target */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Daily Return Target</Label>
            <RadioGroup
              value={settings.dailyTarget.toString()}
              onValueChange={(value) => setSettings(prev => ({ ...prev, dailyTarget: parseFloat(value) }))}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="0.01" id="target-1" />
                <Label htmlFor="target-1">1%</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="0.02" id="target-2" />
                <Label htmlFor="target-2">2%</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="0.05" id="target-5" />
                <Label htmlFor="target-5">5%</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Execution Mode */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Execution Mode</Label>
            <Tabs
              value={settings.executionMode}
              onValueChange={(value) => setSettings(prev => ({ ...prev, executionMode: value as 'manual' | 'automated' }))}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">Manual</TabsTrigger>
                <TabsTrigger value="automated">Automated</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Info Copy */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Targets are goals, not guarantees. Outcomes depend on market conditions.</p>
                <p>Automated mode mirrors orders via your brokerage API; StagAlgo never holds funds.</p>
              </div>
            </div>
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

      <RiskDisclaimerModal
        open={showDisclaimer}
        settings={pendingChanges}
        riskIndicator={pendingChanges ? calculateRiskIndicator(pendingChanges.capitalRisk, pendingChanges.dailyTarget) : 'low'}
        onAccept={handleDisclaimerAccept}
        onCancel={handleDisclaimerCancel}
      />
    </>
  );
}