import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Direct imports to avoid dynamic import issues in production
import { OfflineHandler } from "@/components/OfflineHandler";
import { UserLocationTracker } from "@/components/UserLocationTracker";
import { SessionManager } from "@/components/SessionManager";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AdminDashboard } from "@/components/AdminDashboard";
import { AdminRoute } from "@/components/AdminRoute";
import Auth from "./pages/Auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import UserProfile from "./pages/UserProfile";
import CreatorApplication from "./pages/CreatorApplication";
import CreatorStudio from "./pages/CreatorStudio";
import ExplorePage from "./pages/ExplorePage";
import FollowingPage from "./pages/FollowingPage";
import MarketplacePage from "./pages/MarketplacePage";
import LocalBusinessPage from "./pages/LocalBusinessPage";
import LocalBusinessDetailsPage from "./pages/LocalBusinessDetailsPage";
import BusinessFavoritesPage from "./pages/BusinessFavoritesPage";
import CollectionsPage from "./pages/CollectionsPage";
import SubscribePage from "./pages/SubscribePage";
import PaymentConfirmation from "./pages/PaymentConfirmation";
import VIPManagementPage from "./pages/VIPManagementPage";
import MySubscriptionsPage from "./pages/MySubscriptionsPage";

import AdvertisersPage from "./pages/AdvertisersPage";
import FollowingCreatorsPage from "./pages/FollowingCreatorsPage";
import ModelChat from "./pages/ModelChat";
import ChatListPage from "./pages/ChatListPage";
import SplashScreen from "./pages/SplashScreen";
import ProfilePage from "./pages/ProfilePage";
import { VideoCallPage } from "./pages/VideoCallPage";
import AtualizacoesPage from "./pages/AtualizacoesPage";

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <OfflineHandler />
      <UserLocationTracker />
      <SessionManager />
      <BrowserRouter>
        <Routes>
          {/* Splash Screen como HOME */}
          <Route path="/" element={<SplashScreen />} />
          
          <Route path="/auth" element={<Auth />} />
          
          {/* App SEM proteção - aceita usuários anônimos */}
          <Route path="/app" element={<Index />} />
          <Route path="/tiktok" element={<Index />} />
          <Route path="/home" element={<Index />} />
          <Route path="/index" element={<Index />} />
          <Route path="/main" element={<Index />} />

          {/* Perfil do usuário */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          } />

          {/* Aplicação de Criador */}
          <Route path="/creator-application" element={
            <ProtectedRoute>
              <CreatorApplication />
            </ProtectedRoute>
          } />
          
          <Route path="/creator" element={
            <ProtectedRoute>
              <CreatorApplication />
            </ProtectedRoute>
          } />
          
          {/* Estúdio de Criador */}
          <Route path="/creator-studio" element={
            <ProtectedRoute>
              <CreatorStudio />
            </ProtectedRoute>
          } />
          
          {/* Página de Explorar */}
          <Route path="/explore" element={
            <ProtectedRoute>
              <ExplorePage />
            </ProtectedRoute>
          } />
          
          {/* Página de Seguindo */}
          <Route path="/following" element={
            <ProtectedRoute>
              <FollowingPage />
            </ProtectedRoute>
          } />
          
          {/* Página de Criadores Seguidos */}
          <Route path="/following-creators" element={<FollowingCreatorsPage />} />
          
          {/* Marketplace */}
          <Route path="/marketplace" element={<MarketplacePage />} />
          
          {/* Negócios Locais */}
          <Route path="/local-business" element={<LocalBusinessPage />} />
          <Route path="/local-businesses" element={<LocalBusinessPage />} />
          <Route path="/local-business/:businessId" element={<LocalBusinessDetailsPage />} />
          
          {/* Favoritos de Negócios Locais */}
          <Route path="/business-favorites" element={<BusinessFavoritesPage />} />
          
          {/* Coleções */}
          <Route path="/collections" element={<CollectionsPage />} />
          
          {/* Assinatura VIP */}
          <Route path="/subscribe" element={<SubscribePage />} />
          <Route path="/payment-confirmation" element={<PaymentConfirmation />} />
          <Route path="/vip-management" element={
            <ProtectedRoute>
              <VIPManagementPage />
            </ProtectedRoute>
          } />
          <Route path="/my-subscriptions" element={
            <ProtectedRoute>
              <MySubscriptionsPage />
            </ProtectedRoute>
          } />
          
          {/* Chat com Modelo ou Criador */}
          <Route path="/chat/:entityId" element={<ModelChat />} />
          
          {/* Lista de Chats - Rota alternativa para Chat IA */}
          <Route path="/ChatIA" element={<ChatListPage />} />
          <Route path="/chats" element={<ChatListPage />} />
          
          
          {/* Anunciantes */}
          <Route path="/advertisers" element={<AdvertisersPage />} />
          
          {/* Vídeo Chamada */}
          <Route path="/video-chamada" element={<VideoCallPage />} />
          
          {/* Atualizações Recentes - Changelog */}
          <Route path="/atualizacoes" element={<AtualizacoesPage />} />
          
          {/* Admin protegido por AdminRoute - apenas admins podem acessar */}
          <Route path="/admin" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
          
          {/* URL amigável para perfis - DEVE ser antes do catch-all */}
          <Route path="/:username" element={<ProfilePage />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;