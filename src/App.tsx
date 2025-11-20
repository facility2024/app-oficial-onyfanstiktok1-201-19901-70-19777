import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";

// Lazy load components for better mobile performance
const PWAInstallPrompt = lazy(() => import("@/components/PWAInstallPrompt").then(m => ({ default: m.PWAInstallPrompt })));
const OfflineHandler = lazy(() => import("@/components/OfflineHandler").then(m => ({ default: m.OfflineHandler })));
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminDashboard = lazy(() => import("@/components/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const Auth = lazy(() => import("./pages/Auth"));
const ProtectedRoute = lazy(() => import("@/components/ProtectedRoute").then(m => ({ default: m.ProtectedRoute })));

// Optimize QueryClient for mobile performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1, // Reduce retries for faster mobile experience
      refetchOnWindowFocus: false,
    },
  },
});

// Loading fallback for lazy components
const ComponentFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-black">
    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Suspense fallback={<ComponentFallback />}>
        <PWAInstallPrompt />
        <OfflineHandler />
      </Suspense>
      <BrowserRouter>
        <Routes>
          {/* Rota de autenticação como HOME */}
          <Route path="/" element={
            <Suspense fallback={<ComponentFallback />}>
              <Auth />
            </Suspense>
          } />
          
          <Route path="/auth" element={
            <Suspense fallback={<ComponentFallback />}>
              <Auth />
            </Suspense>
          } />
          
          {/* Rotas protegidas do app */}
          <Route path="/app" element={
            <Suspense fallback={<ComponentFallback />}>
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            </Suspense>
          } />
          
          <Route path="/tiktok" element={
            <Suspense fallback={<ComponentFallback />}>
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            </Suspense>
          } />
          
          <Route path="/home" element={
            <Suspense fallback={<ComponentFallback />}>
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            </Suspense>
          } />
          
          <Route path="/index" element={
            <Suspense fallback={<ComponentFallback />}>
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            </Suspense>
          } />
          
          <Route path="/main" element={
            <Suspense fallback={<ComponentFallback />}>
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            </Suspense>
          } />

          {/* Admin continua protegido por seu próprio sistema */}
          <Route path="/admin" element={
            <Suspense fallback={<ComponentFallback />}>
              <AdminDashboard />
            </Suspense>
          } />
          
          <Route path="*" element={
            <Suspense fallback={<ComponentFallback />}>
              <NotFound />
            </Suspense>
          } />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
