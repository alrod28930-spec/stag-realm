import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';
import { userSettingsService } from '@/services/userSettings';
import type { UserSettings } from '@/types/userSettings';
import { User, Shield, Bell, Database, Palette } from 'lucide-react';

export function UserSettingsPanel() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuthStore();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    
    setIsLoading(true);
    const userSettings = await userSettingsService.getUserSettings(user.id);
    
    if (userSettings) {
      setSettings(userSettings);
    } else {
      // Create default settings
      const defaultSettings: Partial<UserSettings> = {
        theme: 'dark',
        analyst_persona: 'Mentor',
        voice_profile: 'StagVoice',
        notifications_email: true,
        notifications_push: false,
        data_sharing_opt_in: false
      };
      
      const success = await userSettingsService.updateUserSettings(user.id, defaultSettings);
      if (success) {
        const newSettings = await userSettingsService.getUserSettings(user.id);
        setSettings(newSettings);
      }
    }
    
    setIsLoading(false);
  };

  const updateSetting = async (key: keyof UserSettings, value: any) => {
    if (!user || !settings) return;
    
    setIsSaving(true);
    const success = await userSettingsService.updateUserSettings(user.id, { [key]: value });
    
    if (success) {
      setSettings({ ...settings, [key]: value });
      toast({
        title: "Settings Updated",
        description: "Your preferences have been saved.",
      });
    } else {
      toast({
        title: "Update Failed",
        description: "Failed to save your settings. Please try again.",
        variant: "destructive",
      });
    }
    
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-32 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">Failed to load user settings.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize the look and feel of your interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Theme</Label>
              <p className="text-sm text-muted-foreground">
                Choose your preferred color scheme
              </p>
            </div>
            <Select
              value={settings.theme}
              onValueChange={(value) => updateSetting('theme', value)}
              disabled={isSaving}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* AI Personality Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            AI Personality
          </CardTitle>
          <CardDescription>
            Configure how the AI analyst communicates with you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Analyst Persona</Label>
              <p className="text-sm text-muted-foreground">
                Choose your preferred analyst communication style
              </p>
            </div>
            <Select
              value={settings.analyst_persona}
              onValueChange={(value) => updateSetting('analyst_persona', value)}
              disabled={isSaving}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mentor">Mentor</SelectItem>
                <SelectItem value="Professional">Professional</SelectItem>
                <SelectItem value="Casual">Casual</SelectItem>
                <SelectItem value="Technical">Technical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Voice Profile</Label>
              <p className="text-sm text-muted-foreground">
                Select voice for audio analysis
              </p>
            </div>
            <Select
              value={settings.voice_profile}
              onValueChange={(value) => updateSetting('voice_profile', value)}
              disabled={isSaving}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="StagVoice">StagVoice</SelectItem>
                <SelectItem value="Professional">Professional</SelectItem>
                <SelectItem value="Friendly">Friendly</SelectItem>
                <SelectItem value="Technical">Technical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Notifications
          </CardTitle>
          <CardDescription>
            Control how and when you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive important updates via email
              </p>
            </div>
            <Switch
              checked={settings.notifications_email}
              onCheckedChange={(checked) => updateSetting('notifications_email', checked)}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive real-time alerts in your browser
              </p>
            </div>
            <Switch
              checked={settings.notifications_push}
              onCheckedChange={(checked) => updateSetting('notifications_push', checked)}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Privacy & Data
          </CardTitle>
          <CardDescription>
            Manage your data sharing and privacy preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Analytics & Telemetry</Label>
              <p className="text-sm text-muted-foreground">
                Help improve StagAlgo by sharing anonymous usage data
              </p>
            </div>
            <Switch
              checked={settings.data_sharing_opt_in}
              onCheckedChange={(checked) => updateSetting('data_sharing_opt_in', checked)}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}