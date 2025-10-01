// Comprehensive System Test and Health Check
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserWorkspace, getCurrentUser } from '@/utils/auth';
import { oracle } from './oracle';
import { useAuthStore } from '@/stores/authStore';

export interface SystemTestResult {
  category: string;
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

export interface SystemAuditReport {
  timestamp: Date;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  criticalIssues: number;
  warnings: number;
  passedTests: number;
  results: SystemTestResult[];
  recommendations: string[];
}

export class SystemTestService {
  
  async runFullAudit(): Promise<SystemAuditReport> {
    console.log('🔍 Starting comprehensive system audit...');
    
    const results: SystemTestResult[] = [];
    
    // Test Authentication
    results.push(...await this.testAuthentication());
    
    // Test Database Connectivity  
    results.push(...await this.testDatabaseConnectivity());
    
    // Test RLS Policies
    results.push(...await this.testRLSPolicies());
    
    // Test Backend Services
    results.push(...await this.testBackendServices());
    
    // Test Frontend-Backend Integration
    results.push(...await this.testFrontendBackendIntegration());
    
    // Test Real-time Features
    results.push(...await this.testRealtimeFeatures());
    
    // Analyze results
    const critical = results.filter(r => r.status === 'fail').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    const passed = results.filter(r => r.status === 'pass').length;
    
    const overallHealth = critical > 0 ? 'critical' : warnings > 2 ? 'degraded' : 'healthy';
    
    const recommendations = this.generateRecommendations(results);
    
    return {
      timestamp: new Date(),
      overallHealth,
      criticalIssues: critical,
      warnings,
      passedTests: passed,
      results,
      recommendations
    };
  }
  
  private async testAuthentication(): Promise<SystemTestResult[]> {
    const results: SystemTestResult[] = [];
    
    try {
      // Test user session
      const user = await getCurrentUser();
      results.push({
        category: 'Authentication',
        test: 'User Session',
        status: user ? 'pass' : 'fail',
        message: user ? 'User authenticated successfully' : 'No authenticated user found',
        details: { userId: user?.id, email: user?.email }
      });
      
      // Test workspace access
      const workspace = await getCurrentUserWorkspace();
      results.push({
        category: 'Authentication',
        test: 'Workspace Access',
        status: workspace ? 'pass' : 'fail',
        message: workspace ? 'User workspace found' : 'No workspace found for user',
        details: { workspaceId: workspace }
      });
      
    } catch (error) {
      results.push({
        category: 'Authentication',
        test: 'Auth System',
        status: 'fail',
        message: 'Authentication system error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
    
    return results;
  }
  
  private async testDatabaseConnectivity(): Promise<SystemTestResult[]> {
    const results: SystemTestResult[] = [];
    
    try {
      // Test basic connectivity
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      results.push({
        category: 'Database',
        test: 'Basic Connectivity',
        status: error ? 'fail' : 'pass',
        message: error ? 'Database connection failed' : 'Database connected successfully',
        details: { error: error?.message }
      });
      
      // Test workspace tables
      const workspace = await getCurrentUserWorkspace();
      if (workspace) {
        // Test oracle_signals table
        try {
          const { error: oracleError } = await supabase
            .from('oracle_signals')
            .select('*')
            .eq('workspace_id', workspace)
            .limit(1);
            
          results.push({
            category: 'Database',
            test: 'Table Access: oracle_signals',
            status: oracleError ? 'fail' : 'pass',
            message: oracleError ? 'Cannot access oracle_signals' : 'oracle_signals accessible',
            details: { error: oracleError?.message }
          });
        } catch (err) {
          results.push({
            category: 'Database',
            test: 'Table Access: oracle_signals',
            status: 'fail',
            message: 'Error accessing oracle_signals',
            details: { error: err instanceof Error ? err.message : 'Unknown' }
          });
        }

        // Test portfolio_current table
        try {
          const { error: portfolioError } = await supabase
            .from('portfolio_current')
            .select('*')
            .eq('workspace_id', workspace)
            .limit(1);
            
          results.push({
            category: 'Database',
            test: 'Table Access: portfolio_current',
            status: portfolioError ? 'fail' : 'pass',
            message: portfolioError ? 'Cannot access portfolio_current' : 'portfolio_current accessible',
            details: { error: portfolioError?.message }
          });
        } catch (err) {
          results.push({
            category: 'Database',
            test: 'Table Access: portfolio_current',
            status: 'fail',
            message: 'Error accessing portfolio_current',
            details: { error: err instanceof Error ? err.message : 'Unknown' }
          });
        }

        // Test positions_current table
        try {
          const { error: positionsError } = await supabase
            .from('positions_current')
            .select('*')
            .eq('workspace_id', workspace)
            .limit(1);
            
          results.push({
            category: 'Database',
            test: 'Table Access: positions_current',
            status: positionsError ? 'fail' : 'pass',
            message: positionsError ? 'Cannot access positions_current' : 'positions_current accessible',
            details: { error: positionsError?.message }
          });
        } catch (err) {
          results.push({
            category: 'Database',
            test: 'Table Access: positions_current',
            status: 'fail',
            message: 'Error accessing positions_current',
            details: { error: err instanceof Error ? err.message : 'Unknown' }
          });
        }
      }
      
    } catch (error) {
      results.push({
        category: 'Database',
        test: 'Database System',
        status: 'fail',
        message: 'Database system error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
    
    return results;
  }
  
  private async testRLSPolicies(): Promise<SystemTestResult[]> {
    const results: SystemTestResult[] = [];
    
    try {
      const workspace = await getCurrentUserWorkspace();
      if (!workspace) {
        results.push({
          category: 'Security',
          test: 'RLS Policies',
          status: 'fail',
          message: 'Cannot test RLS - no workspace',
          details: {}
        });
        return results;
      }
      
      // Test oracle_signals RLS
      try {
        const { error } = await supabase
          .from('oracle_signals')
          .insert({
            workspace_id: workspace,
            symbol: 'TEST',
            tf: '1D',
            ts: new Date().toISOString(),
            name: 'test',
            value: 0.5,
            payload: {
              direction: 0,
              summary: 'Test signal',
              sources: ['test']
            }
          } as any);
          
        results.push({
          category: 'Security',
          test: 'Oracle Signals RLS',
          status: error ? 'fail' : 'pass',
          message: error ? 'RLS policy blocking insert' : 'RLS policy allows valid insert',
          details: { error: error?.message }
        });
        
        // Clean up test record
        if (!error) {
          await supabase.from('oracle_signals').delete().eq('source', 'test');
        }
      } catch (err) {
        results.push({
          category: 'Security',
          test: 'Oracle Signals RLS',
          status: 'fail',
          message: 'RLS test failed',
          details: { error: err instanceof Error ? err.message : 'Unknown' }
        });
      }
      
    } catch (error) {
      results.push({
        category: 'Security',
        test: 'RLS System',
        status: 'fail',
        message: 'RLS system error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
    
    return results;
  }
  
  private async testBackendServices(): Promise<SystemTestResult[]> {
    const results: SystemTestResult[] = [];
    
    // Test Oracle Service
    try {
      const signals = oracle.getSignals(1);
      results.push({
        category: 'Backend Services',
        test: 'Oracle Service',
        status: 'pass',
        message: 'Oracle service responding',
        details: { signalCount: signals.length }
      });
      
      // Test Oracle database integration
      try {
        const dbSignals = await oracle.getSignalsFromDb(1);
        results.push({
          category: 'Backend Services',
          test: 'Oracle DB Integration',
          status: 'pass',
          message: 'Oracle database integration working',
          details: { dbSignalCount: dbSignals.length }
        });
      } catch (err) {
        results.push({
          category: 'Backend Services',
          test: 'Oracle DB Integration',
          status: 'warning',
          message: 'Oracle database integration issues',
          details: { error: err instanceof Error ? err.message : 'Unknown' }
        });
      }
    } catch (error) {
      results.push({
        category: 'Backend Services',
        test: 'Oracle Service',
        status: 'fail',
        message: 'Oracle service error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
    
    return results;
  }
  
  private async testFrontendBackendIntegration(): Promise<SystemTestResult[]> {
    const results: SystemTestResult[] = [];
    
    // Test auth store
    const authStore = useAuthStore.getState();
    results.push({
      category: 'Frontend Integration',
      test: 'Auth Store',
      status: authStore.isAuthenticated ? 'pass' : 'fail',
      message: authStore.isAuthenticated ? 'Auth store has valid session' : 'Auth store not authenticated',
      details: { 
        isAuthenticated: authStore.isAuthenticated,
        hasUser: !!authStore.user,
        isLoading: authStore.isLoading 
      }
    });
    
    return results;
  }
  
  private async testRealtimeFeatures(): Promise<SystemTestResult[]> {
    const results: SystemTestResult[] = [];
    
    // Test realtime connectivity
    try {
      const channel = supabase.channel('test-channel');
      const subscribed = new Promise((resolve) => {
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            resolve(true);
          }
        });
        
        // Timeout after 5 seconds
        setTimeout(() => resolve(false), 5000);
      });
      
      const isSubscribed = await subscribed;
      supabase.removeChannel(channel);
      
      results.push({
        category: 'Real-time',
        test: 'Channel Subscription',
        status: isSubscribed ? 'pass' : 'warning',
        message: isSubscribed ? 'Real-time channels working' : 'Real-time subscription timeout',
        details: { subscribed: isSubscribed }
      });
      
    } catch (error) {
      results.push({
        category: 'Real-time',
        test: 'Real-time System',
        status: 'fail',
        message: 'Real-time system error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
    
    return results;
  }
  
  private generateRecommendations(results: SystemTestResult[]): string[] {
    const recommendations: string[] = [];
    
    const failedTests = results.filter(r => r.status === 'fail');
    const warningTests = results.filter(r => r.status === 'warning');
    
    if (failedTests.some(t => t.category === 'Authentication')) {
      recommendations.push('Fix authentication system - ensure users can log in and access workspaces');
    }
    
    if (failedTests.some(t => t.category === 'Database')) {
      recommendations.push('Resolve database connectivity issues - check RLS policies and network access');
    }
    
    if (failedTests.some(t => t.category === 'Security')) {
      recommendations.push('Review and fix RLS policies - ensure proper data access controls');
    }
    
    if (failedTests.some(t => t.test.includes('Oracle'))) {
      recommendations.push('Fix Oracle service database integration - signals not persisting correctly');
    }
    
    if (warningTests.length > 0) {
      recommendations.push('Address system warnings to improve stability and performance');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('System is healthy - continue monitoring for optimal performance');
    }
    
    return recommendations;
  }
  
  printReport(report: SystemAuditReport): void {
    console.log('\n🔍 SYSTEM AUDIT REPORT');
    console.log('═'.repeat(50));
    console.log(`Timestamp: ${report.timestamp.toLocaleString()}`);
    console.log(`Overall Health: ${report.overallHealth.toUpperCase()}`);
    console.log(`Critical Issues: ${report.criticalIssues}`);
    console.log(`Warnings: ${report.warnings}`);
    console.log(`Passed Tests: ${report.passedTests}`);
    console.log('');
    
    // Group results by category
    const byCategory = report.results.reduce((acc, result) => {
      if (!acc[result.category]) acc[result.category] = [];
      acc[result.category].push(result);
      return acc;
    }, {} as Record<string, SystemTestResult[]>);
    
    Object.entries(byCategory).forEach(([category, tests]) => {
      console.log(`📂 ${category}:`);
      tests.forEach(test => {
        const icon = test.status === 'pass' ? '✅' : test.status === 'warning' ? '⚠️' : '❌';
        console.log(`   ${icon} ${test.test}: ${test.message}`);
      });
      console.log('');
    });
    
    console.log('💡 RECOMMENDATIONS:');
    report.recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec}`);
    });
    console.log('═'.repeat(50));
  }
}

export const systemTest = new SystemTestService();