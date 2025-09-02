import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';
import { User, Shield, Bell, Database, Palette } from 'lucide-react';

export function UserSettingsPanel() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  
  // Simple local state for settings since we removed the user settings service
  const [settings, setSettings] = useState({
    theme: 'dark',
    notifications_email: true,
    notifications_push: false,
    data_sharing_opt_in: false,
    analyst_persona: 'Mentor',
    voice_profile: 'StagVoice',
  });

  const handleSave = () => {
    // For now, just show success - in a real app you'd save to database
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated.",
    });
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Settings
          </CardTitle>
          <CardDescription>
            Manage your account information and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="email">Email Address</Label>
            <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
              {user?.email || 'No email set'}
            </div>
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="name">Display Name</Label>
            <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
              {user?.name || 'No name set'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme and Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize how the application looks and feels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="theme">Theme</Label>
              <div className="text-sm text-muted-foreground">
                Choose your preferred color scheme
              </div>
            </div>
            <Select 
              value={settings.theme} 
              onValueChange={(value) => handleSettingChange('theme', value)}
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

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Configure how you receive alerts and updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <div className="text-sm text-muted-foreground">
                Receive trading alerts and updates via email
              </div>
            </div>
            <Switch 
              id="email-notifications"
              checked={settings.notifications_email}
              onCheckedChange={(checked) => handleSettingChange('notifications_email', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-notifications">Push Notifications</Label>
              <div className="text-sm text-muted-foreground">
                Receive real-time notifications in your browser
              </div>
            </div>
            <Switch 
              id="push-notifications"
              checked={settings.notifications_push}
              onCheckedChange={(checked) => handleSettingChange('notifications_push', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Privacy & Data
          </CardTitle>
          <CardDescription>
            Control how your data is used and shared
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="data-sharing">Data Sharing</Label>
              <div className="text-sm text-muted-foreground">
                Share anonymized data to improve our services
              </div>
            </div>
            <Switch 
              id="data-sharing"
              checked={settings.data_sharing_opt_in}
              onCheckedChange={(checked) => handleSettingChange('data_sharing_opt_in', checked)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Analyst Persona</Label>
            <Select 
              value={settings.analyst_persona} 
              onValueChange={(value) => handleSettingChange('analyst_persona', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mentor">Mentor - Educational and supportive</SelectItem>
                <SelectItem value="Expert">Expert - Technical and precise</SelectItem>
                <SelectItem value="Casual">Casual - Friendly and conversational</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Voice Profile</Label>
            <Select 
              value={settings.voice_profile} 
              onValueChange={(value) => handleSettingChange('voice_profile', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="StagVoice">StagVoice - Default</SelectItem>
                <SelectItem value="Professional">Professional - Business tone</SelectItem>
                <SelectItem value="Friendly">Friendly - Warm and approachable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security
          </CardTitle>
          <CardDescription>
            Manage your account security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full justify-start">
            Change Password
          </Button>
          <Button variant="outline" className="w-full justify-start">
            Two-Factor Authentication
          </Button>
          <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive">
            Sign Out All Devices
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="min-w-24">
          Save Settings
        </Button>
      </div>
    </div>
  );
}