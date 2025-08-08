import { SidebarProvider, Sidebar, SidebarTrigger, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarSeparator } from "@/components/ui/sidebar";
import { NavLink } from "react-router-dom";
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
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>OneMFin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={({ isActive }) => isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/80"}>
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
      </SidebarContent>
    </Sidebar>
  );
}
