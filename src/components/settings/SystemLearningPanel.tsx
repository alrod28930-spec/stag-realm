import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Settings, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Activity,
  Eye
} from 'lucide-react';
import { learningBot } from '@/services/learningBot';
import { seeker } from '@/services/seeker';

export default function SystemLearningPanel() {
  const [learningMetrics, setLearningMetrics] = useState<any>(null);
  const [seekerMetrics, setSeekerMetrics] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadMetrics = () => {
    setLearningMetrics(learningBot.getMetrics());
    setSeekerMetrics(seeker.getMetrics());
    setSettings(learningBot.getSettings());
  };

  const handleSettingChange = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    learningBot.updateSettings(newSettings);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">System Learning Framework</h2>
      </div>

      {/* Learning Bot Status */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Learning Bot Status
            <Badge className={learningMetrics?.activeLearning ? 'bg-accent/20 text-accent' : 'bg-muted/20'}>
              {learningMetrics?.activeLearning ? 'Active' : 'Inactive'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">{learningMetrics?.totalOptimizations || 0}</div>
              <div className="text-xs text-muted-foreground">Total Optimizations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{learningMetrics?.appliedOptimizations || 0}</div>
              <div className="text-xs text-muted-foreground">Applied</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">{learningMetrics?.pendingApprovals || 0}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{((learningMetrics?.successRate || 0) * 100).toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Success Rate</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Average Improvement</span>
              <span>{((learningMetrics?.averageImprovement || 0) * 100).toFixed(1)}%</span>
            </div>
            <Progress value={(learningMetrics?.averageImprovement || 0) * 100} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Seeker Status */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            The Seeker Status
            <Badge className={seeker.isActiveStatus() ? 'bg-accent/20 text-accent' : 'bg-muted/20'}>
              {seeker.isActiveStatus() ? 'Scanning' : 'Inactive'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-primary">{seekerMetrics?.totalFindings || 0}</div>
              <div className="text-xs text-muted-foreground">Total Findings</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-accent">{seekerMetrics?.processedFindings || 0}</div>
              <div className="text-xs text-muted-foreground">Processed</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-destructive">{seekerMetrics?.highPriorityFindings || 0}</div>
              <div className="text-xs text-muted-foreground">High Priority</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Learning Controls */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Learning Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Enable System Learning</div>
              <div className="text-sm text-muted-foreground">Allow the system to learn and adapt automatically</div>
            </div>
            <Switch
              checked={settings?.enabled || false}
              onCheckedChange={(checked) => handleSettingChange('enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Auto-Apply Low Risk Changes</div>
              <div className="text-sm text-muted-foreground">Automatically apply optimizations with low risk</div>
            </div>
            <Switch
              checked={settings?.autoApplyLowRisk || false}
              onCheckedChange={(checked) => handleSettingChange('autoApplyLowRisk', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Conservative Mode</div>
              <div className="text-sm text-muted-foreground">Use conservative learning parameters</div>
            </div>
            <Switch
              checked={settings?.conservativeMode || false}
              onCheckedChange={(checked) => handleSettingChange('conservativeMode', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}