import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "./PageTransition";

// Lazy load components for better mobile performance
const PWAInstallPrompt = lazy(() => import("@/components/PWAInstallPrompt").then(m => ({ default: m.PWAInstallPrompt })));
const OfflineHandler = lazy(() => import("@/components/OfflineHandler").then(m => ({ default: m.OfflineHandler })));
const Index = lazy(() => import("../pages/Index"));
const NotFound = lazy(() => import("../pages/NotFound"));
const AdminDashboard = lazy(() => import("@/components/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const AdminRoute = lazy(() => import("@/components/AdminRoute").then(m => ({ default: m.AdminRoute })));
const Auth = lazy(() => import("../pages/Auth"));
const ProtectedRoute = lazy(() => import("@/components/ProtectedRoute").then(m => ({ default: m.ProtectedRoute })));
const UserProfile = lazy(() => import("../pages/UserProfile"));
const CreatorApplication = lazy(() => import("../pages/CreatorApplication"));
const CreatorStudio = lazy(() => import("../pages/CreatorStudio"));
const ExplorePage = lazy(() => import("../pages/ExplorePage"));
const FollowingPage = lazy(() => import("../pages/FollowingPage"));
const MarketplacePage = lazy(() => import("../pages/MarketplacePage"));
const LocalBusinessPage = lazy(() => import("../pages/LocalBusinessPage"));
const CollectionsPage = lazy(() => import("../pages/CollectionsPage"));
const SubscriptionsPage = lazy(() => import("../pages/SubscriptionsPage"));
const AdvertisersPage = lazy(() => import("../pages/AdvertisersPage"));
const FollowingCreatorsPage = lazy(() => import("../pages/FollowingCreatorsPage"));
const SplashScreen = lazy(() => import("../pages/SplashScreen"));

// Loading fallback for lazy components
const ComponentFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-black">
    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
  </div>
);

export const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <>
      <Suspense fallback={<ComponentFallback />}>
        <PWAInstallPrompt />
        <OfflineHandler />
      </Suspense>
      
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Splash Screen como HOME */}
          <Route path="/" element={
            <Suspense fallback={<ComponentFallback />}>
              <PageTransition>
                <SplashScreen />
              </PageTransition>
            </Suspense>
          } />
          
          <Route path="/auth" element={
            <Suspense fallback={<ComponentFallback />}>
              <PageTransition>
                <Auth />
              </PageTransition>
            </Suspense>
          } />
          
          {/* App SEM proteção - aceita usuários anônimos */}
          <Route path="/app" element={
            <Suspense fallback={<ComponentFallback />}>
              <PageTransition>
                <Index />
              </PageTransition>
            </Suspense>
          } />
          
          <Route path="/tiktok" element={
            <Suspense fallback={<ComponentFallback />}>
              <PageTransition>
                <Index />
              </PageTransition>
            </Suspense>
          } />
          
          <Route path="/home" element={
            <Suspense fallback={<ComponentFallback />}>
              <PageTransition>
                <Index />
              </PageTransition>
            </Suspense>
          } />
          
          <Route path="/index" element={
            <Suspense fallback={<ComponentFallback />}>
              <PageTransition>
                <Index />
              </PageTransition>
            </Suspense>
          } />
          
          <Route path="/main" element={
            <Suspense fallback={<ComponentFallback />}>
              <PageTransition>
                <Index />
              </PageTransition>
            </Suspense>
          } />

          {/* Perfil do usuário */}
          <Route path="/profile" element={
            <Suspense fallback={<ComponentFallback />}>
              <PageTransition>
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              </PageTransition>
            </Suspense>
          } />

          {/* Aplicação de Criador */}
          <Route path="/creator-application" element={
            <Suspense fallback={<ComponentFallback />}>
              <PageTransition>
                <ProtectedRoute>
                  <CreatorApplication />
                </ProtectedRoute>
              </PageTransition>
            </Suspense>
          } />
          
          <Route path="/creator" element={
            <Suspense fallback={<ComponentFallback />}>
              <PageTransition>
                <ProtectedRoute>
                  <CreatorApplication />
                </ProtectedRoute>
              </PageTransition>
            </Suspense>
          } />
          
          {/* Estúdio de Criador */}
          <Route path="/creator-studio" element={
            <Suspense fallback={<ComponentFallback />}>
              <PageTransition>
                <ProtectedRoute>
                  <CreatorStudio />
                </ProtectedRoute>
              </PageTransition>
            </Suspense>
          } />
          
          {/* Página de Explorar */}
          <Route path="/explore" element={
            <Suspense fallback={<ComponentFallback />}>
              <PageTransition>
                <ProtectedRoute>
                  <ExplorePage />
                </ProtectedRoute>
              </PageTransition>
            </Suspense>
          } />
          
          {/* Página de Seguindo */}
          <Route path="/following" element={
            <Suspense fallback={<ComponentFallback />}>
              <PageTransition>
                <ProtectedRoute>
                  <FollowingPage />
                </ProtectedRoute>
              </PageTransition>
            </Suspense>
          } />
          
          {/* Página de Criadores Seguidos */}
          <Route path="/following-creators" element={
            <Suspense fallback={<ComponentFallback />}>
              <PageTransition>
                <FollowingCreatorsPage />
              </PageTransition>
            </Suspense>
          } />
          
          {/* Marketplace */}
          <Route path="/marketplace" element={
            <Suspense fallback={<ComponentFallback />}>
              <PageTransition>
                <MarketplacePage />
              </PageTransition>
            </Suspense>
          } />
          
          {/* Negócios Locais */}
          <Route path="/local-business" element={
            <Suspense fallback={<ComponentFallback />}>
              <PageTransition>
                <LocalBusinessPage />
              </PageTransition>
            </Suspense>
          } />
          
          <Route path="/local-businesses" element={
            <Suspense fallback={<ComponentFallback />}>
              <PageTransition>
                <LocalBusinessPage />
              </PageTransition>
            </Suspense>
          } />
          
          {/* Coleções */}
          <Route path="/collections" element={
            <Suspense fallback={<ComponentFallback />}>
              <PageTransition>
                <CollectionsPage />
              </PageTransition>
            </Suspense>
          } />
          
          {/* Assinaturas */}
          <Route path="/subscriptions" element={
            <Suspense fallback={<ComponentFallback />}>
              <PageTransition>
                <SubscriptionsPage />
              </PageTransition>
            </Suspense>
          } />
          
          {/* Anunciantes */}
          <Route path="/advertisers" element={
            <Suspense fallback={<ComponentFallback />}>
              <PageTransition>
                <AdvertisersPage />
              </PageTransition>
            </Suspense>
          } />
          
          {/* Admin protegido por AdminRoute - apenas admins podem acessar */}
          <Route path="/admin" element={
            <Suspense fallback={<ComponentFallback />}>
              <PageTransition>
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              </PageTransition>
            </Suspense>
          } />
          
          <Route path="*" element={
            <Suspense fallback={<ComponentFallback />}>
              <PageTransition>
                <NotFound />
              </PageTransition>
            </Suspense>
          } />
        </Routes>
      </AnimatePresence>
    </>
  );
};
