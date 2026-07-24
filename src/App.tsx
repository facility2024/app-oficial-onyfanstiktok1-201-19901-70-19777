import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Componentes globais (leves) — carregados de imediato
import { OfflineHandler } from "@/components/OfflineHandler";
import { UserLocationTracker } from "@/components/UserLocationTracker";
import { SessionManager } from "@/components/SessionManager";
import { AdminRoute } from "@/components/AdminRoute";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CartProvider } from "./contexts/CartContext";

// Rotas críticas — eager (primeira tela)
import SplashScreen from "./pages/SplashScreen";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Demais páginas — lazy (code-splitting)
const AdminDashboard = lazy(() => import("@/components/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const CreatorApplication = lazy(() => import("./pages/CreatorApplication"));
const CreatorStudio = lazy(() => import("./pages/CreatorStudio"));
const ExplorePage = lazy(() => import("./pages/ExplorePage"));
const FollowingPage = lazy(() => import("./pages/FollowingPage"));
const MarketplacePage = lazy(() => import("./pages/MarketplacePage"));
const LocalBusinessPage = lazy(() => import("./pages/LocalBusinessPage"));
const LocalBusinessDetailsPage = lazy(() => import("./pages/LocalBusinessDetailsPage"));
const BusinessFavoritesPage = lazy(() => import("./pages/BusinessFavoritesPage"));
const CollectionsPage = lazy(() => import("./pages/CollectionsPage"));
const SubscribePage = lazy(() => import("./pages/SubscribePage"));
const PaymentConfirmation = lazy(() => import("./pages/PaymentConfirmation"));
const VIPManagementPage = lazy(() => import("./pages/VIPManagementPage"));
const MySubscriptionsPage = lazy(() => import("./pages/MySubscriptionsPage"));
const AdvertisersPage = lazy(() => import("./pages/AdvertisersPage"));
const FollowingCreatorsPage = lazy(() => import("./pages/FollowingCreatorsPage"));
const ModelChat = lazy(() => import("./pages/ModelChat"));
const ChatListPage = lazy(() => import("./pages/ChatListPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const VideoCallPage = lazy(() => import("./pages/VideoCallPage").then(m => ({ default: m.VideoCallPage })));
const AtualizacoesPage = lazy(() => import("./pages/AtualizacoesPage"));
const ExclusividadeLogin = lazy(() => import("./pages/ExclusividadeLogin"));
const ExclusividadeConteudo = lazy(() => import("./pages/ExclusividadeConteudo"));
const LojaPage = lazy(() => import("./pages/LojaPage"));
const LojaProdutoPage = lazy(() => import("./pages/LojaProdutoPage"));
const PostagemPage = lazy(() => import("./pages/PostagemPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const CheckoutTemplatePage = lazy(() => import("./pages/CheckoutTemplatePage"));
const MyAccessPanel = lazy(() => import("./components/MyAccessPanel"));
const ProductAccessPage = lazy(() => import("./pages/ProductAccessPage"));
const ProductAccessCardPage = lazy(() => import("./pages/ProductAccessCardPage"));
const CreateStorePage = lazy(() => import("./pages/CreateStorePage"));
const ShopkeeperDashboard = lazy(() => import("./pages/ShopkeeperDashboard"));
const StoreProfilePage = lazy(() => import("./pages/StoreProfilePage"));
const MarketplaceStoresPage = lazy(() => import("./pages/MarketplaceStoresPage"));
const StoreCartPage = lazy(() => import("./pages/StoreCartPage"));
const AdsGarotasTopPage = lazy(() => import("./pages/AdsGarotasTopPage"));
const GarotasTopVipPage = lazy(() => import("./pages/GarotasTopVipPage"));
const IndicadorCadastro = lazy(() => import("./pages/IndicadorCadastro"));
const IndicadorArea = lazy(() => import("./pages/IndicadorArea"));
const InstagramProfilePage = lazy(() => import("./pages/InstagramProfilePage"));
const InstagramModelFeed = lazy(() => import("./pages/InstagramModelFeed"));
const BuyerAccess = lazy(() => import("./pages/BuyerAccess"));
const AdminHowToUsePix = lazy(() => import("./pages/AdminHowToUsePix"));
const GuiaDoSistema = lazy(() => import("./pages/GuiaDoSistema"));

// Optimize QueryClient for mobile performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-screen bg-gray-950 flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

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
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Splash Screen como HOME */}
            <Route path="/" element={<SplashScreen />} />

            <Route path="/auth" element={<Auth />} />
            <Route path="/indicador/cadastro" element={<IndicadorCadastro />} />
            <Route path="/indicador" element={<IndicadorArea />} />

            {/* App SEM proteção - aceita usuários anônimos */}
            <Route path="/app" element={<Index />} />
            <Route path="/tiktok" element={<Index />} />
            <Route path="/home" element={<Index />} />
            <Route path="/index" element={<Index />} />
            <Route path="/main" element={<Index />} />
            <Route path="/garotas-top-vip" element={<GarotasTopVipPage />} />

            {/* Perfil do usuário */}
            <Route path="/profile" element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            } />

            {/* Acesso do comprador via WhatsApp */}
            <Route path="/acesso" element={<BuyerAccess />} />

            {/* Painel de acessos do usuário */}
            <Route path="/meus-acessos" element={
              <div className="min-h-screen bg-gray-950">
                <MyAccessPanel />
              </div>
            } />

            {/* Página de acesso de um produto específico */}
            <Route path="/acesso-produto/:productId" element={<ProductAccessPage />} />
            <Route path="/acesso-produto/:productId/card/:cardId" element={<ProductAccessCardPage />} />

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

            {/* Explorar */}
            <Route path="/explore" element={
              <ProtectedRoute>
                <ExplorePage />
              </ProtectedRoute>
            } />

            {/* Seguindo */}
            <Route path="/following" element={
              <ProtectedRoute>
                <FollowingPage />
              </ProtectedRoute>
            } />

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

            {/* Lojista */}
            <Route path="/minha-loja" element={
              <ProtectedRoute>
                <ShopkeeperDashboard />
              </ProtectedRoute>
            } />

            {/* Negócios Locais */}
            <Route path="/local-business" element={<LocalBusinessPage />} />
            <Route path="/local-businesses" element={<LocalBusinessPage />} />
            <Route path="/local-business/:businessId" element={<LocalBusinessDetailsPage />} />

            <Route path="/business-favorites" element={<BusinessFavoritesPage />} />
            <Route path="/collections" element={<CollectionsPage />} />

            {/* Assinatura VIP */}
            <Route path="/subscribe" element={<SubscribePage />} />
            <Route path="/checkout-vip" element={
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

            {/* Chat */}
            <Route path="/chat/:entityId" element={<ModelChat />} />
            <Route path="/ChatIA" element={<ChatListPage />} />
            <Route path="/chats" element={<ChatListPage />} />

            <Route path="/advertisers" element={<AdvertisersPage />} />
            <Route path="/video-chamada" element={<VideoCallPage />} />
            <Route path="/atualizacoes" element={<AtualizacoesPage />} />

            {/* Exclusividade */}
            <Route path="/exclusividade" element={<ExclusividadeLogin />} />
            <Route path="/exclusividade/conteudo" element={<ExclusividadeConteudo />} />

            {/* Loja */}
            <Route path="/loja" element={<LojaPage />} />
            <Route path="/loja/:id" element={<LojaProdutoPage />} />

            <Route path="/postagem" element={<PostagemPage />} />

            {/* Ads Garotas Top */}
            <Route path="/garotas" element={<AdsGarotasTopPage />} />
            <Route path="/ads/garotas-top" element={<AdsGarotasTopPage />} />
            <Route path="/perfil-instagram" element={<InstagramProfilePage />} />
            <Route path="/perfil-instagram/:slug" element={<InstagramModelFeed />} />

            {/* Admin */}
            <Route path="/admin" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
            <Route path="/admin/como-usar-pix" element={<AdminHowToUsePix />} />
            <Route path="/guia-do-sistema" element={<GuiaDoSistema />} />
            <Route path="/guia-do-sistema.docx" element={<GuiaDoSistema />} />

            {/* URL amigável para perfis - DEVE ser antes do catch-all */}
            <Route path="/:username" element={<ProfilePage />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
    </CartProvider>
  </QueryClientProvider>
);

export default App;
