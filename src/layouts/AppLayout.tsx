import { Outlet, useLocation } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell, Clock, CheckCircle, AlertCircle, MessageSquare, Calendar, TrendingUp } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// Mock notification data - replace with real data from your backend
const mockNotifications = [
  {
    id: 1,
    type: 'lead',
    title: 'New lead added',
    description: 'John Doe has been added to your leads',
    time: '2 minutes ago',
    read: false,
    icon: <TrendingUp className="h-4 w-4 text-primary" />
  },
  {
    id: 2,
    type: 'meeting',
    title: 'Meeting scheduled',
    description: 'Meeting with Jane Smith scheduled for tomorrow at 2 PM',
    time: '1 hour ago',
    read: false,
    icon: <Calendar className="h-4 w-4 text-green-500" />
  },
  {
    id: 3,
    type: 'meeting',
    title: 'Meeting scheduled',
    description: 'Meeting scheduled with Sarah Wilson',
    time: '3 hours ago',
    read: true,
    icon: <Calendar className="h-4 w-4 text-emerald-500" />
  },
  {
    id: 4,
    type: 'assessment',
    title: 'Risk assessment done',
    description: 'Risk assessment completed for Mike Johnson',
    time: '5 hours ago',
    read: true,
    icon: <AlertCircle className="h-4 w-4 text-orange-500" />
  },
  {
    id: 5,
    type: 'message',
    title: 'New message',
    description: 'You have a new message from your team lead',
    time: '1 day ago',
    read: true,
    icon: <MessageSquare className="h-4 w-4 text-purple-500" />
  }
];

export default function AppLayout() {
  const location = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Check if current page should show the Trial plan bar
  const shouldShowTrialBar = () => {
    const currentPath = location.pathname;
    return currentPath === '/app/profile' || 
           currentPath === '/app/dashboard';
  };

  const markAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

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
                {/* Notifications Button */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  aria-label="Notifications"
                  onClick={() => setNotificationsOpen(true)}
                  className="relative"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Button>
                
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
          
          {shouldShowTrialBar() && (
            <div className="border-b bg-muted/50 p-3 text-sm flex items-center justify-between">
              <div><strong>Trial plan</strong> — 8 days left</div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="primary">Upgrade Plan</Button>
                <Button size="sm" variant="outline">View Usage</Button>
              </div>
            </div>
          )}
          
          <main className="py-8 md:py-10 px-4">
            <Outlet />
          </main>
        </SidebarInset>
      </div>

      {/* Notifications Modal */}
      <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <DialogContent className="max-w-md max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Notifications</DialogTitle>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    Mark all read
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      notification.read 
                        ? 'bg-background hover:bg-muted/50' 
                        : 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="mt-0.5">
                      {notification.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <p className={`text-sm font-medium ${
                          notification.read ? 'text-foreground' : 'text-primary-foreground'
                        }`}>
                          {notification.title}
                        </p>
                        <span className="text-xs text-muted-foreground ml-2">
                          {notification.time}
                        </span>
                      </div>
                      <p className={`text-sm mt-1 ${
                        notification.read ? 'text-muted-foreground' : 'text-primary-foreground/80'
                      }`}>
                        {notification.description}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
