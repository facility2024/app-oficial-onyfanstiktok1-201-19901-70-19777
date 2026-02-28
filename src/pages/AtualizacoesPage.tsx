import React from 'react';
import { ArrowLeft, Database, Code, Shield, Brain, Video, Users, Tags, Layers, Calendar, CheckCircle2, AlertTriangle, Wrench, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UpdateEntry {
  date: string;
  title: string;
  category: 'database' | 'frontend' | 'security' | 'feature' | 'fix' | 'optimization' | 'edge-function';
  description: string;
  details: string[];
  tablesAffected?: string[];
  filesChanged?: string[];
  migrationId?: string;
}

const categoryConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  database: { icon: Database, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Banco de Dados' },
  frontend: { icon: Code, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: 'Frontend' },
  security: { icon: Shield, color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Segurança' },
  feature: { icon: Rocket, color: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Nova Feature' },
  fix: { icon: Wrench, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Correção' },
  optimization: { icon: Brain, color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', label: 'Otimização' },
  'edge-function': { icon: Layers, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Edge Function' },
};

const updates: UpdateEntry[] = [
  {
    date: '28/02/2026',
    title: 'Sistema de Recomendação Inteligente e Personalização do Feed',
    category: 'feature',
    description: 'Implementação completa do sistema de recomendação com IA para personalizar o feed de vídeos, aumentando retenção e engajamento.',
    details: [
      'Criação da tabela `historico_visualizacao` para rastrear vídeos assistidos por usuário (com duração em segundos)',
      'Criação da tabela `interesses_fortes` para registrar modelos com alto engajamento (curtida ou +20s de visualização)',
      'Criação da tabela `perfil_preferencias` para armazenar scores de tags por usuário (sistema de afinidade)',
      'Adição da coluna `tags TEXT[]` na tabela `videos` para metadados de conteúdo',
      'Adição da coluna `tags TEXT[]` na tabela `models` para categorização de modelos',
      'Índices GIN criados para busca eficiente por tags',
      'Políticas RLS para proteger dados de histórico e preferências de cada usuário',
      'Hook `useVideoTracking` criado para rastrear engajamento (3s = visualização, 20s = interesse forte)',
      'Hook `useIntelligentFeed` evoluído com algoritmo de scoring: novidade + afinidade + popularidade + aleatoriedade',
      'Regra de exploração: 12% do feed é conteúdo aleatório para evitar bolha de filtro',
      'Integração com TikTokApp.tsx para disparar sinais de engajamento em tempo real',
    ],
    tablesAffected: ['historico_visualizacao', 'interesses_fortes', 'perfil_preferencias', 'videos (tags)', 'models (tags)'],
    filesChanged: [
      'src/hooks/useVideoTracking.tsx (NOVO)',
      'src/hooks/useIntelligentFeed.tsx',
      'src/pages/TikTokApp.tsx',
    ],
    migrationId: '20260228131445_f327676d',
  },
  {
    date: '28/02/2026',
    title: 'Otimização de Performance do Feed de Vídeos',
    category: 'optimization',
    description: 'Otimizações críticas para rolagem suave e reprodução de vídeo em dispositivos móveis (iOS/Android).',
    details: [
      'Remoção de +30 console.log dos caminhos de renderização para reduzir overhead de CPU',
      'Alteração do preload de vídeo de "auto" para "metadata" — evita download simultâneo de múltiplos vídeos',
      'Remoção de `will-change: transform` e `perspective: 1000px` do CSS para economizar memória GPU',
      'Refatoração dos listeners do emblaApi para maior eficiência',
      'Otimização da lógica de retry do `attemptPlay` para ser menos intensiva em recursos',
    ],
    filesChanged: [
      'src/pages/TikTokApp.tsx',
      'src/components/tiktok/UniversalVideoPlayer.tsx',
      'src/index.css',
    ],
  },
  {
    date: '27/02/2026',
    title: 'Melhorias no Painel Administrativo - Sidebar e Header',
    category: 'frontend',
    description: 'Reorganização da navegação administrativa com sidebar colapsável e header otimizado.',
    details: [
      'AdminSidebar com grupos categorizados: Principal, Conteúdo, Usuários, Negócios, Ferramentas, Financeiro, Sistema',
      'Cores distintas por grupo de ícones para navegação visual rápida',
      'Header com gradiente verde/âmbar representando a marca CocoNudi',
      'Sistema de notificações com Popover e marcação de lidas',
      'Relógio em tempo real no header',
      'Botão de acesso rápido ao App',
    ],
    filesChanged: [
      'src/components/admin/AdminSidebar.tsx',
      'src/components/admin/AdminHeader.tsx',
    ],
  },
  {
    date: '26/02/2026',
    title: 'Sistema de Afiliados e Carteira Nudix',
    category: 'feature',
    description: 'Implementação do sistema completo de indicações com carteira digital Nudix.',
    details: [
      'Tabela `user_wallets` para saldo da carteira Nudix de cada usuário',
      'Tabela `wallet_transactions` para histórico detalhado de transações',
      'Tabela `referrals` para rastreamento de indicações (referrer → referred)',
      'Bônus de N$ 1,00 por indicação completada',
      'Hook `useReferralSystem` para gerenciar códigos de referência e compartilhamento',
      'Hook `useNudixWallet` para consulta de saldo e transações',
      'Componente `ReferralSection` para compartilhamento via WhatsApp/Telegram',
      'Componente `TransactionHistory` com paginação',
    ],
    tablesAffected: ['user_wallets', 'wallet_transactions', 'referrals'],
    filesChanged: [
      'src/hooks/useReferralSystem.tsx',
      'src/hooks/useNudixWallet.tsx',
      'src/components/profile/ReferralSection.tsx',
      'src/components/profile/TransactionHistory.tsx',
    ],
  },
  {
    date: '25/02/2026',
    title: 'Creator Studio e Sistema de Upload via Bunny.net',
    category: 'feature',
    description: 'Implementação do estúdio de criação de conteúdo com upload de vídeos via CDN Bunny.net.',
    details: [
      'Edge Function `bunny-video-upload` para upload seguro de vídeos para Bunny.net',
      'Componente `BunnyVideoUploader` com barra de progresso e validação',
      'Tabela de gerenciamento de vídeos do criador (editar, pausar, deletar)',
      'Painel de estatísticas por vídeo (views, likes, comments)',
      'Modal de edição de vídeo com campos de título, descrição e tags',
      'Dialog de confirmação para deletar vídeos',
    ],
    tablesAffected: ['videos'],
    filesChanged: [
      'src/pages/CreatorStudio.tsx',
      'src/components/creator/BunnyVideoUploader.tsx',
      'src/components/creator/VideoManagementTable.tsx',
      'src/components/creator/EditVideoModal.tsx',
      'src/components/creator/DeleteVideoDialog.tsx',
      'supabase/functions/bunny-video-upload/index.ts',
    ],
  },
  {
    date: '24/02/2026',
    title: 'Sistema de Aplicação para Criadores',
    category: 'feature',
    description: 'Formulário de aplicação em 3 etapas para novos criadores, com aprovação via painel admin.',
    details: [
      'Criação da tabela `creator_applications` com campos: nome, email, whatsapp, gênero, bio, termos',
      'Formulário multi-step: Dados Pessoais → Bio e Conteúdo → Termos e Confirmação',
      'Edge Function `approve-creator` para aprovação com criação automática de role',
      'Edge Function `delete-creator` para remoção completa do criador',
      'Seção `AdminCreatorApplications` no painel admin para gestão de aplicações',
      'Políticas RLS: usuário vê apenas sua própria aplicação, admin vê e gerencia todas',
    ],
    tablesAffected: ['creator_applications', 'user_roles'],
    filesChanged: [
      'src/pages/CreatorApplication.tsx',
      'src/components/admin/AdminCreatorApplications.tsx',
      'supabase/functions/approve-creator/index.ts',
      'supabase/functions/delete-creator/index.ts',
    ],
  },
  {
    date: '23/02/2026',
    title: 'Implementação Completa de RLS (Row Level Security)',
    category: 'security',
    description: 'Aplicação massiva de políticas de segurança em todas as tabelas do banco de dados.',
    details: [
      'Função `has_role()` SECURITY DEFINER para evitar recursão infinita em políticas RLS',
      'Políticas em `user_roles`: SELECT próprio, SELECT admin, INSERT/UPDATE/DELETE admin only',
      'Políticas em `profiles`: SELECT/UPDATE próprio, INSERT próprio (signup), DELETE admin',
      'Políticas em `videos`: SELECT público (ativos), SELECT criador (próprios), CRUD admin',
      'Políticas em `premium_users`: SELECT próprio (por user_id ou email), CRUD admin',
      'Políticas em `comments`: SELECT vídeos ativos, INSERT/UPDATE/DELETE próprio, ALL admin',
      'Políticas em `likes`: SELECT vídeos ativos, INSERT/DELETE próprio, ALL admin',
      'Políticas em `video_views`: INSERT público (tracking), SELECT admin only',
      'Políticas em `admin_settings`: ALL admin only',
      'Políticas em `webhook_logs`: SELECT admin, INSERT público',
      'Auditoria automática com triggers em tabelas sensíveis (premium_users, user_roles, admin_settings)',
      'Tabela `security_audit_log` para rastrear todas as mudanças em dados críticos',
    ],
    tablesAffected: [
      'user_roles', 'profiles', 'videos', 'premium_users', 'comments', 'likes',
      'video_views', 'admin_settings', 'webhook_logs', 'security_audit_log',
      'model_followers', 'user_follows', 'model_chat_panels', 'marketplace_products',
      'creator_applications', 'user_wallets', 'wallet_transactions', 'referrals',
    ],
    filesChanged: [
      'supabase/rls-security/01-critical-role-system.sql',
      'supabase/rls-security/02-main-tables-policies.sql',
      'supabase/rls-security/03-sensitive-data-protection.sql',
      'supabase/rls-security/04-interaction-tables-policies.sql',
      'supabase/rls-security/05-analytics-audit.sql',
    ],
  },
  {
    date: '22/02/2026',
    title: 'Sistema de Gamificação Completo',
    category: 'feature',
    description: 'Sistema de pontos, níveis e missões diárias para engajamento dos usuários.',
    details: [
      'Pontuação por ação: like (5pts), comentário (10pts), compartilhamento (15pts)',
      'Níveis: Bronze → Prata → Ouro → Platina → Diamante',
      'Missões diárias com limite de 3 ações por tipo por dia',
      'Sistema de streak (dias consecutivos de uso)',
      'Hook `useGamification` para gerenciar pontos e progresso',
    ],
    tablesAffected: ['gamification_users', 'gamification_actions'],
    filesChanged: [
      'src/hooks/useGamification.tsx',
      'src/hooks/useDailyMissions.tsx',
      'src/components/admin/AdminGamification.tsx',
      'src/components/admin/AdminDailyMissions.tsx',
    ],
  },
  {
    date: '21/02/2026',
    title: 'Sistema VIP/Premium com PIX',
    category: 'feature',
    description: 'Implementação do sistema de assinatura VIP com pagamento via PIX brasileiro.',
    details: [
      'Edge Function `generate-pix` para gerar código PIX + QR Code Base64',
      'Edge Function `verify-payment` para verificação automática de status',
      'Tabela `premium_users` com campos: email, user_id, expires_at, plan_type',
      'Hook `usePremiumStatus` para verificação de status VIP em tempo real',
      'Página `SubscribePage` com planos configuráveis',
      'Overlay de conteúdo premium para não-assinantes',
    ],
    tablesAffected: ['premium_users'],
    filesChanged: [
      'src/pages/SubscribePage.tsx',
      'src/hooks/usePremiumStatus.tsx',
      'src/components/tiktok/PremiumContentOverlay.tsx',
      'supabase/functions/generate-pix/index.ts (NOVO)',
      'supabase/functions/verify-payment/index.ts (NOVO)',
    ],
  },
  {
    date: '20/02/2026',
    title: 'Feed Híbrido de Vídeos (TikTok-Style)',
    category: 'feature',
    description: 'Implementação do feed de vídeos com rolagem vertical infinita, autoplay e sistema de distribuição híbrido.',
    details: [
      'Feed com scroll vertical infinito usando Embla Carousel',
      'Player customizado com controles: pausar, volume, progresso',
      'Duplo toque para curtir com animação de coração',
      'Pré-carregamento do próximo vídeo para transição suave',
      'Sistema híbrido de distribuição: 40% novos, 30% seguidos, 30% aleatórios',
      'Hook `useHybridFeed` para lógica de seleção de vídeos',
    ],
    tablesAffected: ['videos', 'models', 'user_follows', 'model_followers'],
    filesChanged: [
      'src/pages/TikTokApp.tsx',
      'src/components/tiktok/VideoPlayer.tsx',
      'src/components/tiktok/UniversalVideoPlayer.tsx',
      'src/hooks/useHybridFeed.tsx',
    ],
  },
  {
    date: '19/02/2026',
    title: 'Sistema de Chat IA com Modelos e Criadores',
    category: 'feature',
    description: 'Chat com IA para interação entre usuários e modelos/criadores.',
    details: [
      'Tabela `model_chat_panels` com configurações de personalidade, saudação e capacidades',
      'Edge Function `model-chat` para processar mensagens com IA',
      'Edge Function `ai-chat` como backend genérico de IA',
      'Suporte a criadores com painéis próprios de chat',
      'Painel admin `AdminModelChatPanels` para gerenciamento',
      'Página `ModelChat` para interface de conversa',
    ],
    tablesAffected: ['model_chat_panels'],
    filesChanged: [
      'src/pages/ModelChat.tsx',
      'src/pages/ChatListPage.tsx',
      'src/components/admin/AdminModelChatPanels.tsx',
      'supabase/functions/model-chat/index.ts',
      'supabase/functions/ai-chat/index.ts',
    ],
  },
  {
    date: '18/02/2026',
    title: 'Marketplace e Comércios Locais',
    category: 'feature',
    description: 'Implementação do marketplace digital e sistema de comércios locais com geolocalização.',
    details: [
      'Página `MarketplacePage` com catálogo de produtos digitais',
      'Tabela `marketplace_products` com campos para produtos ativos',
      'Página `LocalBusinessPage` com listagem de comércios por proximidade',
      'Página `LocalBusinessDetailsPage` com detalhes e avaliações',
      'Hook `useBusinessFavorites` para favoritar comércios',
      'Hook `useGeolocation` para detectar localização do usuário',
      'Componente `LocalBusinessCarousel` no feed principal',
    ],
    tablesAffected: ['marketplace_products', 'local_businesses', 'business_favorites'],
    filesChanged: [
      'src/pages/MarketplacePage.tsx',
      'src/pages/LocalBusinessPage.tsx',
      'src/pages/LocalBusinessDetailsPage.tsx',
      'src/hooks/useBusinessFavorites.tsx',
      'src/hooks/useGeolocation.tsx',
      'src/components/tiktok/LocalBusinessCarousel.tsx',
    ],
  },
  {
    date: '17/02/2026',
    title: 'Autenticação e Perfis de Usuário',
    category: 'feature',
    description: 'Sistema de autenticação com suporte a usuários anônimos e perfis públicos.',
    details: [
      'Login/Registro com email e senha via Supabase Auth',
      'Suporte a usuários anônimos com IDs temporários',
      'Bloqueio após 5 vídeos para usuários não autenticados (modal de login)',
      'Verificação de idade (18+) obrigatória',
      'Perfil público com avatar, bio e estatísticas',
      'URL amigável /:username para perfis públicos',
      'Hook `useCurrentUser` para dados do usuário + perfil',
    ],
    tablesAffected: ['profiles', 'user_roles'],
    filesChanged: [
      'src/pages/Auth.tsx',
      'src/pages/UserProfile.tsx',
      'src/pages/ProfilePage.tsx',
      'src/components/ProtectedRoute.tsx',
      'src/components/AdminRoute.tsx',
      'src/hooks/useCurrentUser.tsx',
      'src/components/tiktok/AgeVerificationModal.tsx',
      'src/components/tiktok/LoginRequiredModal.tsx',
    ],
  },
  {
    date: '16/02/2026',
    title: 'Configuração Inicial do Projeto CocoNudi',
    category: 'database',
    description: 'Setup inicial do projeto com estrutura de banco de dados, tabelas principais e configuração do Supabase.',
    details: [
      'Criação do projeto React + Vite + TypeScript + Tailwind CSS',
      'Integração com Supabase (Auth, Database, Storage, Edge Functions)',
      'Tabela `profiles` para dados públicos de usuários',
      'Tabela `models` para modelos estáticos',
      'Tabela `videos` com constraint: model_id XOR creator_id',
      'Tabela `likes` para curtidas',
      'Tabela `comments` para comentários',
      'Tabela `video_views` para tracking de visualizações',
      'Tabela `user_follows` para seguir criadores',
      'Tabela `model_followers` para seguir modelos',
      'Tabela `admin_settings` para configurações do painel',
      'Configuração PWA com manifest.json e service worker',
      'Splash screen e roteamento principal',
    ],
    tablesAffected: ['profiles', 'models', 'videos', 'likes', 'comments', 'video_views', 'user_follows', 'model_followers', 'admin_settings'],
    filesChanged: [
      'src/App.tsx',
      'src/main.tsx',
      'src/pages/SplashScreen.tsx',
      'src/pages/Index.tsx',
      'src/integrations/supabase/client.ts',
      'public/manifest.json',
      'public/sw.js',
    ],
  },
];

const AtualizacoesPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-gray-950/80 border-b border-white/10">
        <div className="max-w-4xl mx-auto flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold bg-gradient-to-r from-green-400 to-amber-400 bg-clip-text text-transparent">
              🥥 CocoNudi — Atualizações Recentes
            </h1>
            <p className="text-xs text-gray-400">Histórico completo de desenvolvimento • 16/02/2026 → Hoje</p>
          </div>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            v3.0
          </Badge>
        </div>
      </header>

      {/* Timeline */}
      <ScrollArea className="h-[calc(100vh-64px)]">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* Resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
              <Database className="w-5 h-5 mx-auto mb-1 text-blue-400" />
              <div className="text-xl font-bold text-blue-400">{updates.reduce((acc, u) => acc + (u.tablesAffected?.length || 0), 0)}</div>
              <div className="text-[10px] text-gray-400">Tabelas Afetadas</div>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center">
              <Code className="w-5 h-5 mx-auto mb-1 text-purple-400" />
              <div className="text-xl font-bold text-purple-400">{updates.reduce((acc, u) => acc + (u.filesChanged?.length || 0), 0)}</div>
              <div className="text-[10px] text-gray-400">Arquivos Alterados</div>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
              <Rocket className="w-5 h-5 mx-auto mb-1 text-green-400" />
              <div className="text-xl font-bold text-green-400">{updates.length}</div>
              <div className="text-[10px] text-gray-400">Atualizações</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
              <Shield className="w-5 h-5 mx-auto mb-1 text-red-400" />
              <div className="text-xl font-bold text-red-400">{updates.filter(u => u.category === 'security').length}</div>
              <div className="text-[10px] text-gray-400">Patches de Segurança</div>
            </div>
          </div>

          {/* Entries */}
          {updates.map((update, index) => {
            const config = categoryConfig[update.category];
            const Icon = config.icon;

            return (
              <div key={index} className="relative pl-8 pb-6">
                {/* Timeline line */}
                {index < updates.length - 1 && (
                  <div className="absolute left-[15px] top-8 bottom-0 w-px bg-gradient-to-b from-white/20 to-transparent" />
                )}
                {/* Timeline dot */}
                <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-gray-800 border-2 border-white/20 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-gray-300" />
                </div>

                <div className="bg-gray-800/50 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors">
                  {/* Header */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge className={`text-[10px] border ${config.color}`}>
                      {config.label}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      {update.date}
                    </span>
                    {update.migrationId && (
                      <Badge variant="outline" className="text-[10px] text-gray-500 border-gray-600">
                        Migration: {update.migrationId}
                      </Badge>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-white mb-1">{update.title}</h3>
                  <p className="text-xs text-gray-400 mb-3">{update.description}</p>

                  {/* Details */}
                  <div className="space-y-1 mb-3">
                    {update.details.map((detail, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-300">
                        <CheckCircle2 className="w-3 h-3 mt-0.5 text-green-500 flex-shrink-0" />
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>

                  {/* Tables */}
                  {update.tablesAffected && update.tablesAffected.length > 0 && (
                    <div className="mb-2">
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                        <Database className="w-3 h-3" /> Tabelas Afetadas
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {update.tablesAffected.map((table, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] text-blue-300 border-blue-500/30 bg-blue-500/10">
                            {table}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Files */}
                  {update.filesChanged && update.filesChanged.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                        <Code className="w-3 h-3" /> Arquivos Alterados
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {update.filesChanged.map((file, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] text-purple-300 border-purple-500/30 bg-purple-500/10">
                            {file}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Footer */}
          <div className="text-center py-8 text-gray-500 text-xs">
            <p>🥥 CocoNudi v3.0 — Plataforma de Vídeos Curtos</p>
            <p className="mt-1">Desenvolvido com React + Supabase + Bunny.net</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default AtualizacoesPage;
