import React, { useState, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  ExternalLink, 
  Maximize2, 
  Settings, 
  AlertTriangle,
  Monitor,
  Palette 
} from 'lucide-react';
import { PanelContent } from './PanelContent';
import type { PanelConfig } from '@/types/workspace';
import { cn } from '@/lib/utils';

interface WorkspacePanelProps {
  panel: PanelConfig;
  index: number;
  isDragOver: boolean;
  onDrop: (contentType: string, title: string) => void;
  onReplace: (newConfig: Partial<PanelConfig>) => void;
  onClose: () => void;
  onDragOver: (isDragOver: boolean) => void;
  isBubbleMode: boolean;
}

export const WorkspacePanel: React.FC<WorkspacePanelProps> = ({
  panel,
  index,
  isDragOver,
  onDrop,
  onReplace,
  onClose,
  onDragOver,
  isBubbleMode
}) => {
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [pendingDrop, setPendingDrop] = useState<{ contentType: string; title: string } | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const [{ isOver }, drop] = useDrop({
    accept: 'TAB',
    drop: (item: { contentType: string; title: string }) => {
      if (panel.type === 'empty') {
        onDrop(item.contentType, item.title);
      } else {
        // Show replace confirmation for occupied panels
        setPendingDrop(item);
        setShowReplaceConfirm(true);
        
        // Auto-hide after 3 seconds
        timeoutRef.current = setTimeout(() => {
          setShowReplaceConfirm(false);
          setPendingDrop(null);
        }, 3000);
      }
    },
    hover: () => {
      onDragOver(true);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const handleConfirmReplace = () => {
    if (pendingDrop) {
      onDrop(pendingDrop.contentType, pendingDrop.title);
      setShowReplaceConfirm(false);
      setPendingDrop(null);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  };

  const handleCancelReplace = () => {
    setShowReplaceConfirm(false);
    setPendingDrop(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handlePopOut = () => {
    // Future: Open panel in new window
    console.log('Pop out panel:', panel.id);
  };

  // Clear drag over state when not hovering
  React.useEffect(() => {
    if (!isOver) {
      onDragOver(false);
    }
  }, [isOver, onDragOver]);

  const isEmpty = panel.type === 'empty';

  return (
    <div ref={drop} className="relative h-full">
      <Card className={cn(
        "h-full flex flex-col transition-all duration-200",
        isDragOver && "ring-2 ring-primary ring-offset-2 shadow-lg",
        isEmpty && "border-dashed border-2 hover:border-primary/50"
      )}>
        {/* Panel Header */}
        <CardHeader className="pb-2 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isEmpty ? (
                <>
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Drop content here
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm font-semibold truncate">
                    {panel.title}
                  </span>
                  {panel.type === 'external' && (
                    <Badge variant="outline" className="text-xs">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      External
                    </Badge>
                  )}
                </>
              )}
            </div>

            {!isEmpty && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePopOut}
                  className="h-6 w-6 p-0"
                >
                  <Maximize2 className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        {/* Panel Content */}
        <CardContent className="flex-1 p-0 overflow-hidden">
          {isEmpty ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Monitor className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-sm text-center">
                Drag a tab from the sidebar to add content
              </p>
              {isDragOver && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 p-2 bg-primary/10 rounded-md"
                >
                  <span className="text-xs text-primary font-medium">
                    Drop to add content
                  </span>
                </motion.div>
              )}
            </div>
          ) : (
            <PanelContent panel={panel} isBubbleMode={isBubbleMode} />
          )}
        </CardContent>

        {/* Replace Confirmation Overlay */}
        <AnimatePresence>
          {showReplaceConfirm && pendingDrop && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg"
            >
              <div className="text-center space-y-4 p-6">
                <div className="flex items-center justify-center gap-2 text-warning">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Replace Panel?</span>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Replace "<span className="font-medium">{panel.title}</span>" with "
                  <span className="font-medium">{pendingDrop.title}</span>"?
                </p>

                <div className="flex gap-2 justify-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelReplace}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConfirmReplace}
                    className="bg-primary"
                  >
                    Replace
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
};