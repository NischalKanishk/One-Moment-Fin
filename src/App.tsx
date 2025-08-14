import { Helmet, HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthRedirectHandler } from "./components/AuthRedirectHandler";
import ChartThemeProvider from "./components/charts/ThemeProvider";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/app/Dashboard";
import ActionDashboard from "./pages/app/ActionDashboard";
import Leads from "./pages/app/Leads";
import LeadDetail from "./pages/app/LeadDetail";
import SmartSummary from "./pages/app/SmartSummary";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import FormBuilder from "./pages/app/FormBuilder";
import Assessments from "./pages/app/Assessments";
import AssessmentsV2 from "./pages/app/AssessmentsV2";

import Meetings from "./pages/app/Meetings";
import Profile from "./pages/app/Profile";

import PublicAssessment from "./pages/PublicAssessment";
import AssessmentComplete from "./pages/AssessmentComplete";
import AssessmentForms from "./pages/app/AssessmentForms";
import AssessmentTest from "./pages/AssessmentTest";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ChartThemeProvider>
        <TooltipProvider>
          <Helmet>
            <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : 'https://onemfin.app'} />
          </Helmet>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthRedirectHandler />
            <Routes>
                     <Route path="/" element={<Index />} />

                     {/* Auth routes */}
                     <Route path="/auth" element={<Auth />} />
                     <Route path="/signup" element={<Signup />} />

                     {/* Public assessment routes */}
                     <Route path="/r/:referralCode" element={<PublicAssessment />} />
                     <Route path="/a/:slug" element={<PublicAssessment />} />
                     <Route path="/a/:slug/test" element={<AssessmentTest />} />
                     <Route path="/assessment/:assessmentCode" element={<PublicAssessment />} />
                     <Route path="/assessment-test/:slug" element={<AssessmentTest />} />
                     <Route path="/assessment-complete" element={<AssessmentComplete />} />

                     {/* Full screen assessment forms route */}
                     <Route path="/app/assessment/forms" element={
                       <ProtectedRoute>
                         <AssessmentForms />
                       </ProtectedRoute>
                     } />

                     {/* Full screen Smart Summary route */}
                     <Route path="/smart-summary/:id" element={
                       <ProtectedRoute>
                         <SmartSummary />
                       </ProtectedRoute>
                     } />

              {/* Protected app routes */}
              <Route path="/app" element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="action-dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="action-dashboard" element={<ActionDashboard />} />
                <Route path="leads" element={<Leads />} />
                <Route path="leads/:id" element={<LeadDetail />} />
                <Route path="form-builder" element={<FormBuilder />} />
                <Route path="assessments" element={<AssessmentsV2 />} />
                <Route path="assessments-legacy" element={<Assessments />} />
        
                <Route path="meetings" element={<Meetings />} />
                <Route path="profile" element={<Profile />} />

              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ChartThemeProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
