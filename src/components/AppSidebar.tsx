import { SidebarProvider, Sidebar, SidebarTrigger, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarSeparator } from "@/components/ui/sidebar";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Users, ClipboardList, Boxes, Calendar, Settings, User, FileText } from "lucide-react";

const nav = [
  { title: "Home", url: "/app/dashboard", icon: Home },
  { title: "Leads", url: "/app/leads", icon: Users },
  { title: "Assessments", url: "/app/assessments", icon: ClipboardList },
  { title: "KYC", url: "/app/kyc", icon: FileText },
  { title: "Meetings", url: "/app/meetings", icon: Calendar },
  { title: "Profile", url: "/app/profile", icon: User },
  { title: "Settings", url: "/app/settings", icon: Settings },
  { title: "Products", url: "/app/products", icon: Boxes, disabled: true, comingSoon: true },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="sidenav">
      <SidebarContent className="bg-transparent">
        <SidebarGroup>
          <SidebarGroupLabel className="sidenav-brand">
            <div className="flex items-center">
              <div className="brand-dot"></div>
              OneMFin
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => {
                const isActive = location.pathname === item.url || 
                  (item.url !== "/app/dashboard" && location.pathname.startsWith(item.url));
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild disabled={item.disabled}>
                      <NavLink 
                        to={item.url} 
                        end 
                        className={`nav-item ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        data-active={isActive ? "true" : "false"}
                        aria-current={isActive ? "page" : undefined}
                        onClick={item.disabled ? (e) => e.preventDefault() : undefined}
                      >
                        <span className="active-bar" aria-hidden="true" />
                        <item.icon className="nav-icon" aria-hidden="true" />
                        <span className="nav-label">
                          {item.title}
                          {item.comingSoon && (
                            <span className="ml-2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                              Coming soon
                            </span>
                          )}
                        </span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator className="sidenav-separator" />
      </SidebarContent>
    </Sidebar>
  );
}
