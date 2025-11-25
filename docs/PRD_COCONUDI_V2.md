# 📋 PRD - COCONUDI v2.0
## Product Requirements Document

**Versão:** 2.0  
**Data:** 2025-11-25  
**Status:** ✅ Em Produção (com melhorias propostas)

---

## 📊 Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura Técnica Atual](#2-arquitetura-técnica-atual)
3. [Estrutura de Dados](#3-estrutura-de-dados)
4. [Funcionalidades Implementadas](#4-funcionalidades-implementadas)
5. [Problemas Identificados](#5-problemas-identificados)
6. [Melhorias Propostas](#6-melhorias-propostas)
7. [Roadmap](#7-roadmap)
8. [Métricas de Sucesso](#8-métricas-de-sucesso)

---

## 1. Visão Geral

### 1.1 Resumo Executivo

**COCONUDI** é uma plataforma de vídeos curtos no estilo TikTok, especializada em conteúdo de modelos e criadores certificados. A plataforma combina:

- 🎬 Feed inteligente de vídeos verticais
- 👥 Sistema dual: Modelos (estáticos) + Criadores (usuários autenticados)
- 💎 Monetização via assinatura premium (PIX)
- 🎮 Gamificação completa
- 🛍️ Marketplace e comércios locais integrados
- 🎨 Painel administrativo robusto

### 1.2 Arquitetura Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     COCONUDI PLATFORM                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   FRONTEND   │  │     ADMIN    │  │   CREATOR    │      │
│  │   (React)    │  │   DASHBOARD  │  │    STUDIO    │      │
│  │              │  │              │  │              │      │
│  │ • TikTokApp  │  │ • Users Mgmt │  │ • Upload     │      │
│  │ • Profile    │  │ • Analytics  │  │ • Video Mgmt │      │
│  │ • Explore    │  │ • Content    │  │ • Stats      │      │
│  │ • Following  │  │ • Gamif.     │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
│         └─────────────────┴──────────────────┘               │
│                           │                                  │
│              ┌────────────▼────────────┐                    │
│              │   SUPABASE BACKEND      │                    │
│              ├─────────────────────────┤                    │
│              │ • PostgreSQL Database   │                    │
│              │ • Authentication        │                    │
│              │ • Storage (Avatars)     │                    │
│              │ • Edge Functions        │                    │
│              │ • Real-time Subs        │                    │
│              └─────────────────────────┘                    │
│                           │                                  │
│              ┌────────────▼────────────┐                    │
│              │   EXTERNAL SERVICES     │                    │
│              ├─────────────────────────┤                    │
│              │ • Bunny.net (CDN)       │                    │
│              │ • PIX Gateway           │                    │
│              └─────────────────────────┘                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Arquitetura Técnica Atual

### 2.1 Stack Tecnológico

**Frontend:**
- ⚛️ React 18.3.1 + TypeScript
- ⚡ Vite (Build Tool)
- 🎨 Tailwind CSS + shadcn/ui
- 🎭 Framer Motion (Animações)
- 🧭 React Router DOM v6
- 🔄 TanStack Query (State Management)

**Backend:**
- 🐘 Supabase (Backend as a Service)
  - PostgreSQL Database
  - Authentication (Email/Password, Anonymous)
  - Storage (Avatars)
  - Edge Functions (Deno)
  - Real-time Subscriptions

**Infraestrutura:**
- 🎥 Bunny.net (CDN para vídeos)
- 💳 PIX (Pagamentos)
- 📱 PWA (Progressive Web App)

### 2.2 Estrutura de Pastas

```
src/
├── components/
│   ├── admin/              # Painel administrativo
│   ├── creator/            # Creator Studio
│   ├── tiktok/             # Componentes do feed
│   └── ui/                 # shadcn/ui components
├── hooks/                  # Custom hooks
├── pages/                  # Páginas principais
├── integrations/
│   └── supabase/           # Cliente Supabase
├── types/                  # TypeScript types
└── utils/                  # Utilitários
```

---

## 3. Estrutura de Dados

### 3.1 Diagrama ER Simplificado

```
┌─────────────────┐
│   AUTH.USERS    │ ◄──┐
│  (Supabase)     │    │
└────────┬────────┘    │
         │             │
         │ 1:1         │ N:1
         ▼             │
┌─────────────────┐    │
│    PROFILES     │    │
│  (Public Data)  │    │
├─────────────────┤    │
│ • id (PK)       │    │
│ • email         │    │
│ • name          │    │
│ • avatar_url    │    │
│ • bio           │    │
│ • username      │    │
└────────┬────────┘    │
         │             │
         │ N:1         │
         ▼             │
┌─────────────────┐    │
│   USER_ROLES    │────┘
│  (Role System)  │
├─────────────────┤
│ • user_id (FK)  │
│ • role (enum)   │
│   - admin       │
│   - creator     │
│   - moderator   │
│   - user        │
└─────────────────┘

┌─────────────────┐
│     MODELS      │
│  (Static Data)  │
├─────────────────┤
│ • id (PK)       │
│ • username      │
│ • avatar_url    │
│ • bio           │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────────────────┐
│         VIDEOS              │
│   (Content Database)        │
├─────────────────────────────┤
│ • id (PK)                   │
│ • title                     │
│ • description               │
│ • video_url (Bunny.net)     │
│ • thumbnail_url             │
│ • thumbnail_locked          │
│ • model_id (FK) ◄───────────┼─── models.id (para vídeos de modelos)
│ • creator_id (FK) ◄─────────┼─── profiles.id (para vídeos de criadores)
│ • visibility (enum)         │
│   - public                  │
│   - premium                 │
│ • is_active                 │
│ • likes_count               │
│ • comments_count            │
│ • shares_count              │
│ • views_count               │
│ • created_at                │
│                             │
│ CHECK: (model_id IS NULL    │
│    AND creator_id IS NOT    │
│    NULL)                    │
│ OR (model_id IS NOT NULL    │
│    AND creator_id IS NULL)  │
└─────────────────────────────┘
         │
         │ 1:N
         ├────────────┬────────────┬──────────────┐
         ▼            ▼            ▼              ▼
    ┌────────┐  ┌──────────┐ ┌─────────┐  ┌──────────────┐
    │ LIKES  │  │ COMMENTS │ │ SHARES  │  │ VIDEO_VIEWS  │
    └────────┘  └──────────┘ └─────────┘  └──────────────┘

┌──────────────────┐         ┌───────────────────┐
│  USER_FOLLOWS    │         │ MODEL_FOLLOWERS   │
│  (Creators)      │         │ (Models)          │
├──────────────────┤         ├───────────────────┤
│ • follower_id    │         │ • user_id         │
│ • following_id   │         │ • model_id        │
└──────────────────┘         └───────────────────┘

┌──────────────────────┐
│  ANALYTICS_EVENTS    │
│  (Tracking)          │
├──────────────────────┤
│ • event_name         │
│ • user_id            │
│ • video_id           │
│ • model_id           │
│ • creator_id (NEW)   │
│ • event_data         │
└──────────────────────┘

┌───────────────────┐
│  PIX_PAYMENTS     │
│  (Monetização)    │
├───────────────────┤
│ • pix_code        │
│ • qr_code_base64  │
│ • amount          │
│ • status          │
│ • user_email      │
└───────────────────┘
         │
         │ 1:1
         ▼
┌───────────────────┐
│  PREMIUM_USERS    │
├───────────────────┤
│ • email           │
│ • subscription_   │
│   status          │
│ • start/end dates │
└───────────────────┘
```

### 3.2 Tabelas Principais

#### **profiles** (Dados públicos de usuários)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  email TEXT,
  name TEXT,                -- Nome completo
  avatar_url TEXT,
  bio TEXT,
  username TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **user_roles** (Sistema de roles)
```sql
CREATE TYPE app_role AS ENUM ('admin', 'creator', 'moderator', 'user');

CREATE TABLE user_roles (
  user_id UUID REFERENCES profiles(id),
  role app_role NOT NULL,
  PRIMARY KEY (user_id, role)
);
```

#### **videos** (Sistema dual: modelos + criadores)
```sql
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  thumbnail_locked TEXT,
  model_id UUID REFERENCES models(id),      -- Para vídeos de modelos
  creator_id UUID REFERENCES profiles(id),  -- Para vídeos de criadores
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'premium')),
  is_active BOOLEAN DEFAULT TRUE,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT check_video_owner CHECK (
    (model_id IS NOT NULL AND creator_id IS NULL) OR
    (model_id IS NULL AND creator_id IS NOT NULL)
  )
);
```

#### **user_follows** (Seguir criadores)
```sql
CREATE TABLE user_follows (
  follower_id UUID REFERENCES profiles(id),
  following_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);
```

#### **model_followers** (Seguir modelos)
```sql
CREATE TABLE model_followers (
  user_id UUID,
  model_id UUID REFERENCES models(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, model_id)
);
```

---

## 4. Funcionalidades Implementadas

### 4.1 Feed de Vídeos (TikTok-Style)

✅ **Implementado:**
- Scroll vertical infinito
- Autoplay ao entrar na viewport
- Player customizado (pausar, volume, progresso)
- Duplo toque para curtir (animação)
- Pré-carregamento de próximo vídeo
- Indicador de progresso
- Transições suaves

📍 **Localização:** `src/pages/TikTokApp.tsx`, `src/components/tiktok/VideoPlayer.tsx`

**Fluxo:**
```
Usuário entra no app
    ↓
Carrega vídeos (modelos + criadores)
    ↓
Scroll vertical
    ↓
Autoplay quando viewport >= 50%
    ↓
Interações (like, comment, share, follow)
```

### 4.2 Sistema de Autenticação

✅ **Implementado:**
- ✅ Registro de usuários (email/senha)
- ✅ Login de usuários
- ✅ Recuperação de senha
- ✅ Usuários anônimos (IDs temporários)
- ✅ Bloqueio após 5 vídeos (modal de login)
- ✅ Sistema de roles (admin, creator, moderator, user)
- ✅ Verificação de idade (18+)

📍 **Localização:** `src/pages/Auth.tsx`, `src/components/ProtectedRoute.tsx`

**Componentes de Auth:**
- `Auth.tsx` - Tela de login/cadastro/recuperação
- `ProtectedRoute.tsx` - Proteção de rotas privadas
- `AdminRoute.tsx` - Proteção de rotas admin

### 4.3 Sistema de Criadores de Conteúdo

✅ **Implementado:**
- ✅ Formulário de aplicação em 3 etapas
- ✅ Painel administrativo para aprovação
- ✅ Creator Studio para upload de vídeos
- ✅ Gerenciamento de vídeos publicados
- ✅ Edição de metadados (título, descrição)
- ✅ Pausar/ativar vídeos
- ✅ Soft delete (marcar inativo)
- ✅ Estatísticas por vídeo (views, likes)

📍 **Localização:** 
- `src/pages/CreatorApplication.tsx`
- `src/pages/CreatorStudio.tsx`
- `src/components/admin/AdminCreatorApplications.tsx`

**Fluxo de Creator:**
```
Usuário registrado
    ↓
Preenche aplicação (3 etapas)
    ↓
Admin aprova/rejeita
    ↓
Se aprovado → Role 'creator' atribuída
    ↓
Acesso ao Creator Studio
    ↓
Upload de vídeos
    ↓
Vídeos aparecem no feed principal
```

### 4.4 Interações Sociais

✅ **Implementado:**
- ✅ Like/Unlike em vídeos (com animação)
- ✅ Comentários (com contador)
- ✅ Compartilhamentos (copy link)
- ✅ Visualizações (tracking automático)
- ✅ Seguir modelos (model_followers)
- ✅ Seguir criadores (user_follows)
- ✅ Página "Seguindo" unificada

📍 **Localização:**
- `src/hooks/useVideoActions.tsx`
- `src/hooks/useCreatorFollow.tsx`
- `src/pages/FollowingPage.tsx`

**Sistema de IDs:**
```typescript
// Unificado para localStorage
const userId = await getUserId(); 
// Retorna: auth user ID (se logado) OU anonymous_user_id (localStorage)
```

### 4.5 Sistema Premium/VIP

✅ **Implementado:**
- ✅ Vídeos públicos vs premium
- ✅ Modal de upgrade premium
- ✅ Geração de PIX (código + QR code)
- ✅ Verificação de pagamento
- ✅ Registro em premium_users
- ✅ Acesso a conteúdo exclusivo
- ✅ Painéis personalizados de modelos

📍 **Localização:**
- `src/components/tiktok/PremiumModal.tsx`
- `src/hooks/usePremiumStatus.tsx`
- `supabase/functions/generate-pix/`
- `supabase/functions/verify-payment/`

**Edge Functions:**
- `generate-pix` - Gera código PIX + QR
- `verify-payment` - Verifica status de pagamento
- `payment-webhook` - Recebe notificações

### 4.6 Gamificação

✅ **Implementado:**
- ✅ Sistema de pontos por ação
- ✅ Níveis (Bronze → Diamante)
- ✅ Missões diárias configuráveis
- ✅ Streak (dias consecutivos)
- ✅ Limite de 3 ações/dia
- ✅ Painel admin de configuração

📍 **Localização:**
- `src/hooks/useGamification.tsx`
- `src/components/admin/AdminGamification.tsx`
- `src/components/admin/AdminDailyMissions.tsx`

**Pontuação:**
- Like: 5 pontos
- Comentário: 10 pontos
- Compartilhamento: 15 pontos
- Visualização: 2 pontos

### 4.7 Painel Administrativo

✅ **Implementado:**
- ✅ Dashboard com estatísticas em tempo real
- ✅ Gráficos (Chart.js)
- ✅ Gestão de usuários
- ✅ Gestão de vídeos
- ✅ Aprovação de criadores
- ✅ Configuração de missões
- ✅ Visualização de transações PIX
- ✅ Sistema de roles
- ✅ Mapa do Brasil com dados por estado

📍 **Localização:** `src/components/AdminDashboard.tsx`, `src/components/admin/*`

**Seções:**
- 📊 Home/Stats - KPIs e gráficos
- 👥 Usuários - Lista e gerenciamento
- 🎬 Vídeos - Gestão de conteúdo
- 👨‍💼 Criadores - Aprovação de aplicações
- 💎 Premium - Transações e assinantes
- 🎮 Gamificação - Config de missões
- ⚙️ Configurações - Integrações

### 4.8 Outras Features

✅ **Implementado:**
- ✅ Busca de vídeos/modelos
- ✅ Página de exploração (grid)
- ✅ Perfil de usuário (edição)
- ✅ Upload de avatar
- ✅ Página de marketplace
- ✅ Comércios locais
- ✅ Coleções (favoritos)
- ✅ Minhas assinaturas
- ✅ PWA (instalável)
- ✅ Offline handler
- ✅ Splash screen

---

## 5. Problemas Identificados

### 5.1 🔴 Críticos

#### **Problema 1: Inconsistência de IDs de Usuário**

**Descrição:**  
Existem 3 lugares diferentes onde IDs são armazenados/recuperados:
1. `localStorage.getItem('anonymous_user_id')`
2. `sessionStorage.getItem('anonymous_user_id')`
3. `supabase.auth.getUser().user.id`

**Impacto:**
- Follows registrados com um ID não são encontrados ao buscar com outro
- Criadores não aparecem na lista de "Seguindo"
- Analytics fragmentados

**Status:** ⚠️ Parcialmente resolvido (recentemente unificado para localStorage)

---

#### **Problema 2: Feed Inteligente Desativado**

**Descrição:**  
O hook `useIntelligentFeed.tsx` existe mas não está sendo usado. O `TikTokApp.tsx` usa queries diretas simples.

**Código Atual:**
```typescript
// TikTokApp.tsx - Query simplificada
const { data: models } = useQuery({
  queryKey: ['models'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('models')
      .select('*')
      .eq('is_active', true);
    return data || [];
  }
});
```

**Impacto:**
- Sem personalização por usuário
- Sem priorização de conteúdo favorito
- Sem controle de vídeos já vistos
- Feed puramente aleatório

**Solução Proposta:** Ver seção 6.2

---

#### **Problema 3: RLS Complexo Causando Erros**

**Descrição:**  
Políticas de RLS muito complexas causam erros de recursão infinita e permissões negadas.

**Exemplo de Erro:**
```
Error: infinite recursion detected in policy for table "user_roles"
```

**Causa:**
```sql
-- Política recursiva (MAL)
CREATE POLICY "admin_access" ON user_roles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles  -- ❌ Consulta a mesma tabela
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
```

**Impacto:**
- Bloqueio de funcionalidades críticas
- Admin não consegue acessar dados
- Criadores não aparecem no feed

**Solução Implementada:**
```sql
-- Função SECURITY DEFINER (BOM)
CREATE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Política usando a função
CREATE POLICY "admin_access" ON user_roles
FOR SELECT USING (
  public.has_role(auth.uid(), 'admin')  -- ✅ Sem recursão
);
```

---

### 5.2 ⚠️ Médios

#### **Problema 4: Duplicação de Lógica de Follow**

**Descrição:**  
Existem 2 sistemas de follow separados:
- `model_followers` (para modelos estáticos)
- `user_follows` (para criadores autenticados)

**Impacto:**
- Código duplicado
- Queries separadas na página "Seguindo"
- Maior chance de bugs

**Solução Possível:**  
Unificar em uma única tabela `follows` com tipo polimórfico.

---

#### **Problema 5: Analytics Fragmentados**

**Descrição:**  
`analytics_events` tem FK para `model_id` mas não para `creator_id`.

**Impacto:**
- Analytics de vídeos de criadores falham
- Impossível rastrear performance de criadores
- Dados incompletos no admin dashboard

**Solução Implementada:**
Adicionar coluna `creator_id` nullable e tornar `model_id` nullable.

---

### 5.3 🟡 Baixos

- Feed não memoriza posição de scroll ao voltar
- Sem notificações push
- Sem dark mode completo
- Sem sistema de stories
- Sem live streaming
- Sem hashtags/trends

---

## 6. Melhorias Propostas

### 6.1 🔧 Melhorias Técnicas

#### **Melhoria 1: Unificar Sistema de IDs**

**Objetivo:** Ter uma única fonte de verdade para user ID.

**Implementação:**
```typescript
// hooks/useUnifiedUserId.ts
export const useUnifiedUserId = () => {
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    const loadUserId = async () => {
      // 1. Tentar pegar do auth
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        // Migrar ID anônimo se existir
        const anonId = localStorage.getItem('anonymous_user_id');
        if (anonId && anonId !== user.id) {
          await migrateAnonymousData(anonId, user.id);
          localStorage.removeItem('anonymous_user_id');
        }
        return;
      }
      
      // 2. Fallback para anônimo (localStorage)
      let anonId = localStorage.getItem('anonymous_user_id');
      if (!anonId) {
        anonId = crypto.randomUUID();
        localStorage.setItem('anonymous_user_id', anonId);
      }
      setUserId(anonId);
    };
    
    loadUserId();
  }, []);
  
  return userId;
};
```

**Benefícios:**
- ✅ Fonte única de verdade
- ✅ Migração automática de dados anônimos
- ✅ Sem inconsistências

---

#### **Melhoria 2: Implementar Feed Inteligente Simplificado**

**Objetivo:** Feed personalizado sem complexidade excessiva.

**Estratégia:**
```typescript
// hooks/useFeedMixture.ts
export const useFeedMixture = (userId: string) => {
  const queryFn = async () => {
    // 1. Buscar vídeos recentes (40%)
    const recentVideos = await getRecentVideos(40);
    
    // 2. Buscar de criadores seguidos (30%)
    const followedCreatorsVideos = await getFollowedCreatorsVideos(userId, 30);
    
    // 3. Buscar aleatórios (30%)
    const randomVideos = await getRandomVideos(30);
    
    // 4. Mix e shuffle
    return shuffleArray([
      ...recentVideos,
      ...followedCreatorsVideos,
      ...randomVideos
    ]);
  };
  
  return useQuery({
    queryKey: ['feed-mixture', userId],
    queryFn
  });
};
```

**Mix:**
- 40% vídeos novos (últimos 7 dias)
- 30% criadores seguidos
- 30% descoberta aleatória

---

#### **Melhoria 3: Simplificar RLS com Funções Helper**

**Objetivo:** Evitar recursão infinita e facilitar manutenção.

**Padrão:**
```sql
-- 1. Criar função helper
CREATE FUNCTION public.is_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = 'admin'
  );
$$;

-- 2. Usar em todas as políticas
CREATE POLICY "admins_select_all" ON videos
FOR SELECT USING (public.is_admin());

CREATE POLICY "admins_update_all" ON videos
FOR UPDATE USING (public.is_admin());
```

**Benefícios:**
- ✅ Sem recursão
- ✅ Código reutilizável
- ✅ Mais performático (query plan cacheado)

---

### 6.2 🎨 Melhorias de UX

#### **Melhoria 4: Onboarding de Usuário**

**Proposta:**
```
Novo usuário acessa
    ↓
Tela de boas-vindas (swipeable)
    ↓
Seleção de interesses/categorias
    ↓
Feed personalizado desde o início
```

**Componentes:**
- `OnboardingScreen.tsx`
- `InterestSelector.tsx`

---

#### **Melhoria 5: Perfil de Criador Dedicado**

**Proposta:**  
Criadores devem ter perfil diferenciado de usuários comuns.

**Features:**
- Badge "✨ Criador Certificado"
- Estatísticas públicas (views totais, likes)
- Botão "Assinar" para conteúdo premium
- Grade de vídeos publicados
- Bio estendida

**Rota:** `/creator/:username`

---

#### **Melhoria 6: Sistema de Notificações**

**Proposta:**
- Novo seguidor
- Novo comentário no seu vídeo
- Like no seu vídeo
- Vídeo de criador seguido
- Assinatura premium expirando

**Tabela:**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  type TEXT, -- 'follow', 'comment', 'like', 'new_video', 'premium_expiring'
  title TEXT,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 6.3 ✨ Novas Funcionalidades

#### **Funcionalidade 1: Stories (24h)**

**Descrição:**  
Stories que desaparecem em 24h, igual Instagram/WhatsApp.

**Tabela:**
```sql
CREATE TABLE stories (
  id UUID PRIMARY KEY,
  creator_id UUID REFERENCES profiles(id),
  media_url TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('image', 'video')),
  expires_at TIMESTAMPTZ NOT NULL,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**UI:**
- Barra horizontal de avatares no topo
- Ring colorido para stories não vistas
- Tap para avançar, hold para pausar

---

#### **Funcionalidade 2: Duets/Reacts**

**Descrição:**  
Permitir que criadores façam duetos ou reações a vídeos.

**Tabela:**
```sql
CREATE TABLE video_responses (
  id UUID PRIMARY KEY,
  original_video_id UUID REFERENCES videos(id),
  response_video_id UUID REFERENCES videos(id),
  response_type TEXT CHECK (response_type IN ('duet', 'react')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### **Funcionalidade 3: Hashtags e Trends**

**Descrição:**  
Sistema de hashtags para descoberta de conteúdo.

**Tabelas:**
```sql
CREATE TABLE hashtags (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  use_count INTEGER DEFAULT 0
);

CREATE TABLE video_hashtags (
  video_id UUID REFERENCES videos(id),
  hashtag_id UUID REFERENCES hashtags(id),
  PRIMARY KEY (video_id, hashtag_id)
);
```

**UI:**
- Página "Trending" com hashtags populares
- Busca por hashtag
- Sugestões ao digitar hashtag

---

#### **Funcionalidade 4: Live Streaming**

**Descrição:**  
Transmissões ao vivo para criadores.

**Integração:**  
- Bunny.net Stream (já usado para vídeos)
- WebRTC para baixa latência

**Features:**
- Chat ao vivo
- Presentes virtuais
- Contador de espectadores
- Gravação automática (vira vídeo normal)

---

#### **Funcionalidade 5: Dark Mode Completo**

**Descrição:**  
Implementar tema escuro em todos os componentes.

**Implementação:**
```typescript
// ThemeProvider usando next-themes
import { ThemeProvider } from 'next-themes';

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
      {/* ... */}
    </ThemeProvider>
  );
}
```

**Ajustes:**
- Atualizar `index.css` com variáveis dark
- Adicionar toggle no menu
- Persistir preferência

---

## 7. Roadmap

### 7.1 Fase 1: Estabilização (1-2 meses)

**Objetivo:** Corrigir bugs críticos e melhorar performance.

**Tasks:**
- ✅ Unificar sistema de IDs (CONCLUÍDO)
- ⏳ Implementar feed inteligente simplificado
- ⏳ Simplificar RLS com funções helper
- ⏳ Adicionar testes E2E críticos
- ⏳ Otimizar queries lentas
- ⏳ Implementar error tracking (Sentry)

---

### 7.2 Fase 2: Melhorias de UX (2-3 meses)

**Objetivo:** Melhorar experiência do usuário.

**Tasks:**
- ⏳ Onboarding de usuário
- ⏳ Perfil de criador dedicado
- ⏳ Sistema de notificações
- ⏳ Dark mode completo
- ⏳ Melhorar velocidade de carregamento
- ⏳ PWA offline-first

---

### 7.3 Fase 3: Novas Features (3-6 meses)

**Objetivo:** Adicionar funcionalidades diferenciadas.

**Tasks:**
- ⏳ Stories (24h)
- ⏳ Duets/Reacts
- ⏳ Hashtags e Trends
- ⏳ Sistema de badges/conquistas
- ⏳ Chat melhorado (áudio/vídeo)
- ⏳ Filtros de vídeo

---

### 7.4 Fase 4: Monetização Avançada (6-12 meses)

**Objetivo:** Maximizar receita.

**Tasks:**
- ⏳ Live streaming com presentes
- ⏳ Assinatura de criadores individuais
- ⏳ Marketplace de produtos
- ⏳ Programa de afiliados
- ⏳ Sistema de referência
- ⏳ API pública para parceiros

---

## 8. Métricas de Sucesso

### 8.1 KPIs de Engajamento

| Métrica | Valor Atual | Meta Q1 2025 | Meta Q2 2025 |
|---------|-------------|--------------|--------------|
| **MAU** (Monthly Active Users) | - | 10K | 50K |
| **DAU** (Daily Active Users) | - | 2K | 15K |
| **Tempo médio de sessão** | - | 15 min | 25 min |
| **Vídeos assistidos/usuário** | - | 20 | 35 |
| **Taxa de retenção D7** | - | 30% | 45% |
| **Taxa de retenção D30** | - | 15% | 25% |

### 8.2 KPIs de Conversão

| Métrica | Valor Atual | Meta Q1 2025 | Meta Q2 2025 |
|---------|-------------|--------------|--------------|
| **Taxa de cadastro** | - | 5% | 10% |
| **Conversão para Premium** | - | 2% | 5% |
| **LTV** (Lifetime Value) | - | R$ 50 | R$ 120 |
| **ARPU** (Avg Revenue Per User) | - | R$ 5 | R$ 12 |
| **Churn rate** | - | 20% | 10% |
| **MRR** (Monthly Recurring Revenue) | - | R$ 10K | R$ 60K |

### 8.3 KPIs de Conteúdo

| Métrica | Valor Atual | Meta Q1 2025 | Meta Q2 2025 |
|---------|-------------|--------------|--------------|
| **Criadores ativos** | ~5 | 50 | 200 |
| **Vídeos publicados/dia** | - | 20 | 100 |
| **Taxa de aprovação de criadores** | - | 70% | 80% |
| **Engagement médio (likes/views)** | - | 5% | 8% |
| **Comentários/vídeo** | - | 3 | 8 |

---

## 📝 Notas Finais

Este PRD é um documento vivo e deve ser atualizado conforme o produto evolui. 

**Próximos passos:**
1. Revisar e aprovar roadmap
2. Priorizar tasks da Fase 1
3. Definir sprints e responsáveis
4. Implementar tracking de métricas
5. Setup de testes automatizados

**Documentos Relacionados:**
- `TECHNICAL_IMPROVEMENTS.md` - Detalhes técnicos das melhorias
- `IMPLEMENTATION_CHECKLIST.md` - Checklist de tasks
- `PRD_COCONUDI.md` - PRD original (v1.0)

---

**Última atualização:** 2025-11-25  
**Versão:** 2.0  
**Status:** ✅ Aprovado para implementação
