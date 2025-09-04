import { Outlet, useLocation } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

export default function AppLayout() {
  const location = useLocation();

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen">
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border shadow-sm">
            <div className="h-14 px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <div className="max-w-xl">
                  <Input placeholder="Search leads, notes, products…" className="h-9" />
                </div>
              </div>
              
              {/* Right side elements - extreme right aligned */}
              <div className="flex items-center gap-4">
                {/* Notifications Bell */}
                <NotificationBell />
                
                {/* Clerk UserButton */}
                <UserButton 
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "h-8 w-8",
                      userButtonAvatarImage: "h-8 w-8 rounded-full"
                    }
                  }}
                />
              </div>
            </div>
          </header>

          <main className="pt-0 pb-8 md:pb-10 px-4">
            <Outlet />
          </main>
        </SidebarInset>
      </div>

    </SidebarProvider>
  );
}
