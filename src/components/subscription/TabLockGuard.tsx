import React from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import UpgradeCTA from './UpgradeCTA';

interface TabLockGuardProps {
  children: React.ReactNode;
}

const TabLockGuard: React.FC<TabLockGuardProps> = ({ children }) => {
  const location = useLocation();
  const { checkTabAccess, subscriptionStatus } = useSubscriptionAccess();
  
  const tabAccess = checkTabAccess(location.pathname);

  // If it's a demo user, always allow access but show demo banner
  if (subscriptionStatus.isDemo) {
    return <>{children}</>;
  }

  // If user has access to the tab, render children
  if (tabAccess.hasAccess) {
    return <>{children}</>;
  }

  // If tab is locked, redirect to subscription page with the upgrade CTA
  if (tabAccess.isLocked) {
    return <Navigate to="/subscription" replace />;
  }

  return <>{children}</>;
};

export default TabLockGuard;