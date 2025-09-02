import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { TrendingUp, TrendingDown, Brain, Target, Award, AlertTriangle } from 'lucide-react';
import { learningEngine } from '../../services/learningEngine';
import type { LearningDashboard as LearningDashboardType, BotPerformance, LearningInsight } from '../../types/learning';

export const LearningDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<LearningDashboardType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = () => {
      try {
        const data = learningEngine.getLearningDashboard();
        setDashboardData(data);
      } catch (error) {
        console.error('Failed to load learning dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No learning data available yet. Execute some trades to start building your learning profile.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.overview.total_trades}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(dashboardData.overview.overall_win_rate * 100).toFixed(1)}%
            </div>
            <Progress 
              value={dashboardData.overview.overall_win_rate * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bots</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.overview.active_bots}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Events</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.overview.learning_events}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="performance">Bot Performance</TabsTrigger>
          <TabsTrigger value="insights">Learning Insights</TabsTrigger>
          <TabsTrigger value="adaptive">Adaptive Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Bots</CardTitle>
              <CardDescription>
                Bots ranked by recent accuracy and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.top_performing_bots.map((bot, index) => (
                  <BotPerformanceCard key={bot.bot_id} bot={bot} rank={index + 1} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Learning Insights</CardTitle>
              <CardDescription>
                Key patterns and recommendations from your trading history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.recent_insights.length > 0 ? (
                  dashboardData.recent_insights.map((insight, index) => (
                    <InsightCard key={index} insight={insight} />
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Not enough trading data to generate insights yet.
                    <br />
                    Execute more trades to unlock personalized learning.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adaptive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Adaptive Settings</CardTitle>
              <CardDescription>
                System parameters automatically adjusted based on your performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Risk Multiplier</span>
                    <span className="text-sm text-muted-foreground">
                      {dashboardData.adaptive_settings.riskMultiplier.toFixed(2)}x
                    </span>
                  </div>
                  <Progress 
                    value={(dashboardData.adaptive_settings.riskMultiplier - 0.5) * 100} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    How aggressive the system is with position sizing
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Confidence Threshold</span>
                    <span className="text-sm text-muted-foreground">
                      {(dashboardData.adaptive_settings.confidenceThreshold * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress 
                    value={dashboardData.adaptive_settings.confidenceThreshold * 100} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum confidence required for trade execution
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-xs text-muted-foreground">
                  Last updated: {new Date(dashboardData.adaptive_settings.lastUpdated).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const BotPerformanceCard: React.FC<{ bot: BotPerformance; rank: number }> = ({ bot, rank }) => {
  const winRate = bot.total_trades > 0 ? (bot.winning_trades / bot.total_trades) * 100 : 0;
  const isPerforming = bot.accuracy_score > 0.6;

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center space-x-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
          {rank}
        </div>
        <div>
          <div className="font-medium">{bot.bot_id}</div>
          <div className="text-sm text-muted-foreground">
            {bot.total_trades} trades • {winRate.toFixed(1)}% win rate
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="text-right">
          <div className="text-sm font-medium">
            ${bot.total_pnl.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">
            {bot.confidence_weight.toFixed(2)}x weight
          </div>
        </div>
        
        <Badge variant={isPerforming ? "default" : "secondary"}>
          {isPerforming ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
          {(bot.accuracy_score * 100).toFixed(0)}%
        </Badge>
      </div>
    </div>
  );
};

const InsightCard: React.FC<{ insight: LearningInsight }> = ({ insight }) => {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'positive_trend':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'negative_trend':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.7) return 'text-green-600';
    if (confidence > 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2">
          {getInsightIcon(insight.type)}
          <span className="font-medium">{insight.message}</span>
        </div>
        <Badge variant="outline" className={getConfidenceColor(insight.confidence)}>
          {(insight.confidence * 100).toFixed(0)}% confidence
        </Badge>
      </div>
      
      <div className="text-sm text-muted-foreground">
        <strong>Recommendation:</strong> {insight.actionable}
      </div>
    </div>
  );
};