import { Outlet } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell, Plus, Calendar as CalendarIcon, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AppLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();



  const handleProfileClick = () => {
    navigate('/app/settings');
  };

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen">
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border shadow-sm">
            <div className="h-14 px-4 flex items-center gap-3">
              <SidebarTrigger />
              <div className="flex-1 max-w-xl">
                <Input placeholder="Search leads, notes, products…" className="h-9" />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" className="hidden md:inline-flex"><Plus />Quick Add</Button>
                <Button variant="outline" size="sm" className="hidden md:inline-flex"><CalendarIcon />New Meeting</Button>
                <Button variant="ghost" size="icon" aria-label="Notifications"><Bell /></Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.profile_image_url} alt={user?.full_name} />
                        <AvatarFallback>
                          {user?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user?.full_name || 'User'}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user?.email || user?.phone || 'No contact info'}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleProfileClick}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5">
                      <UserButton afterSignOutUrl="/" />
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>
          <div className="border-b bg-muted/50 p-3 text-sm flex items-center justify-between">
            <div><strong>Trial plan</strong> — 8 days left</div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="cta">Upgrade Plan</Button>
              <Button size="sm" variant="outline">View Usage</Button>
            </div>
          </div>
          <main className="p-4">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
