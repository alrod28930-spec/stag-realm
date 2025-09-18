import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { DemoModeIndicator } from '@/components/demo/DemoModeIndicator';
import DemoModeBanner from '@/components/subscription/DemoModeBanner';
import TabLockGuard from '@/components/subscription/TabLockGuard';
import TierComplianceGuard from '@/components/compliance/TierComplianceGuard';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-background starfield moonlit-awareness">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <DemoModeIndicator />
          <TopBar />
          
          {/* Sidebar toggle */}
          <div className="p-2 border-b border-border">
            <SidebarTrigger className="glow-gold" />
          </div>
          
          <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto tab-transition">
            <div className="max-w-full overflow-x-auto">
              <TabLockGuard>
                <TierComplianceGuard requiresLiveTrading={false}>
                  <DemoModeBanner />
                  {children}
                </TierComplianceGuard>
              </TabLockGuard>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}