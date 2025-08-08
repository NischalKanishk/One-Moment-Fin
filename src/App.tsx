import { Helmet, HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { testSupabaseConnection } from "./lib/test-connection";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/app/Dashboard";
import Leads from "./pages/app/Leads";
import LeadDetail from "./pages/app/LeadDetail";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import FormBuilder from "./pages/app/FormBuilder";
import Assessments from "./pages/app/Assessments";
import Products from "./pages/app/Products";
import Meetings from "./pages/app/Meetings";
import Portfolio from "./pages/app/Portfolio";
import Reports from "./pages/app/Reports";
import Settings from "./pages/app/Settings";
import Admin from "./pages/app/Admin";

const queryClient = new QueryClient();

// Test Supabase connection on app start
testSupabaseConnection();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Helmet>
            <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : 'https://onemfin.app'} />
          </Helmet>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />

              <Route path="/app" element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="leads" element={<Leads />} />
                <Route path="leads/:id" element={<LeadDetail />} />
                <Route path="form-builder" element={<FormBuilder />} />
                <Route path="assessments" element={<Assessments />} />
                <Route path="products" element={<Products />} />
                <Route path="meetings" element={<Meetings />} />
                <Route path="portfolio" element={<Portfolio />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
                <Route path="admin" element={<Admin />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
