import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LockedCard } from '@/components/subscription/LockedCard';
import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout';
import { WorkspaceSelector } from '@/components/workspace/WorkspaceSelector';
import { WorkspaceStatusBar } from '@/components/workspace/WorkspaceStatusBar';
import { WorkspaceMetrics } from '@/components/workspace/WorkspaceMetrics';
import { WorkspaceErrorBoundary } from '@/components/workspace/WorkspaceErrorBoundary';
import { 
  Maximize, 
  Minimize, 
  Grid3X3, 
  Monitor,
  Sparkles,
  Crown
} from 'lucide-react';

import type { WorkspaceLayoutConfig, PanelConfig } from '@/types/workspace';

const Workspace: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const { workspaceId, loading: workspaceLoading, error: workspaceError } = useWorkspace();
  const { hasFeature, loading: entitlementsLoading } = useEntitlements(workspaceId);
  const { toast } = useToast();
  
  const [isBubbleMode, setIsBubbleMode] = useState(false);
  const [currentLayout, setCurrentLayout] = useState<WorkspaceLayoutConfig>({
    id: 'default',
    name: 'Default Layout',
    gridCols: 2,
    gridRows: 2,
    panels: [
      { id: 'panel-1', type: 'empty' },
      { id: 'panel-2', type: 'empty' },
      { id: 'panel-3', type: 'empty' },
      { id: 'panel-4', type: 'empty' }
    ]
  });
  
  const [savedLayouts, setSavedLayouts] = useState<WorkspaceLayoutConfig[]>([]);
  const [isLoadingLayouts, setIsLoadingLayouts] = useState(false);

  const hasEliteAccess = hasFeature('workspace_multi_panel');

  // Show loading state
  if (workspaceLoading || entitlementsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (workspaceError) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Workspace Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground text-sm">{workspaceError}</p>
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle preset layouts - simplified
  const setPresetLayout = (cols: number, rows: number) => {
    const totalPanels = cols * rows;
    const panels = Array.from({ length: totalPanels }, (_, i) => ({
      id: `panel-${i + 1}`,
      type: 'empty' as const
    }));

    setCurrentLayout(prev => ({
      ...prev,
      gridCols: cols,
      gridRows: rows,
      panels
    }));
  };

  // Keyboard shortcuts - simplified
  const shortcuts = [
    {
      key: 'b',
      meta: true,
      shift: true,
      callback: () => setIsBubbleMode(!isBubbleMode),
      description: 'Toggle Bubble Mode'
    },
    {
      key: 'Escape',
      callback: () => {
        if (isBubbleMode) {
          setIsBubbleMode(false);
        }
      },
      description: 'Exit Bubble Mode'
    }
  ];

  useKeyboardShortcuts(shortcuts, { enabled: hasEliteAccess });

  // Loading state - simplified check
  if (entitlementsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading workspace permissions...</p>
        </div>
      </div>
    );
  }

  // Elite access required
  if (!hasEliteAccess) {
    return (
      <WorkspaceErrorBoundary>
        <div className="flex-1 flex items-center justify-center p-8">
          <LockedCard
            feature="workspace_multi_panel"
            title="Elite Workspace"
            description="Multi-panel drag-and-drop workspace with bubble mode and advanced layouting capabilities."
          />
        </div>
      </WorkspaceErrorBoundary>
    );
  }

  // Bubble Mode - Full screen workspace
  if (isBubbleMode) {
    return (
      <WorkspaceErrorBoundary>
        <div className="fixed inset-0 z-50 bg-background">
          {/* Exit Bubble Mode */}
          <Button
            variant="outline" 
            size="sm"
            onClick={() => setIsBubbleMode(false)}
            className="absolute top-4 right-4 z-10 gap-2"
          >
            <Minimize className="w-4 h-4" />
            Exit Bubble
          </Button>
          
          <WorkspaceLayout
            layout={currentLayout}
            onLayoutChange={setCurrentLayout}
            isBubbleMode={true}
          />
        </div>
      </WorkspaceErrorBoundary>
    );
  }

  // Normal Mode
  return (
    <WorkspaceErrorBoundary>
      <div className="flex h-full bg-background">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar with Workspace Status */}
          <WorkspaceStatusBar />
          
          <div className="border-b border-border bg-card/30 p-4 space-y-4">
            {/* Workspace Metrics */}
            <WorkspaceMetrics />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-warning" />
                  <h1 className="text-xl font-bold">Elite Workspace</h1>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {currentLayout.gridCols}×{currentLayout.gridRows} Layout
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Layout Presets */}
                <div className="flex rounded-md border border-border">
                  {[
                    { cols: 1, rows: 1, label: '1×1' },
                    { cols: 2, rows: 1, label: '1×2' }, 
                    { cols: 1, rows: 2, label: '2×1' },
                    { cols: 2, rows: 2, label: '2×2' }
                  ].map(({ cols, rows, label }) => (
                    <Button
                      key={label}
                      variant="ghost"
                      size="sm"
                      className={`px-3 rounded-none ${
                        currentLayout.gridCols === cols && currentLayout.gridRows === rows
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => setPresetLayout(cols, rows)}
                    >
                      <Grid3X3 className="w-4 h-4 mr-1" />
                      {label}
                    </Button>
                  ))}
                </div>

                {/* Bubble Mode */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBubbleMode(true)}
                  className="gap-2"
                >
                  <Maximize className="w-4 h-4" />
                  Bubble Mode
                </Button>
              </div>
            </div>
          </div>

          {/* Workspace */}
          <div className="flex-1 overflow-hidden">
            <WorkspaceLayout
              layout={currentLayout}
              onLayoutChange={setCurrentLayout}
              isBubbleMode={false}
            />
          </div>

          {/* Compliance Footer */}
          <div className="border-t border-border bg-muted/50 px-4 py-2 text-center text-xs text-muted-foreground">
            Educational software. StagAlgo does not hold funds.
          </div>
        </div>
      </div>
    </WorkspaceErrorBoundary>
  );
};

export default Workspace;