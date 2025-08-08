import { SidebarProvider, Sidebar, SidebarTrigger, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarSeparator } from "@/components/ui/sidebar";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Users, ClipboardList, Boxes, Calendar, PieChart, BarChart3, Settings, Shield } from "lucide-react";

const nav = [
  { title: "Home", url: "/app/dashboard", icon: Home },
  { title: "Leads", url: "/app/leads", icon: Users },
  { title: "Assessments", url: "/app/assessments", icon: ClipboardList },
  { title: "Products", url: "/app/products", icon: Boxes },
  { title: "Meetings", url: "/app/meetings", icon: Calendar },
  { title: "Portfolio", url: "/app/portfolio", icon: PieChart },
  { title: "Reports", url: "/app/reports", icon: BarChart3 },
  { title: "Settings", url: "/app/settings", icon: Settings },
  { title: "Admin", url: "/app/admin", icon: Shield },
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
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        end 
                        className="nav-item"
                        data-active={isActive ? "true" : "false"}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <span className="active-bar" aria-hidden="true" />
                        <item.icon className="nav-icon" aria-hidden="true" />
                        <span className="nav-label">{item.title}</span>
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
