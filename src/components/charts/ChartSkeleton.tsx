/**
 * Chart skeleton for loading state
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ChartSkeletonProps {
  height?: number;
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({ height = 400 }) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="flex items-center justify-center bg-muted/20 rounded"
          style={{ height: `${height}px` }}
        >
          <div className="text-center space-y-2">
            <div className="animate-pulse text-muted-foreground">
              Loading chart data...
            </div>
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
