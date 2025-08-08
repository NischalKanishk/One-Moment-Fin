import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell, Plus, Calendar as CalendarIcon } from "lucide-react";

export default function AppLayout() {
  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen">
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
            <div className="h-14 px-4 flex items-center gap-3">
              <SidebarTrigger />
              <div className="flex-1 max-w-xl">
                <Input placeholder="Search leads, notes, products…" className="h-9" />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" className="hidden md:inline-flex"><Plus />Quick Add</Button>
                <Button variant="outline" size="sm" className="hidden md:inline-flex"><CalendarIcon />New Meeting</Button>
                <Button variant="ghost" size="icon" aria-label="Notifications"><Bell /></Button>
              </div>
            </div>
          </header>
          <main className="p-4">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
