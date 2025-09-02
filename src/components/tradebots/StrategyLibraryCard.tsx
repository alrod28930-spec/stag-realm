import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  ChevronRight, 
  BookOpen, 
  Target, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react";
import { StrategySet, STRATEGY_ELIGIBILITY } from "@/types/strategyLibrary";
import { DailyTargetMode } from "@/types/botProfile";
import { buildStrategySet, isBlackedOut } from "@/services/strategyLibrary";

interface StrategyLibraryCardProps {
  mode: DailyTargetMode;
  workspaceId: string;
  className?: string;
}

export function StrategyLibraryCard({ mode, workspaceId, className }: StrategyLibraryCardProps) {
  const [strategySet, setStrategySet] = useState<StrategySet | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadStrategies();
  }, [mode]);

  const loadStrategies = async () => {
    setLoading(true);
    try {
      const strategies = await buildStrategySet(mode, 'equity_largecap', 0.75);
      setStrategySet(strategies);
    } catch (error) {
      console.error('Error loading strategies:', error);
    } finally {
      setLoading(false);
    }
  };

  const eligibility = STRATEGY_ELIGIBILITY[mode];
  const isBlackedOutNow = strategySet ? isBlackedOut(strategySet.blackoutEvents) : false;

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <BookOpen className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Strategy Library</CardTitle>
                  <CardDescription>
                    {eligibility?.description || 'Available strategies for current mode'}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {isBlackedOutNow && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Blackout
                  </Badge>
                )}
                {strategySet?.regime && (
                  <Badge variant="outline" className="text-xs">
                    {strategySet.regime.regime_label}
                  </Badge>
                )}
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Mode Summary */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <div className="font-medium">{mode.replace('p', '%')} Daily Target Mode</div>
                <div className="text-sm text-muted-foreground">
                  {strategySet?.playbooks.length || 0} eligible playbooks
                  {strategySet?.nicheEdges && strategySet.nicheEdges.length > 0 && 
                    `, ${strategySet.nicheEdges.length} niche edges`
                  }
                </div>
              </div>
              <Target className="w-5 h-5 text-primary" />
            </div>

            {/* Playbooks */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <h4 className="font-medium">Core Playbooks</h4>
              </div>
              <div className="grid gap-2">
                {strategySet?.playbooks.map((playbook) => (
                  <div key={playbook.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{playbook.name.replace(/_/g, ' ')}</div>
                      <div className="text-sm text-muted-foreground">
                        RR: {playbook.rr_default}x • Stop: {playbook.stop_style}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Niche Edges */}
            {strategySet?.nicheEdges && strategySet.nicheEdges.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  <h4 className="font-medium">Niche Edges</h4>
                  <Badge variant="secondary" className="text-xs">Advanced</Badge>
                </div>
                <div className="grid gap-2">
                  {strategySet.nicheEdges.map((edge) => (
                    <div key={edge.id} className="flex items-center justify-between p-3 border rounded-lg bg-accent/10">
                      <div>
                        <div className="font-medium">{edge.name.replace(/_/g, ' ')}</div>
                        <div className="text-sm text-muted-foreground">
                          {edge.hypothesis || 'Advanced pattern detection'}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        <Target className="w-3 h-3 mr-1" />
                        Edge
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Market Regime */}
            {strategySet?.regime && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <h4 className="font-medium">Current Regime</h4>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium capitalize">{strategySet.regime.regime_label} Market</div>
                      <div className="text-sm text-muted-foreground">
                        {strategySet.regime.symbol_class.replace(/_/g, ' ')} • Last updated: {
                          new Date(strategySet.regime.ts).toLocaleTimeString()
                        }
                      </div>
                    </div>
                    <Badge 
                      variant={strategySet.regime.regime_label === 'trend' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {strategySet.regime.regime_label}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Active Events */}
            {strategySet?.blackoutEvents && strategySet.blackoutEvents.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h4 className="font-medium">Market Events</h4>
                </div>
                <div className="grid gap-2">
                  {strategySet.blackoutEvents.map((event, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-amber-50/50 dark:bg-amber-950/20">
                      <div>
                        <div className="font-medium capitalize">{event.event_type}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(event.ts).toLocaleString()}
                          {event.symbol && ` • ${event.symbol}`}
                        </div>
                      </div>
                      <Badge 
                        variant={event.severity >= 3 ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        Severity {event.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Compliance Note */}
            <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
              <p>• Strategies are systematically selected based on market regime and risk parameters</p>
              <p>• All strategy selection decisions are logged for compliance and audit purposes</p>
              <p>• Targets are goals, not guarantees. Performance depends on market conditions</p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}