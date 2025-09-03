// System Audit Utility - Comprehensive system health checking
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

interface AuditResult {
  category: string;
  severity: 'critical' | 'warning' | 'info';
  issue: string;
  description: string;
  recommendation: string;
  fixed?: boolean;
}

export class SystemAuditor {
  private results: AuditResult[] = [];

  async runComprehensiveAudit(): Promise<AuditResult[]> {
    this.results = [];
    
    console.log('🔍 Starting comprehensive system audit...');
    
    // Run all audit categories
    await this.auditAuthentication();
    await this.auditDatabase();
    await this.auditSecurity();
    await this.auditPerformance();
    await this.auditDataIntegrity();
    
    // Sort by severity
    this.results.sort((a, b) => {
      const severityOrder = { critical: 3, warning: 2, info: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
    
    console.log(`✅ System audit complete. Found ${this.results.length} issues.`);
    return this.results;
  }

  private async auditAuthentication() {
    console.log('🔐 Auditing authentication system...');
    
    // Check auth store consistency
    const authState = useAuthStore.getState();
    
    if (authState.user && !authState.isAuthenticated) {
      this.addResult('Authentication', 'warning', 'AUTH_STATE_INCONSISTENT', 
        'User exists but isAuthenticated is false', 
        'Check auth store state management logic');
    }
    
    // Check demo user handling consistency
    if (authState.user?.email === 'demo@example.com') {
      if (authState.user.id !== '00000000-0000-0000-0000-000000000000') {
        this.addResult('Authentication', 'warning', 'DEMO_USER_ID_MISMATCH',
          'Demo user has incorrect ID', 
          'Ensure demo user always uses the same hardcoded ID');
      }
    }
    
    // Check for authentication session
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && authState.isAuthenticated && authState.user?.email !== 'demo@example.com') {
        this.addResult('Authentication', 'critical', 'AUTH_SESSION_MISMATCH',
          'User marked as authenticated but no Supabase session exists',
          'Force logout and re-authentication required');
      }
    } catch (error) {
      this.addResult('Authentication', 'critical', 'AUTH_CHECK_FAILED',
        'Failed to check authentication session',
        'Verify Supabase connection and configuration');
    }
  }

  private async auditDatabase() {
    console.log('🗃️ Auditing database integrity...');
    
    try {
      // Check if user has profile
      const authState = useAuthStore.getState();
      if (authState.user && authState.user.email !== 'demo@example.com') {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authState.user.id)
          .maybeSingle();
          
        if (error) {
          this.addResult('Database', 'critical', 'PROFILE_ACCESS_FAILED',
            'Cannot access user profile table',
            'Check RLS policies and user permissions');
        } else if (!profile) {
          this.addResult('Database', 'warning', 'MISSING_USER_PROFILE',
            'User has no profile record',
            'Create profile record or fix profile creation trigger');
        }
      }
      
      // Check workspace membership
      if (authState.user && authState.user.email !== 'demo@example.com') {
        const { data: membership, error } = await supabase
          .from('workspace_members')
          .select('*')
          .eq('user_id', authState.user.id)
          .maybeSingle();
          
        if (error) {
          this.addResult('Database', 'warning', 'WORKSPACE_CHECK_FAILED',
            'Cannot check workspace membership',
            'Verify workspace_members table and RLS policies');
        } else if (!membership) {
          this.addResult('Database', 'warning', 'NO_WORKSPACE_MEMBERSHIP',
            'User has no workspace membership',
            'Assign user to default workspace or create personal workspace');
        }
      }
      
    } catch (error) {
      this.addResult('Database', 'critical', 'DATABASE_CONNECTION_FAILED',
        'Failed to connect to database',
        'Check Supabase configuration and network connectivity');
    }
  }

  private async auditSecurity() {
    console.log('🔒 Auditing security configuration...');
    
    // Check for hardcoded credentials (basic scan)
    const authState = useAuthStore.getState();
    
    // Verify RLS is working by testing unauthorized access
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .single();
        
      if (!error && data) {
        this.addResult('Security', 'critical', 'RLS_NOT_ENFORCED',
          'Can access profiles without proper authentication',
          'Review and fix Row Level Security policies');
      }
    } catch (error) {
      // This is expected if RLS is working correctly
    }
    
    // Check for demo credentials in production
    if (window.location.hostname !== 'localhost' && 
        window.location.hostname.indexOf('sandbox') === -1) {
      this.addResult('Security', 'warning', 'DEMO_IN_PRODUCTION',
        'Demo credentials may be available in production',
        'Disable demo access in production environment');
    }
  }

  private async auditPerformance() {
    console.log('⚡ Auditing performance issues...');
    
    // Check for excessive auth listener subscriptions
    const authListeners = (supabase as any).realtime?.channels?.size || 0;
    if (authListeners > 5) {
      this.addResult('Performance', 'warning', 'EXCESSIVE_AUTH_LISTENERS',
        `Too many auth listeners: ${authListeners}`,
        'Clean up auth subscriptions to prevent memory leaks');
    }
    
    // Check for localStorage bloat
    if (typeof window !== 'undefined') {
      const storageSize = JSON.stringify(localStorage).length;
      if (storageSize > 1024 * 1024) { // 1MB
        this.addResult('Performance', 'info', 'LARGE_LOCALSTORAGE',
          `LocalStorage is ${Math.round(storageSize / 1024)}KB`,
          'Consider cleaning up stored data periodically');
      }
    }
  }

  private async auditDataIntegrity() {
    console.log('🔍 Auditing data integrity...');
    
    const authState = useAuthStore.getState();
    
    // Check for orphaned data
    if (authState.user && authState.user.email !== 'demo@example.com') {
      try {
        // Check if bot profiles exist without workspace
        const { data: orphanedBots } = await supabase
          .from('bot_profiles')
          .select('name, workspace_id')
          .is('workspace_id', null);
          
        if (orphanedBots && orphanedBots.length > 0) {
          this.addResult('Data Integrity', 'warning', 'ORPHANED_BOT_PROFILES',
            `Found ${orphanedBots.length} bot profiles without workspace`,
            'Clean up orphaned bot profiles or assign to workspaces');
        }
        
      } catch (error) {
        // Expected if user doesn't have access
      }
    }
  }

  private addResult(category: string, severity: 'critical' | 'warning' | 'info', 
                   issue: string, description: string, recommendation: string, fixed = false) {
    this.results.push({
      category,
      severity,
      issue,
      description,
      recommendation,
      fixed
    });
  }

  // Get summary of audit results
  getSummary() {
    const critical = this.results.filter(r => r.severity === 'critical').length;
    const warnings = this.results.filter(r => r.severity === 'warning').length;
    const info = this.results.filter(r => r.severity === 'info').length;
    const fixed = this.results.filter(r => r.fixed).length;
    
    return {
      total: this.results.length,
      critical,
      warnings,
      info,
      fixed,
      ready: critical === 0
    };
  }
}

export const systemAuditor = new SystemAuditor();