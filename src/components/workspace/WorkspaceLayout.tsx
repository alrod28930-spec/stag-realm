import React, { useState, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { WorkspacePanel } from './WorkspacePanel';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import type { WorkspaceLayoutConfig, PanelConfig } from '@/types/workspace';

interface WorkspaceLayoutProps {
  layout: WorkspaceLayoutConfig;
  onLayoutChange: (layout: WorkspaceLayoutConfig) => void;
  isBubbleMode: boolean;
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  layout,
  onLayoutChange,
  isBubbleMode
}) => {
  const [dragOverPanelId, setDragOverPanelId] = useState<string | null>(null);

  // Handle dropping content into a panel
  const handleDrop = useCallback((panelId: string, contentType: string, title: string) => {
    const panelIndex = layout.panels.findIndex(p => p.id === panelId);
    if (panelIndex === -1) return;

    const newPanels = [...layout.panels];
    newPanels[panelIndex] = {
      ...newPanels[panelIndex],
      type: contentType.startsWith('http') ? 'external' : 'internal',
      contentType: contentType.startsWith('http') ? 'external' : contentType,
      title,
      url: contentType.startsWith('http') ? contentType : undefined,
      props: {}
    };

    onLayoutChange({
      ...layout,
      panels: newPanels
    });

    setDragOverPanelId(null);
  }, [layout, onLayoutChange]);

  // Handle replacing panel content
  const handleReplacePanel = useCallback((panelId: string, newConfig: Partial<PanelConfig>) => {
    const panelIndex = layout.panels.findIndex(p => p.id === panelId);
    if (panelIndex === -1) return;

    const newPanels = [...layout.panels];
    newPanels[panelIndex] = {
      ...newPanels[panelIndex],
      ...newConfig
    };

    onLayoutChange({
      ...layout,
      panels: newPanels
    });
  }, [layout, onLayoutChange]);

  // Handle closing/clearing a panel
  const handleClosePanel = useCallback((panelId: string) => {
    const panelIndex = layout.panels.findIndex(p => p.id === panelId);
    if (panelIndex === -1) return;

    const newPanels = [...layout.panels];
    newPanels[panelIndex] = {
      id: panelId,
      type: 'empty'
    };

    onLayoutChange({
      ...layout,
      panels: newPanels
    });
  }, [layout, onLayoutChange]);

  const gridTemplate = `repeat(${layout.gridRows}, 1fr) / repeat(${layout.gridCols}, 1fr)`;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-full">
        {/* Sidebar - Hidden in bubble mode */}
        {!isBubbleMode && (
          <WorkspaceSidebar />
        )}

        {/* Main workspace grid */}
        <div className="flex-1 p-4">
          <div
            className="grid gap-4 h-full"
            style={{
              gridTemplate,
              minHeight: isBubbleMode ? '100vh' : 'calc(100vh - 200px)'
            }}
          >
            {layout.panels.map((panel, index) => (
              <WorkspacePanel
                key={panel.id}
                panel={panel}
                index={index}
                isDragOver={dragOverPanelId === panel.id}
                onDrop={(contentType, title) => handleDrop(panel.id, contentType, title)}
                onReplace={(newConfig) => handleReplacePanel(panel.id, newConfig)}
                onClose={() => handleClosePanel(panel.id)}
                onDragOver={(isDragOver) => setDragOverPanelId(isDragOver ? panel.id : null)}
                isBubbleMode={isBubbleMode}
              />
            ))}
          </div>
        </div>
      </div>
    </DndProvider>
  );
};