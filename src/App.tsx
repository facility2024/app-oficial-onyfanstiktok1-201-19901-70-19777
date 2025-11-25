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
const AdminRoute = lazy(() => import("@/components/AdminRoute").then(m => ({ default: m.AdminRoute })));
const Auth = lazy(() => import("./pages/Auth"));
const ProtectedRoute = lazy(() => import("@/components/ProtectedRoute").then(m => ({ default: m.ProtectedRoute })));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const CreatorApplication = lazy(() => import("./pages/CreatorApplication"));
const CreatorStudio = lazy(() => import("./pages/CreatorStudio"));
const ExplorePage = lazy(() => import("./pages/ExplorePage"));
const FollowingPage = lazy(() => import("./pages/FollowingPage"));
const MarketplacePage = lazy(() => import("./pages/MarketplacePage"));
const LocalBusinessPage = lazy(() => import("./pages/LocalBusinessPage"));
const CollectionsPage = lazy(() => import("./pages/CollectionsPage"));
const SubscriptionsPage = lazy(() => import("./pages/SubscriptionsPage"));
const AdvertisersPage = lazy(() => import("./pages/AdvertisersPage"));
const FollowingCreatorsPage = lazy(() => import("./pages/FollowingCreatorsPage"));

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

// Lazy load SplashScreen
const SplashScreen = lazy(() => import("./pages/SplashScreen"));

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
          {/* Splash Screen como HOME */}
          <Route path="/" element={
            <Suspense fallback={<ComponentFallback />}>
              <SplashScreen />
            </Suspense>
          } />
          
          <Route path="/auth" element={
            <Suspense fallback={<ComponentFallback />}>
              <Auth />
            </Suspense>
          } />
          
          {/* App SEM proteção - aceita usuários anônimos */}
          <Route path="/app" element={
            <Suspense fallback={<ComponentFallback />}>
              <Index />
            </Suspense>
          } />
          
          <Route path="/tiktok" element={
            <Suspense fallback={<ComponentFallback />}>
              <Index />
            </Suspense>
          } />
          
          <Route path="/home" element={
            <Suspense fallback={<ComponentFallback />}>
              <Index />
            </Suspense>
          } />
          
          <Route path="/index" element={
            <Suspense fallback={<ComponentFallback />}>
              <Index />
            </Suspense>
          } />
          
          <Route path="/main" element={
            <Suspense fallback={<ComponentFallback />}>
              <Index />
            </Suspense>
          } />

          {/* Perfil do usuário */}
          <Route path="/profile" element={
            <Suspense fallback={<ComponentFallback />}>
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            </Suspense>
          } />

          {/* Aplicação de Criador */}
          <Route path="/creator-application" element={
            <Suspense fallback={<ComponentFallback />}>
              <ProtectedRoute>
                <CreatorApplication />
              </ProtectedRoute>
            </Suspense>
          } />
          
          <Route path="/creator" element={
            <Suspense fallback={<ComponentFallback />}>
              <ProtectedRoute>
                <CreatorApplication />
              </ProtectedRoute>
            </Suspense>
          } />
          
          {/* Estúdio de Criador */}
          <Route path="/creator-studio" element={
            <Suspense fallback={<ComponentFallback />}>
              <ProtectedRoute>
                <CreatorStudio />
              </ProtectedRoute>
            </Suspense>
          } />
          
          {/* Página de Explorar */}
          <Route path="/explore" element={
            <Suspense fallback={<ComponentFallback />}>
              <ProtectedRoute>
                <ExplorePage />
              </ProtectedRoute>
            </Suspense>
          } />
          
          {/* Página de Seguindo */}
          <Route path="/following" element={
            <Suspense fallback={<ComponentFallback />}>
              <ProtectedRoute>
                <FollowingPage />
              </ProtectedRoute>
            </Suspense>
          } />
          
          {/* Página de Criadores Seguidos */}
          <Route path="/following-creators" element={
            <Suspense fallback={<ComponentFallback />}>
              <FollowingCreatorsPage />
            </Suspense>
          } />
          
          {/* Marketplace */}
          <Route path="/marketplace" element={
            <Suspense fallback={<ComponentFallback />}>
              <MarketplacePage />
            </Suspense>
          } />
          
          {/* Negócios Locais */}
          <Route path="/local-business" element={
            <Suspense fallback={<ComponentFallback />}>
              <LocalBusinessPage />
            </Suspense>
          } />
          
          <Route path="/local-businesses" element={
            <Suspense fallback={<ComponentFallback />}>
              <LocalBusinessPage />
            </Suspense>
          } />
          
          {/* Coleções */}
          <Route path="/collections" element={
            <Suspense fallback={<ComponentFallback />}>
              <CollectionsPage />
            </Suspense>
          } />
          
          {/* Assinaturas */}
          <Route path="/subscriptions" element={
            <Suspense fallback={<ComponentFallback />}>
              <SubscriptionsPage />
            </Suspense>
          } />
          
          {/* Anunciantes */}
          <Route path="/advertisers" element={
            <Suspense fallback={<ComponentFallback />}>
              <AdvertisersPage />
            </Suspense>
          } />
          
          {/* Admin protegido por AdminRoute - apenas admins podem acessar */}
          <Route path="/admin" element={
            <Suspense fallback={<ComponentFallback />}>
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
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
