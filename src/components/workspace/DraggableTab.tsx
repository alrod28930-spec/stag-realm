import React from 'react';
import { useDrag } from 'react-dnd';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  title: string;
  icon: LucideIcon;
  description: string;
  category: string;
  url?: string;
}

interface DraggableTabProps {
  tab: Tab;
  isRecent?: boolean;
  isUrl?: boolean;
}

export const DraggableTab: React.FC<DraggableTabProps> = ({ 
  tab, 
  isRecent = false, 
  isUrl = false 
}) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'TAB',
    item: { 
      id: tab.id, 
      contentType: isUrl ? tab.url || tab.id : tab.id,
      title: tab.title 
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const Icon = tab.icon;

  return (
    <motion.div
      ref={drag}
      className={cn(
        "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className={cn(
        "transition-all hover:shadow-md border-dashed",
        isDragging ? "border-primary shadow-lg" : "hover:border-primary/50"
      )}>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-md flex-shrink-0",
              isRecent ? "bg-chart-1/10" : "bg-primary/10"
            )}>
              {isRecent ? (
                <Clock className="w-4 h-4 text-chart-1" />
              ) : (
                <Icon className="w-4 h-4 text-primary" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium truncate">
                  {tab.title}
                </h4>
                {isRecent && (
                  <Badge variant="secondary" className="text-xs">
                    Recent
                  </Badge>
                )}
                {isUrl && (
                  <Badge variant="outline" className="text-xs">
                    External
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-1">
                {tab.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};