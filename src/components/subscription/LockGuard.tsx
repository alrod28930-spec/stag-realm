import React from 'react';
import { useEntitlements } from '@/hooks/useEntitlements';
import { LockedCard } from './LockedCard';

interface LockGuardProps {
  feature: string;
  workspaceId?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function LockGuard({ feature, workspaceId, children, fallback }: LockGuardProps) {
  const { hasFeature, loading } = useEntitlements(workspaceId);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasFeature(feature)) {
    return fallback || <LockedCard feature={feature} workspaceId={workspaceId} />;
  }

  return <>{children}</>;
}