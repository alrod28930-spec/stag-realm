import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  Briefcase,
  MessageSquare,
  Bot,
  FileText,
  Baby,
  Settings,
  Shield,
  Monitor,
  Info
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

const navigationItems = [
  { title: 'Dashboard', url: '/', icon: BarChart3, description: 'Overview & analytics' },
  { title: 'Market', url: '/market', icon: TrendingUp, description: 'Real-time market data' },
  { title: 'Portfolio', url: '/portfolio', icon: Briefcase, description: 'Your positions' },
  { title: 'Analyst', url: '/analyst', icon: MessageSquare, description: 'AI trading assistant' },
  { title: 'Trade Bots', url: '/trade-bots', icon: Bot, description: 'Automated trading' },
  { title: 'Recorder', url: '/recorder', icon: FileText, description: 'Audit trail & exports' },
  { title: 'Cradle', url: '/cradle', icon: Baby, description: 'Strategy incubator' },
];

const adminItems = [
  { title: 'About', url: '/about', icon: Info, description: 'Platform overview' },
  { title: 'Settings', url: '/settings', icon: Settings, description: 'App configuration' },
  { title: 'System Monitor', url: '/system-monitor', icon: Monitor, description: 'Core scaffold health' },
  { title: 'Admin Portal', url: '/admin', icon: Shield, description: 'Admin controls', adminOnly: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, hasPermission } = useAuthStore();
  const currentPath = location.pathname;
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => {
    if (path === '/') {
      return currentPath === path;
    }
    return currentPath.startsWith(path);
  };

  const getNavClassName = (path: string) => {
    const isCurrentlyActive = isActive(path);
    return cn(
      "flex items-center gap-3 px-3 py-2 rounded-md transition-smooth group",
      isCurrentlyActive 
        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-gold border border-primary/30" 
        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground hover:shadow-gold hover:border hover:border-primary/20"
    );
  };

  const filteredAdminItems = adminItems.filter(item => {
    if (item.adminOnly) {
      return hasPermission('manage-users') || user?.role === 'Owner' || user?.role === 'Admin';
    }
    return true;
  });

  return (
    <Sidebar className={cn("border-r border-sidebar-border starfield", collapsed ? "w-16" : "w-64")}>
      <SidebarContent className="py-4">
        {/* Logo Section */}
        <div className="px-4 mb-8">
          <div className="flex items-center gap-3">
            <img 
              src="/lovable-uploads/aa502076-83e2-4336-bda8-00b2eaac7a75.png" 
              alt="StagAlgo" 
              className="w-10 h-10 object-contain"
            />
            {!collapsed && (
              <div>
                <h2 className="text-xl font-bold text-primary font-serif">StagAlgo</h2>
                <p className="text-xs text-sidebar-foreground/60 uppercase tracking-wider">Trading Platform</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wide">
            Trading Platform
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClassName(item.url)}>
                      <item.icon className="w-4 h-4 flex-shrink-0 group-hover:text-primary-glow transition-colors" />
                      {!collapsed && (
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium truncate">{item.title}</span>
                          <span className="text-xs text-sidebar-foreground/60 truncate">
                            {item.description}
                          </span>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin & Settings */}
        <SidebarGroup className="mt-8">
          <SidebarGroupLabel className="px-3 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wide">
            Administration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredAdminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClassName(item.url)}>
                      <item.icon className="w-4 h-4 flex-shrink-0 group-hover:text-primary-glow transition-colors" />
                      {!collapsed && (
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium truncate">{item.title}</span>
                          <span className="text-xs text-sidebar-foreground/60 truncate">
                            {item.description}
                          </span>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User Info in collapsed mode */}
        {collapsed && user && (
          <SidebarGroup className="mt-auto">
            <div className="px-3 py-2 text-center">
              <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center mx-auto shadow-gold">
                <span className="text-xs font-semibold text-primary-foreground">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}