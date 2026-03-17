# 📋 PRD - COCONUDI v3.0
## Product Requirements Document — Estado Atual da Plataforma

**Versão:** 3.0  
**Data:** 2026-03-17  
**Status:** ✅ Em Produção  
**URL Publicada:** https://app-oficial-onyfanstiktok1-201-19901-70-19777.lovable.app

---

## 📊 Índice

1. [Visão Geral](#1-visão-geral)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Arquitetura do Sistema](#3-arquitetura-do-sistema)
4. [Mapa de Rotas](#4-mapa-de-rotas)
5. [Funcionalidades Implementadas](#5-funcionalidades-implementadas)
6. [Sistema de Autenticação e Roles](#6-sistema-de-autenticação-e-roles)
7. [Edge Functions (Backend)](#7-edge-functions-backend)
8. [Hooks Customizados](#8-hooks-customizados)
9. [Componentes do Feed TikTok](#9-componentes-do-feed-tiktok)
10. [Painel Administrativo](#10-painel-administrativo)
11. [Integrações Externas](#11-integrações-externas)
12. [PWA e Mobile](#12-pwa-e-mobile)
13. [Segurança RLS](#13-segurança-rls)
14. [KPIs e Métricas](#14-kpis-e-métricas)

---

## 1. Visão Geral

### 1.1 O que é o COCONUDI?

**COCONUDI** é uma plataforma de vídeos curtos estilo TikTok, especializada em conteúdo de modelos e criadores certificados. Combina:

| Pilar | Descrição | Status |
|-------|-----------|--------|
| 🎬 Feed Inteligente | Vídeos verticais com scroll infinito e autoplay | ✅ Ativo |
| 👥 Sistema Dual | Modelos (estáticos) + Criadores (autenticados) | ✅ Ativo |
| 💎 Monetização VIP | Assinatura premium via PIX | ✅ Ativo |
| 🎮 Gamificação | Pontos, níveis, missões diárias, streaks | ✅ Ativo |
| 💰 Carteira Nudix | Sistema de afiliados com carteira digital | ✅ Ativo |
| 🛍️ Marketplace | Produtos digitais e físicos | ✅ Ativo |
| 🏪 Comércios Locais | Negócios locais integrados com geolocalização | ✅ Ativo |
| 🎨 Painel Admin | Dashboard completo com 40+ módulos | ✅ Ativo |
| 🎥 Creator Studio | Upload via Bunny.net, gestão de vídeos | ✅ Ativo |
| 💬 Chat IA | Chat com modelos/criadores via IA | ✅ Ativo |
| 📹 Vídeo Chamada | Sistema de vídeo chamadas | ✅ Ativo |
| 📺 Lives | Transmissões ao vivo | ✅ Ativo |
| 🏪 Loja | E-commerce integrado | ✅ Ativo |
| 📧 Email Marketing | Envio de emails em massa | ✅ Ativo |

---

## 2. Stack Tecnológico

### Frontend
| Tecnologia | Versão | Uso |
|------------|--------|-----|
| React | 18.3 | Framework UI |
| TypeScript | — | Tipagem estática |
| Vite | — | Build tool |
| Tailwind CSS | — | Estilização |
| shadcn/ui | — | Componentes UI (50+ componentes) |
| Framer Motion | — | Animações |
| React Router DOM | v6 | Roteamento |
| TanStack Query | — | State management / cache |
| React Hook Form + Zod | — | Formulários e validação |
| Recharts | — | Gráficos |
| Lucide React | — | Ícones |

### Backend (Supabase)
| Serviço | Uso |
|---------|-----|
| PostgreSQL | Banco de dados principal |
| Auth | Autenticação email/senha + anônimo |
| Storage | Avatars, mídia |
| Edge Functions (Deno) | 18 funções serverless |
| Real-time | Subscriptions ao vivo |
| RLS | Row Level Security em todas as tabelas |

### Infraestrutura
| Serviço | Uso |
|---------|-----|
| Bunny.net CDN | Streaming de vídeos |
| Asaas | Pagamentos PIX + Cartão |
| Resend | Envio de emails |
| IPify | Detecção de IP |
| PWA | App instalável |
| Docker + Nginx | Deploy containerizado |

---

## 3. Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                      COCONUDI PLATFORM v3                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   FRONTEND   │  │    ADMIN     │  │   CREATOR    │           │
│  │   (React)    │  │  DASHBOARD   │  │    STUDIO    │           │
│  │              │  │  (40+ mods)  │  │              │           │
│  │ • TikTokApp  │  │ • Users      │  │ • Upload     │           │
│  │ • Profile    │  │ • Analytics  │  │ • Video Mgmt │           │
│  │ • Explore    │  │ • Content    │  │ • Stats      │           │
│  │ • Following  │  │ • Gamif.     │  │ • Plans      │           │
│  │ • Chat IA    │  │ • Finances   │  │              │           │
│  │ • Marketplace│  │ • Lives      │  │              │           │
│  │ • Loja       │  │ • Ads        │  │              │           │
│  │ • VideoCall  │  │ • Webhooks   │  │              │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                 │                     │
│  ┌──────┴─────────────────┴─────────────────┴───────┐           │
│  │              SUPABASE (BaaS)                      │           │
│  │                                                    │           │
│  │  ┌────────┐ ┌──────┐ ┌─────────┐ ┌────────────┐  │           │
│  │  │  Auth  │ │  DB  │ │ Storage │ │ Edge Funcs │  │           │
│  │  │        │ │ PgSQL│ │ Buckets │ │ 18 funções │  │           │
│  │  └────────┘ └──────┘ └─────────┘ └────────────┘  │           │
│  └───────────────────────────────────────────────────┘           │
│                                                                   │
│  ┌──────────────────────────────────────────────────┐           │
│  │           SERVIÇOS EXTERNOS                       │           │
│  │  • Bunny.net (CDN)  • Asaas (Pagamentos)        │           │
│  │  • Resend (Email)   • IPify (Geo)               │           │
│  └──────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Mapa de Rotas (34 rotas)

### Rotas Públicas
| Rota | Página | Descrição |
|------|--------|-----------|
| `/` | SplashScreen | Tela de abertura |
| `/app` `/tiktok` `/home` `/index` `/main` | Index (TikTokApp) | Feed principal |
| `/auth` | Auth | Login/Registro |
| `/marketplace` | MarketplacePage | Marketplace de produtos |
| `/local-business` `/local-businesses` | LocalBusinessPage | Negócios locais |
| `/local-business/:id` | LocalBusinessDetailsPage | Detalhe de negócio |
| `/subscribe` | SubscribePage | Assinatura VIP |
| `/payment-confirmation` | PaymentConfirmation | Confirmação pagamento |
| `/chat/:entityId` | ModelChat | Chat IA com modelo/criador |
| `/ChatIA` `/chats` | ChatListPage | Lista de chats |
| `/advertisers` | AdvertisersPage | Página de anunciantes |
| `/following-creators` | FollowingCreatorsPage | Criadores seguidos |
| `/video-chamada` | VideoCallPage | Vídeo chamada |
| `/atualizacoes` | AtualizacoesPage | Changelog |
| `/exclusividade` | ExclusividadeLogin | Área exclusiva login |
| `/exclusividade/conteudo` | ExclusividadeConteudo | Conteúdo exclusivo |
| `/loja` | LojaPage | Loja/E-commerce |
| `/loja/:id` | LojaProdutoPage | Detalhe do produto |
| `/postagem` | PostagemPage | Painel de postagens |
| `/:username` | ProfilePage | Perfil público |

### Rotas Protegidas (requer autenticação)
| Rota | Página | Descrição |
|------|--------|-----------|
| `/profile` | UserProfile | Perfil do usuário |
| `/creator-application` `/creator` | CreatorApplication | Aplicação de criador |
| `/creator-studio` | CreatorStudio | Estúdio de criação |
| `/explore` | ExplorePage | Explorar conteúdo |
| `/following` | FollowingPage | Feed de seguidos |
| `/business-favorites` | BusinessFavoritesPage | Favoritos de negócios |
| `/collections` | CollectionsPage | Coleções |
| `/vip-management` | VIPManagementPage | Gestão VIP |
| `/my-subscriptions` | MySubscriptionsPage | Minhas assinaturas |

### Rota Admin (requer role admin)
| Rota | Página | Descrição |
|------|--------|-----------|
| `/admin` | AdminDashboard | Painel administrativo completo |

---

## 5. Funcionalidades Implementadas

### 5.1 Feed de Vídeos (TikTok-Style)
- ✅ Scroll vertical infinito com autoplay
- ✅ Player customizado (pausar, volume, progresso)
- ✅ Duplo toque para curtir (animação de corações)
- ✅ Pré-carregamento de próximo vídeo
- ✅ Feed híbrido: 40% novos, 30% seguidos, 30% aleatórios
- ✅ Feed inteligente com indicador
- ✅ Seletor de gêneros/categorias
- ✅ Carrossel de anúncios intercalados
- ✅ Carrossel de modelos
- ✅ Carrossel de negócios locais
- ✅ Carrossel de marketplace
- ✅ Overlay de conteúdo premium
- ✅ Overlay de assinatura de modelo
- ✅ Verificação de idade (18+)
- ✅ Modal de login obrigatório após 5 vídeos
- ✅ Barra de progresso do vídeo
- ✅ Disco de vinil animado
- ✅ Gift explosion / Bonus gift
- ✅ Corações flutuantes (FloatingHearts)

### 5.2 Sistema de Interações
- ✅ Like/Unlike com animação
- ✅ Comentários com respostas
- ✅ Compartilhamento (WhatsApp, Telegram, etc.)
- ✅ Seguir modelos (model_followers)
- ✅ Seguir criadores (user_follows)
- ✅ Realtime nas interações
- ✅ Notificações de comentários
- ✅ Menu de opções do vídeo

### 5.3 Sistema VIP/Premium
- ✅ Planos configuráveis pelo admin
- ✅ Pagamento via PIX (Asaas)
- ✅ Pagamento via Cartão (Asaas)
- ✅ Verificação automática de pagamento
- ✅ Conteúdo exclusivo para assinantes
- ✅ Assinaturas individuais de criadores/modelos
- ✅ Gestão VIP pelo admin
- ✅ Ativação manual VIP

### 5.4 Gamificação
- ✅ Pontos por ação (like: 5pts, comentário: 10pts, share: 15pts)
- ✅ Níveis: Bronze → Prata → Ouro → Platina → Diamante
- ✅ Missões diárias (limite: 3 ações/dia)
- ✅ Streak (dias consecutivos)
- ✅ Ranking de usuários
- ✅ Administração de missões

### 5.5 Carteira Nudix & Afiliados
- ✅ Código de referência único por usuário
- ✅ Bônus N$ 1,00 por indicação
- ✅ Histórico de transações
- ✅ Compartilhamento via WhatsApp/Telegram
- ✅ Painel de afiliados no admin

### 5.6 Chat IA
- ✅ Chat com modelos (IA generativa)
- ✅ Chat com criadores
- ✅ Painéis configuráveis por modelo
- ✅ Mensagens de saudação personalizadas
- ✅ Lista de chats recentes

### 5.7 Creator Studio
- ✅ Upload de vídeos via Bunny.net
- ✅ Gerenciamento de vídeos (editar, pausar, deletar)
- ✅ Estatísticas por vídeo
- ✅ Planos de assinatura do criador
- ✅ Aplicação em 3 etapas

### 5.8 Marketplace & Loja
- ✅ Marketplace de produtos digitais
- ✅ Loja com produtos físicos
- ✅ Banners do marketplace
- ✅ Categorias e gêneros
- ✅ Feedback/avaliações

### 5.9 Negócios Locais
- ✅ Listagem por geolocalização
- ✅ Detalhes do negócio
- ✅ Favoritos de negócios
- ✅ Geocodificação automática

### 5.10 Lives
- ✅ Interface de live
- ✅ Lista de lives ativas
- ✅ Modal de live
- ✅ Gestão pelo admin

### 5.11 Vídeo Chamada
- ✅ Página de vídeo chamada
- ✅ Lista de modelos disponíveis
- ✅ Popup de chamada

### 5.12 Comunicação
- ✅ Envio de emails (Resend)
- ✅ Envio de SMS
- ✅ Webhooks configuráveis
- ✅ Email marketing em massa

---

## 6. Sistema de Autenticação e Roles

### 6.1 Autenticação
- **Email/Senha**: Registro e login padrão
- **Anônimo**: Acesso limitado ao feed (5 vídeos grátis)
- **Verificação de idade**: Modal obrigatório (18+)

### 6.2 Roles (tabela separada `user_roles`)

| Role | Permissões | Acesso |
|------|-----------|--------|
| `user` | Interações básicas | Feed, perfil, likes, comentários |
| `creator` | Upload e gestão | Creator Studio, vídeos, planos |
| `moderator` | Moderação | Conteúdo, comentários |
| `admin` | Acesso total | Painel admin completo |

### 6.3 Função has_role() (SECURITY DEFINER)
```sql
CREATE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
```

---

## 7. Edge Functions (18 funções)

| Função | Método | Descrição |
|--------|--------|-----------|
| `ai-chat` | POST | Chat com IA |
| `approve-creator` | POST | Aprovar criador |
| `asaas-checkout` | POST | Checkout de pagamento |
| `asaas-verify-payment` | POST | Verificar pagamento |
| `bunny-video-upload` | POST | Upload de vídeo via Bunny |
| `delete-creator` | POST | Deletar criador |
| `follow-model` | POST | Seguir/deixar de seguir |
| `geocode-businesses` | POST | Geocodificar negócios |
| `geolocate` | POST | Geolocalização |
| `model-chat` | POST | Chat com modelo |
| `payment-webhook` | POST | Webhook de pagamento |
| `process-scheduled-posts` | POST | Processar posts agendados |
| `resend-webhook` | POST | Webhook Resend |
| `send-email` | POST | Enviar email |
| `send-sms` | POST | Enviar SMS |
| `strong-sms` | POST | SMS reforçado |
| `trigger-webhook` | POST | Disparar webhook |
| `update-model-panel` | POST | Atualizar painel da modelo |

---

## 8. Hooks Customizados (43 hooks)

### Core
| Hook | Responsabilidade |
|------|-----------------|
| `useCurrentUser` | Dados do usuário atual + perfil |
| `useUserRoles` | Verificação de roles |
| `usePremiumStatus` | Status VIP do usuário |
| `useSessionTracking` | Tracking de sessão |

### Feed & Vídeos
| Hook | Responsabilidade |
|------|-----------------|
| `useHybridFeed` | Feed inteligente (40/30/30) |
| `useIntelligentFeed` | Feed com IA |
| `useVideoActions` | Like, comentário, share |
| `useVideoTracking` | Tracking de views |
| `useVideoInteractionsRealtime` | Interações em tempo real |
| `useCreatorVideos` | Vídeos do criador |
| `useDailyViews` | Views diárias |
| `useGenres` | Gêneros/categorias |

### Social
| Hook | Responsabilidade |
|------|-----------------|
| `useCreatorFollow` | Seguir criadores |
| `useFollowsRealtime` | Follows em tempo real |
| `useModelSubscription` | Assinatura de modelo |
| `useAllSubscriptions` | Todas assinaturas |

### Gamificação & Wallet
| Hook | Responsabilidade |
|------|-----------------|
| `useGamification` | Pontos, níveis, missões |
| `useDailyMissions` | Missões diárias |
| `useNudixWallet` | Carteira Nudix |
| `useReferralSystem` | Sistema de indicações |
| `usePendingReferral` | Referral pendente |
| `useAffiliateStats` | Stats de afiliados |

### Admin & Analytics
| Hook | Responsabilidade |
|------|-----------------|
| `useRealTimeStats` | Stats em tempo real |
| `useAdminAnalytics` | Analytics do admin |
| `useAdminNotifications` | Notificações admin |
| `useAdminSettings` | Configurações admin |
| `useFinancialData` | Dados financeiros |
| `useRealSalesData` | Vendas reais |
| `useWeeklySales` | Vendas semanais |
| `useCreatorStats` | Stats do criador |
| `useAppAnalytics` | Analytics do app |
| `useAnalytics` | Analytics geral |

### Outros
| Hook | Responsabilidade |
|------|-----------------|
| `useGeolocation` | Geolocalização |
| `useViewerRegions` | Regiões dos viewers |
| `useOnlineViewers` | Viewers online |
| `useBusinessFavorites` | Favoritos de negócios |
| `useFeedPromotions` | Promoções no feed |
| `usePostScheduler` | Agendamento de posts |
| `useVIPManagement` | Gestão VIP |
| `useSupabaseSync` | Sincronização Supabase |
| `use-mobile` | Detecção mobile |
| `use-toast` | Sistema de toasts |

---

## 9. Componentes do Feed TikTok (44 componentes)

| Componente | Função |
|-----------|--------|
| `VideoPlayer` | Player principal de vídeo |
| `UniversalVideoPlayer` | Player universal |
| `FullscreenVideoModal` | Modal fullscreen |
| `VideoProgressBar` | Barra de progresso |
| `VideoOptionsMenu` | Menu de opções |
| `BottomInfo` | Info inferior (nome, descrição) |
| `VinylRecord` | Disco de vinil animado |
| `FloatingHearts` | Animação de corações |
| `GiftExplosion` | Explosão de presentes |
| `BonusGift` | Bônus gift |
| `CounterPulse` | Contador pulsante |
| `AdCarousel` | Carrossel de anúncios |
| `BannerCarousel` | Carrossel de banners |
| `ModelCarousel` | Carrossel de modelos |
| `MarketplaceCarousel` | Carrossel marketplace |
| `LocalBusinessCarousel` | Carrossel de negócios |
| `PhysicalProductsSection` | Produtos físicos |
| `FeedPromoCard` | Card de promoção |
| `GenreSelector` | Seletor de gêneros |
| `CategoryMenu` | Menu de categorias |
| `SideMenu` / `EnhancedSideMenu` | Menu lateral |
| `UserMenuHeader` | Header do menu |
| `ProfileScreen` | Tela de perfil |
| `ProfileMessageBox` | Caixa de mensagem |
| `CommentsScreen` | Tela de comentários |
| `CommentNotification` | Notificação de comentário |
| `ChatScreen` | Tela de chat |
| `SearchModal` | Modal de busca |
| `LiveModal` | Modal de live |
| `LiveListPopup` | Lista de lives |
| `VideoCallPopup` | Popup de vídeo chamada |
| `VideoCallListPopup` | Lista de vídeo chamadas |
| `AgeVerificationModal` | Verificação de idade |
| `LoginRequiredModal` | Modal de login obrigatório |
| `PremiumContentOverlay` | Overlay premium |
| `ModelSubscriptionOverlay` | Overlay assinatura |
| `PaymentVerificationIndicator` | Indicador pagamento |
| `IntelligentFeedIndicator` | Indicador feed IA |
| `RealtimeIndicator` | Indicador realtime |
| `PromoPopup` | Popup promocional |
| `ActionTracker` | Tracker de ações |
| `LikeAnimations.css` | Animações CSS |

---

## 10. Painel Administrativo (52 componentes)

| Módulo | Componente | Função |
|--------|-----------|--------|
| **Dashboard** | AdminStats | Estatísticas gerais |
| **Dashboard** | AdminCharts | Gráficos e charts |
| **Navegação** | AdminNavigation | Menu de navegação |
| **Navegação** | AdminSidebar | Sidebar |
| **Navegação** | AdminHeader | Header |
| **Usuários** | AdminUsers | Gestão de usuários |
| **Usuários** | AdminVIPUsers | Usuários VIP |
| **Usuários** | AdminActivateVIP | Ativar VIP manual |
| **Usuários** | AdminRoles | Gestão de roles |
| **Usuários** | AddRoleModal | Modal adicionar role |
| **Conteúdo** | AdminVideos | Gestão de vídeos |
| **Conteúdo** | AdminContentTable | Tabela de conteúdo |
| **Conteúdo** | ContentModal | Modal de conteúdo |
| **Conteúdo** | AdminGenres | Gêneros |
| **Conteúdo** | AdminVideoGenresModal | Modal gêneros |
| **Criadores** | AdminCreatorApplications | Aplicações |
| **Criadores** | AdminModelChatPanels | Painéis de chat |
| **Criadores** | ModelChatPanelModal | Modal painel chat |
| **Criadores** | AdminModelSubscriptions | Assinaturas |
| **Financeiro** | AdminMoney | Dashboard financeiro |
| **Financeiro** | AdminMarketplace | Marketplace |
| **Financeiro** | AdminMarketplaceBanners | Banners |
| **Financeiro** | AdminMarketplaceFeedback | Feedback |
| **Financeiro** | AdminPhysicalProducts | Produtos físicos |
| **Financeiro** | AdminLoja | Loja |
| **Gamificação** | AdminGamification | Sistema de pontos |
| **Gamificação** | AdminDailyMissions | Missões diárias |
| **Gamificação** | MissionModal | Modal de missão |
| **Marketing** | AdminAds | Anúncios |
| **Marketing** | AdminPromoAds | Promos |
| **Marketing** | AdminFeedPromotions | Promoções no feed |
| **Marketing** | OffersModal | Modal de ofertas |
| **Comunicação** | AdminEmailEvents | Eventos de email |
| **Comunicação** | BulkEmailModal | Email em massa |
| **Live** | AdminLive | Gestão de lives |
| **Live** | LiveManagementModal | Modal de live |
| **Live** | LiveUserIndicator | Indicador de live |
| **Agendamento** | AdminVideoScheduler | Agendador de vídeos |
| **Negócios** | AdminLocalBusinesses | Negócios locais |
| **Cadastros** | AdminCadastros | Cadastros |
| **Afiliados** | AdminAffiliates | Sistema de afiliados |
| **Vídeo Call** | AdminVideoCall | Gestão de vídeo chamadas |
| **Feed** | AdminIntelligentFeed | Feed inteligente |
| **Analytics** | UserAddressLog | Log de endereços |
| **Config** | AdminSettings | Configurações |
| **Config** | IntegrationsModal | Integrações |
| **Webhooks** | AdminWebhookLogs | Logs de webhooks |
| **Docs** | AdminDocumentation | Documentação |
| **UI** | PremiumStatusBadge | Badge premium |
| **UI** | SaleNotification | Notificação de venda |
| **Auth** | LoginScreen | Tela de login admin |

---

## 11. Integrações Externas

### Bunny.net (CDN de Vídeos)
- **Storage Zone**: Upload de vídeos
- **Pull Zone**: Streaming otimizado
- **Edge Function**: `bunny-video-upload`

### Asaas (Pagamentos)
- **PIX**: Geração de QR Code + código
- **Cartão de Crédito**: Checkout
- **Webhooks**: Confirmação automática
- **Edge Functions**: `asaas-checkout`, `asaas-verify-payment`, `payment-webhook`

### Resend (Email)
- **Transacional**: Confirmações, notificações
- **Marketing**: Emails em massa
- **Webhook**: `resend-webhook`
- **Edge Function**: `send-email`

### SMS
- **Edge Functions**: `send-sms`, `strong-sms`

---

## 12. PWA e Mobile

- ✅ `manifest.json` configurado
- ✅ Service Worker (`sw.js`) ativo
- ✅ OfflineHandler componente
- ✅ Instalável em dispositivos móveis
- ✅ MobileOptimizer componente
- ✅ PWAInstallPrompt componente
- ✅ Detecção mobile via `use-mobile` hook
- ✅ Responsivo mobile-first
- ✅ Docker + Nginx para deploy

---

## 13. Segurança RLS

### Tabelas com RLS Ativo
Todas as tabelas críticas possuem Row Level Security:

| Tabela | Políticas |
|--------|-----------|
| `user_roles` | SELECT own + admin, INSERT/UPDATE/DELETE admin only |
| `profiles` | SELECT own + admin, UPDATE own, INSERT own |
| `videos` | SELECT público (ativos), CRUD creator/admin |
| `premium_users` | SELECT own + admin, INSERT service_role |
| `model_followers` | CRUD público |
| `user_follows` | CRUD público |
| `likes` | SELECT público, INSERT/DELETE own |
| `comments` | SELECT público, CRUD own + admin |
| `video_views` | INSERT público, SELECT admin |
| `admin_settings` | Admin only |
| `webhook_logs` | SELECT admin, INSERT público |
| `model_chat_panels` | Admin + creator own + public active |
| `creator_applications` | SELECT/INSERT own, admin review |
| `user_wallets` | Own + admin |
| `wallet_transactions` | Own + admin |
| `referrals` | Own + admin |

### Auditoria
- Triggers automáticos em `premium_users`, `user_roles`, `admin_settings`
- Tabela `security_audit_log` com histórico completo
- Tabela `audit_logs` para ações gerais

---

## 14. KPIs e Métricas

| Métrica | Meta | Tracking |
|---------|------|----------|
| Tempo médio de sessão | 15-20 min | `useSessionTracking` |
| Vídeos/sessão | 25+ | `useVideoTracking` |
| Conversão Premium | 5% | `usePremiumStatus` |
| Retenção D7 | 40% | `useAppAnalytics` |
| Criadores ativos | 200+ | `useCreatorStats` |
| Usuários online | Real-time | `useRealTimeStats` |
| Views diárias | — | `useDailyViews` |
| Vendas semanais | — | `useWeeklySales` |

---

## 📁 Estrutura de Arquivos

```
src/
├── components/
│   ├── admin/          # 52 componentes admin
│   ├── creator/        # 6 componentes creator
│   ├── profile/        # 2 componentes perfil
│   ├── tiktok/         # 44 componentes feed
│   └── ui/             # 50+ shadcn/ui components
├── hooks/              # 43 custom hooks
├── pages/              # 34 páginas
├── integrations/
│   └── supabase/       # Cliente + types
├── types/              # TypeScript types
├── constants/          # Constantes
├── utils/              # Utilitários
└── assets/             # Imagens e mídia

supabase/
├── functions/          # 18 edge functions
├── rls-security/       # Scripts de segurança RLS
├── migrations/         # Migrações do banco
└── *.sql               # Scripts SQL diversos (50+)

docs/                   # Documentação
public/                 # Assets públicos + PWA
```

---

## 🔄 Componentes Globais (sempre ativos)

| Componente | Função |
|-----------|--------|
| `OfflineHandler` | Detecta estado offline |
| `UserLocationTracker` | Rastreia localização |
| `SessionManager` | Gerencia sessão ativa |
| `Toaster` + `Sonner` | Notificações toast |
| `TooltipProvider` | Tooltips globais |

---

*Documento gerado automaticamente em 17/03/2026*
*COCONUDI Platform v3.0*
