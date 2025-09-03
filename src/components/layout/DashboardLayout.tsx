import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { DemoModeIndicator } from '@/components/demo/DemoModeIndicator';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background starfield">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <DemoModeIndicator />
          <TopBar />
          
          {/* Sidebar toggle for mobile */}
          <div className="lg:hidden p-2">
            <SidebarTrigger className="glow-gold" />
          </div>
          
          <main className="flex-1 p-6 overflow-auto tab-transition">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}