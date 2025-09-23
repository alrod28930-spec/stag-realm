import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { useToast } from '@/hooks/use-toast';

interface SecurityCheck {
  id: string;
  level: 'info' | 'warning' | 'critical';
  message: string;
  recommendation?: string;
}

interface SecurityAuditResult {
  checks: SecurityCheck[];
  isSecure: boolean;
  criticalCount: number;
  warningCount: number;
}

export const useSecurityAudit = (enabledChecks?: string[]): SecurityAuditResult => {
  const [auditResult, setAuditResult] = useState<SecurityAuditResult>({
    checks: [],
    isSecure: true,
    criticalCount: 0,
    warningCount: 0
  });
  
  const { user, isAuthenticated } = useAuthStore();
  const { portfolio, isConnected } = usePortfolioStore();
  const { toast } = useToast();

  useEffect(() => {
    const runSecurityAudit = () => {
      const checks: SecurityCheck[] = [];

      // Authentication checks
      if (!isAuthenticated) {
        checks.push({
          id: 'auth-required',
          level: 'critical',
          message: 'User is not authenticated',
          recommendation: 'Please log in to access trading features'
        });
      }

      if (isAuthenticated && user?.email !== 'demo@example.com' && user?.email !== 'alrod28930@gmail.com') {
        checks.push({
          id: 'email-not-confirmed',
          level: 'warning',
          message: 'Email address verification recommended',
          recommendation: 'Verify your email to ensure account security'
        });
      }

      // Connection security
      if (isAuthenticated && !isConnected) {
        checks.push({
          id: 'broker-not-connected',
          level: 'warning',
          message: 'Brokerage account not connected',
          recommendation: 'Connect to your broker for live trading'
        });
      }

      // Portfolio checks
      if (isAuthenticated && portfolio) {
        if (portfolio.availableCash && portfolio.availableCash < 1000) {
          checks.push({
            id: 'low-cash',
            level: 'warning',
            message: 'Low available cash balance',
            recommendation: 'Consider depositing funds for trading opportunities'
          });
        }

        if (portfolio.positions && portfolio.positions.length > 20) {
          checks.push({
            id: 'high-position-count',
            level: 'warning',
            message: 'Large number of positions',
            recommendation: 'Consider portfolio concentration risk'
          });
        }
      }

      // Data validation
      if (typeof window !== 'undefined') {
        const localStorageUsage = JSON.stringify(localStorage).length;
        if (localStorageUsage > 5 * 1024 * 1024) { // 5MB
          checks.push({
            id: 'storage-overflow',
            level: 'warning',
            message: 'High local storage usage',
            recommendation: 'Clear browser data if experiencing performance issues'
          });
        }
      }

      // Calculate summary
      const criticalCount = checks.filter(c => c.level === 'critical').length;
      const warningCount = checks.filter(c => c.level === 'warning').length;
      const isSecure = criticalCount === 0;

      setAuditResult({
        checks,
        isSecure,
        criticalCount,
        warningCount
      });

      // Show critical alerts
      if (criticalCount > 0) {
        const criticalIssue = checks.find(c => c.level === 'critical');
        if (criticalIssue) {
          toast({
            title: 'Security Alert',
            description: criticalIssue.message,
            variant: 'destructive'
          });
        }
      }
    };

    runSecurityAudit();
    
    // Re-run audit when auth or connection state changes
    const interval = setInterval(runSecurityAudit, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [isAuthenticated, user, isConnected, portfolio, toast]);

  return auditResult;
};