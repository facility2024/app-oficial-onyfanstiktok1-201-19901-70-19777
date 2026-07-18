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
import AgeGate from "./components/AgeGate";
import ProfilePage from "./pages/ProfilePage";
import { VideoCallPage } from "./pages/VideoCallPage";
import AtualizacoesPage from "./pages/AtualizacoesPage";
import ExclusividadeLogin from "./pages/ExclusividadeLogin";
import ExclusividadeConteudo from "./pages/ExclusividadeConteudo";
import LojaPage from "./pages/LojaPage";
import LojaProdutoPage from "./pages/LojaProdutoPage";
import PostagemPage from "./pages/PostagemPage";
import CheckoutPage from "./pages/CheckoutPage";
import CheckoutTemplatePage from "./pages/CheckoutTemplatePage";
import CreateStorePage from "./pages/CreateStorePage";
import ShopkeeperDashboard from "./pages/ShopkeeperDashboard";
import StoreProfilePage from "./pages/StoreProfilePage";
import MarketplaceStoresPage from "./pages/MarketplaceStoresPage";
import StoreCartPage from "./pages/StoreCartPage";
import AdsGarotasTopPage from "./pages/AdsGarotasTopPage";
import GarotasTopVipPage from "./pages/GarotasTopVipPage";
import IndicadorCadastro from "./pages/IndicadorCadastro";
import IndicadorArea from "./pages/IndicadorArea";
import InstagramProfilePage from "./pages/InstagramProfilePage";
import InstagramModelFeed from "./pages/InstagramModelFeed";
import { CartProvider } from "./contexts/CartContext";

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
    <CartProvider>
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
          <Route path="/indicador/cadastro" element={<IndicadorCadastro />} />
          <Route path="/indicador" element={<IndicadorArea />} />
          
          {/* App SEM proteção - aceita usuários anônimos */}
          <Route path="/app" element={<AgeGate><Index /></AgeGate>} />
          <Route path="/tiktok" element={<AgeGate><Index /></AgeGate>} />
          <Route path="/home" element={<AgeGate><Index /></AgeGate>} />
          <Route path="/index" element={<AgeGate><Index /></AgeGate>} />
          <Route path="/main" element={<AgeGate><Index /></AgeGate>} />
          <Route path="/garotas-top-vip" element={<GarotasTopVipPage />} />

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
          <Route path="/marketplace/lojas" element={<MarketplaceStoresPage />} />
          <Route path="/marketplace/criar-loja" element={
            <ProtectedRoute>
              <CreateStorePage />
            </ProtectedRoute>
          } />
          <Route path="/marketplace/loja/:slug" element={<StoreProfilePage />} />
          <Route path="/marketplace/carrinho" element={<StoreCartPage />} />
          
          {/* Dashboard do Lojista */}
          <Route path="/minha-loja" element={
            <ProtectedRoute>
              <ShopkeeperDashboard />
            </ProtectedRoute>
          } />
          
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
          <Route path="/checkout" element={
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
          } />
          <Route path="/checkout/:slug" element={<CheckoutTemplatePage />} />

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
          
          {/* Área Exclusiva */}
          <Route path="/exclusividade" element={<ExclusividadeLogin />} />
          <Route path="/exclusividade/conteudo" element={<ExclusividadeConteudo />} />
          
          {/* Loja */}
          <Route path="/loja" element={<LojaPage />} />
          <Route path="/loja/:id" element={<LojaProdutoPage />} />
          
          {/* Painel de Postagens - acesso direto */}
          <Route path="/postagem" element={<PostagemPage />} />
          
          {/* Ads Garotas Top */}
          <Route path="/garotas" element={<AdsGarotasTopPage />} />
          <Route path="/ads/garotas-top" element={<AdsGarotasTopPage />} />
          <Route path="/perfil-instagram" element={<InstagramProfilePage />} />
          <Route path="/perfil-instagram/:slug" element={<InstagramModelFeed />} />

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
    </CartProvider>
  </QueryClientProvider>
);

export default App;