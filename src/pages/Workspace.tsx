import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LockedCard } from '@/components/subscription/LockedCard';
import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout';
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
  const { hasFeature, loading: entitlementsLoading } = useEntitlements(user?.organizationId);
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
  const [isLoadingLayouts, setIsLoadingLayouts] = useState(true);

  const hasEliteAccess = hasFeature('WORKSPACE_MULTI_PANEL');

  // Load saved layouts
  const loadLayouts = useCallback(async () => {
    if (!user?.id || !user?.organizationId) return;
    
    setIsLoadingLayouts(true);
    try {
      const { data, error } = await supabase
        .from('ui_layouts')
        .select('*')
        .eq('user_id', user.id)
        .eq('workspace_id', user.organizationId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

        const layouts = (data || []).map(item => ({
          id: item.id,
          name: item.name,
          ...(item.layout as any),
          created_at: item.created_at,
          updated_at: item.updated_at
        }));

      setSavedLayouts(layouts);
      
      // Load "Last Used" layout if exists
      const lastUsed = layouts.find(l => l.name === 'Last Used');
      if (lastUsed) {
        setCurrentLayout(lastUsed);
      }
    } catch (error) {
      console.error('Error loading layouts:', error);
      toast({
        title: "Error",
        description: "Failed to load workspace layouts",
        variant: "destructive"
      });
    } finally {
      setIsLoadingLayouts(false);
    }
  }, [user?.id, user?.organizationId, toast]);

  // Save layout
  const saveLayout = useCallback(async (layout: WorkspaceLayoutConfig, isAutoSave = false) => {
    if (!user?.id || !user?.organizationId) return;

    try {
      const layoutData = {
        gridCols: layout.gridCols,
        gridRows: layout.gridRows,
        panels: layout.panels
      };

      await supabase
        .from('ui_layouts')
        .upsert({
          id: layout.id === 'default' ? undefined : layout.id,
          user_id: user.id,
          workspace_id: user.organizationId,
          name: layout.name,
          layout: layoutData as any
        }, {
          onConflict: 'user_id,workspace_id,name'
        });

      if (!isAutoSave) {
        toast({
          title: "Layout Saved",
          description: `"${layout.name}" has been saved successfully.`
        });
      }

      // Reload layouts
      await loadLayouts();
    } catch (error) {
      console.error('Error saving layout:', error);
      toast({
        title: "Error", 
        description: "Failed to save layout",
        variant: "destructive"
      });
    }
  }, [user?.id, user?.organizationId, loadLayouts, toast]);

  // Auto-save to "Last Used"
  useEffect(() => {
    const autoSaveLayout = {
      ...currentLayout,
      name: 'Last Used'
    };
    
    const timeoutId = setTimeout(() => {
      saveLayout(autoSaveLayout, true);
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [currentLayout, saveLayout]);

  // Load layouts on mount
  useEffect(() => {
    if (hasEliteAccess && user?.id) {
      loadLayouts();
    }
  }, [hasEliteAccess, user?.id, loadLayouts]);

  // Keyboard shortcuts
  const shortcuts = [
    {
      key: 'b',
      meta: true,
      shift: true,
      callback: () => setIsBubbleMode(!isBubbleMode),
      description: 'Toggle Bubble Mode'
    },
    {
      key: '1',
      meta: true,
      callback: () => setCurrentLayout(prev => ({ ...prev, gridCols: 1, gridRows: 1, panels: [prev.panels[0]] })),
      description: 'Switch to 1x1 layout'
    },
    {
      key: '2',
      meta: true,
      callback: () => setCurrentLayout(prev => ({ ...prev, gridCols: 2, gridRows: 1, panels: prev.panels.slice(0, 2) })),
      description: 'Switch to 2x1 layout'
    },
    {
      key: '4',
      meta: true,
      callback: () => setCurrentLayout(prev => ({ ...prev, gridCols: 2, gridRows: 2, panels: prev.panels.slice(0, 4) })),
      description: 'Switch to 2x2 layout'
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

  // Handle preset layouts
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

  // Loading state
  if (entitlementsLoading || isLoadingLayouts) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  // Elite access required
  if (!hasEliteAccess) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <LockedCard
          feature="WORKSPACE_MULTI_PANEL"
          title="Elite Workspace"
          description="Multi-panel drag-and-drop workspace with bubble mode and advanced layouting capabilities."
        />
      </div>
    );
  }

  // Bubble Mode - Full screen workspace
  if (isBubbleMode) {
    return (
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
    );
  }

  // Normal Mode
  return (
    <div className="flex h-full bg-background">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="border-b border-border bg-card/30 p-4">
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
  );
};

export default Workspace;