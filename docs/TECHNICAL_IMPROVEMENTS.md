# 🔧 TECHNICAL IMPROVEMENTS - COCONUDI
## Guia de Melhorias Técnicas

**Versão:** 1.0  
**Data:** 2025-11-25

---

## 📋 Índice

1. [Unificação do Sistema de IDs](#1-unificação-do-sistema-de-ids)
2. [Simplificação de RLS](#2-simplificação-de-rls)
3. [Feed Inteligente Simplificado](#3-feed-inteligente-simplificado)
4. [Reorganização de Hooks](#4-reorganização-de-hooks)
5. [Estrutura de Componentes](#5-estrutura-de-componentes)
6. [Performance e Otimizações](#6-performance-e-otimizações)

---

## 1. Unificação do Sistema de IDs

### 1.1 Problema Atual

Existem **3 lugares diferentes** onde user IDs são armazenados/recuperados:

```typescript
// Lugar 1: localStorage
const anonId1 = localStorage.getItem('anonymous_user_id');

// Lugar 2: sessionStorage
const anonId2 = sessionStorage.getItem('anonymous_user_id');

// Lugar 3: Supabase Auth
const { data: { user } } = await supabase.auth.getUser();
const authId = user?.id;
```

**Impacto:**
- ❌ Follows registrados com ID1 não são encontrados ao buscar com ID2
- ❌ Analytics fragmentados
- ❌ Dados duplicados
- ❌ Bugs difíceis de rastrear

---

### 1.2 Solução: Hook Unificado

#### **Criar `hooks/useUnifiedUserId.ts`**

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook unificado para gerenciamento de User ID
 * 
 * Hierarquia de prioridade:
 * 1. Authenticated User ID (Supabase Auth)
 * 2. Anonymous User ID (localStorage)
 * 
 * Features:
 * - Migração automática de dados anônimos ao fazer login
 * - Fonte única de verdade
 * - Sincronização entre tabs
 */
export const useUnifiedUserId = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadUserId = async () => {
      setIsLoading(true);
      
      try {
        // 1️⃣ Tentar pegar do Supabase Auth
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user?.id) {
          console.log('✅ useUnifiedUserId: Usuário autenticado:', user.id);
          setUserId(user.id);
          setIsAnonymous(false);
          
          // 🔄 Migrar dados anônimos se existir
          const anonId = localStorage.getItem('anonymous_user_id');
          if (anonId && anonId !== user.id) {
            console.log('🔄 Migrando dados de:', anonId, '→', user.id);
            await migrateAnonymousData(anonId, user.id);
            localStorage.removeItem('anonymous_user_id');
          }
          
          setIsLoading(false);
          return;
        }
        
        // 2️⃣ Fallback para ID anônimo (localStorage)
        let anonId = localStorage.getItem('anonymous_user_id');
        
        if (!anonId) {
          anonId = crypto.randomUUID();
          localStorage.setItem('anonymous_user_id', anonId);
          console.log('✅ useUnifiedUserId: Criado ID anônimo:', anonId);
        } else {
          console.log('✅ useUnifiedUserId: Usando ID anônimo existente:', anonId);
        }
        
        setUserId(anonId);
        setIsAnonymous(true);
      } catch (error) {
        console.error('❌ Erro ao carregar user ID:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserId();
    
    // 🔔 Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        loadUserId(); // Recarrega ao fazer login
      } else if (event === 'SIGNED_OUT') {
        // Criar novo ID anônimo ao fazer logout
        const newAnonId = crypto.randomUUID();
        localStorage.setItem('anonymous_user_id', newAnonId);
        setUserId(newAnonId);
        setIsAnonymous(true);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { userId, isAnonymous, isLoading };
};

/**
 * Migra dados de um ID anônimo para o ID autenticado
 */
async function migrateAnonymousData(fromId: string, toId: string) {
  try {
    // Migrar likes
    await supabase
      .from('likes')
      .update({ user_id: toId })
      .eq('user_id', fromId);
    
    // Migrar comentários
    await supabase
      .from('comments')
      .update({ user_id: toId })
      .eq('user_id', fromId);
    
    // Migrar follows de modelos
    await supabase
      .from('model_followers')
      .update({ user_id: toId })
      .eq('user_id', fromId);
    
    // Migrar follows de criadores
    await supabase
      .from('user_follows')
      .update({ follower_id: toId })
      .eq('follower_id', fromId);
    
    // Migrar analytics
    await supabase
      .from('analytics_events')
      .update({ user_id: toId })
      .eq('user_id', fromId);
    
    console.log('✅ Migração de dados concluída!');
  } catch (error) {
    console.error('❌ Erro ao migrar dados:', error);
  }
}
```

---

#### **Atualizar todos os componentes para usar o novo hook**

**Antes:**
```typescript
// TikTokApp.tsx
const userId = localStorage.getItem('anonymous_user_id') || 
               (await supabase.auth.getUser()).data.user?.id;
```

**Depois:**
```typescript
// TikTokApp.tsx
import { useUnifiedUserId } from '@/hooks/useUnifiedUserId';

function TikTokApp() {
  const { userId, isAnonymous, isLoading } = useUnifiedUserId();
  
  if (isLoading) return <LoadingSpinner />;
  if (!userId) return <ErrorScreen />;
  
  // Usar userId em todas as interações
  const handleLike = async (videoId: string) => {
    await supabase.from('likes').insert({
      user_id: userId,  // ✅ Sempre consistente
      video_id: videoId
    });
  };
  
  // ...
}
```

---

#### **Remover `getUserId.ts` e `getUserIdSync()`**

Esses utilitários devem ser **descontinuados** em favor do hook unificado.

**Migration checklist:**
- [ ] Substituir todos os usos de `getUserId()` por `useUnifiedUserId()`
- [ ] Substituir todos os usos de `getUserIdSync()` por `useUnifiedUserId()`
- [ ] Remover imports de `src/utils/getUserId.ts`
- [ ] Deletar arquivo `src/utils/getUserId.ts`
- [ ] Testar fluxo completo: anônimo → login → migração de dados

---

## 2. Simplificação de RLS

### 2.1 Problema Atual

Políticas RLS complexas causam **recursão infinita** e **erros de permissão**.

**Exemplo de política problemática:**
```sql
-- ❌ RECURSÃO INFINITA
CREATE POLICY "admin_select_all" ON videos
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles  -- 🔥 Consulta user_roles dentro de policy de user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
```

**Erro gerado:**
```
ERROR: infinite recursion detected in policy for table "user_roles"
```

---

### 2.2 Solução: Funções SECURITY DEFINER

#### **Criar funções helper no Supabase**

```sql
-- 1️⃣ Função para verificar role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER  -- ✅ Executa com privilégios de owner, ignora RLS
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- 2️⃣ Função para verificar se é admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.has_role(_user_id, 'admin');
$$;

-- 3️⃣ Função para verificar se é creator
CREATE OR REPLACE FUNCTION public.is_creator(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.has_role(_user_id, 'creator');
$$;

-- 4️⃣ Função para verificar se é owner do vídeo
CREATE OR REPLACE FUNCTION public.is_video_owner(_video_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.videos
    WHERE id = _video_id AND creator_id = _user_id
  );
$$;
```

---

#### **Usar funções nas políticas RLS**

```sql
-- ✅ POLÍTICA SIMPLIFICADA (user_roles)
DROP POLICY IF EXISTS "user_roles_select_combined" ON public.user_roles;

CREATE POLICY "user_roles_select_combined" ON public.user_roles
FOR SELECT USING (
  auth.uid() = user_id                    -- Próprio usuário
  OR public.is_admin()                     -- OU admin
);

-- ✅ POLÍTICA SIMPLIFICADA (videos)
DROP POLICY IF EXISTS "videos_select_public" ON public.videos;

CREATE POLICY "videos_select_public" ON public.videos
FOR SELECT USING (
  is_active = true                         -- Vídeos ativos
  AND (
    visibility = 'public'                  -- Público
    OR public.is_admin()                   -- OU admin
    OR creator_id = auth.uid()             -- OU dono do vídeo
  )
);

-- ✅ POLÍTICA SIMPLIFICADA (videos - UPDATE para creators)
DROP POLICY IF EXISTS "creators_update_own_videos" ON public.videos;

CREATE POLICY "creators_update_own_videos" ON public.videos
FOR UPDATE USING (
  public.is_creator()                      -- É creator
  AND creator_id = auth.uid()              -- E é dono do vídeo
);

-- ✅ POLÍTICA SIMPLIFICADA (videos - DELETE para creators)
DROP POLICY IF EXISTS "creators_delete_own_videos" ON public.videos;

CREATE POLICY "creators_delete_own_videos" ON public.videos
FOR DELETE USING (
  public.is_creator()                      -- É creator
  AND creator_id = auth.uid()              -- E é dono do vídeo
);
```

---

#### **Padrão de nomenclatura de políticas**

```sql
-- Formato: {tabela}_{operação}_{condição}

-- Exemplos:
videos_select_public           -- SELECT para todos (vídeos públicos)
videos_select_own_creator      -- SELECT do próprio criador
videos_insert_creator          -- INSERT para creators
videos_update_own_creator      -- UPDATE do próprio criador
videos_delete_own_creator      -- DELETE do próprio criador
admin_select_all               -- SELECT para admins (todas as tabelas)
admin_update_all               -- UPDATE para admins
```

---

#### **Checklist de migração RLS**

- [ ] Criar todas as funções helper (`has_role`, `is_admin`, `is_creator`, `is_video_owner`)
- [ ] Atualizar políticas de `user_roles`
- [ ] Atualizar políticas de `videos`
- [ ] Atualizar políticas de `likes`, `comments`, `shares`
- [ ] Atualizar políticas de `user_follows`, `model_followers`
- [ ] Atualizar políticas de `analytics_events`
- [ ] Testar cada operação (SELECT, INSERT, UPDATE, DELETE)
- [ ] Verificar que não há recursão
- [ ] Verificar que admins têm acesso total
- [ ] Verificar que creators conseguem gerenciar seus vídeos
- [ ] Verificar que usuários veem apenas conteúdo público

---

## 3. Feed Inteligente Simplificado

### 3.1 Problema Atual

O hook `useIntelligentFeed.tsx` existe mas não é usado. O `TikTokApp.tsx` usa query simples que retorna todos os vídeos aleatoriamente.

**Query atual (simplificada demais):**
```typescript
const { data: videos } = useQuery({
  queryKey: ['videos'],
  queryFn: async () => {
    const { data } = await supabase
      .from('videos')
      .select('*')
      .eq('is_active', true);
    return data || [];
  }
});
```

**Problemas:**
- ❌ Sem personalização
- ❌ Sem priorização de seguidos
- ❌ Vídeos repetidos
- ❌ Sem mix estratégico

---

### 3.2 Solução: Hook `useFeedMixture`

#### **Criar `hooks/useFeedMixture.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FeedMixtureOptions {
  userId: string;
  limit?: number;
  excludeVideoIds?: string[];
}

/**
 * Feed inteligente simplificado
 * 
 * Mix de conteúdo:
 * - 40% Vídeos novos (últimos 7 dias)
 * - 30% Criadores seguidos
 * - 30% Descoberta aleatória
 */
export const useFeedMixture = ({ 
  userId, 
  limit = 30,
  excludeVideoIds = []
}: FeedMixtureOptions) => {
  
  return useQuery({
    queryKey: ['feed-mixture', userId, limit, excludeVideoIds],
    queryFn: async () => {
      const videos: any[] = [];
      
      // 1️⃣ Buscar vídeos novos (40% = 12 vídeos)
      const recentCount = Math.floor(limit * 0.4);
      const { data: recentVideos } = await supabase
        .from('videos')
        .select(`
          *,
          models (*),
          profiles:creator_id (*)
        `)
        .eq('is_active', true)
        .not('id', 'in', `(${excludeVideoIds.join(',')})`)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(recentCount);
      
      if (recentVideos) videos.push(...recentVideos);
      
      // 2️⃣ Buscar de criadores seguidos (30% = 9 vídeos)
      const followedCount = Math.floor(limit * 0.3);
      
      // Buscar IDs de criadores seguidos
      const { data: followedCreators } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', userId);
      
      if (followedCreators && followedCreators.length > 0) {
        const creatorIds = followedCreators.map(f => f.following_id);
        
        const { data: followedVideos } = await supabase
          .from('videos')
          .select(`
            *,
            profiles:creator_id (*)
          `)
          .eq('is_active', true)
          .in('creator_id', creatorIds)
          .not('id', 'in', `(${[...excludeVideoIds, ...videos.map(v => v.id)].join(',')})`)
          .order('created_at', { ascending: false })
          .limit(followedCount);
        
        if (followedVideos) videos.push(...followedVideos);
      }
      
      // 3️⃣ Buscar aleatórios (30% = 9 vídeos)
      const randomCount = limit - videos.length;
      const usedIds = videos.map(v => v.id);
      
      const { data: randomVideos } = await supabase
        .from('videos')
        .select(`
          *,
          models (*),
          profiles:creator_id (*)
        `)
        .eq('is_active', true)
        .not('id', 'in', `(${[...excludeVideoIds, ...usedIds].join(',')})`)
        .limit(randomCount * 2); // Buscar mais para embaralhar
      
      if (randomVideos) {
        const shuffled = randomVideos.sort(() => Math.random() - 0.5);
        videos.push(...shuffled.slice(0, randomCount));
      }
      
      // 4️⃣ Shuffle final para misturar categorias
      return videos.sort(() => Math.random() - 0.5);
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000,   // 10 minutos
  });
};
```

---

#### **Usar no TikTokApp.tsx**

```typescript
import { useFeedMixture } from '@/hooks/useFeedMixture';
import { useUnifiedUserId } from '@/hooks/useUnifiedUserId';

function TikTokApp() {
  const { userId } = useUnifiedUserId();
  const [watchedVideoIds, setWatchedVideoIds] = useState<string[]>([]);
  
  const { data: videos, isLoading } = useFeedMixture({
    userId: userId!,
    limit: 30,
    excludeVideoIds: watchedVideoIds
  });
  
  const handleVideoWatched = (videoId: string) => {
    setWatchedVideoIds(prev => [...prev, videoId]);
  };
  
  // ...
}
```

---

## 4. Reorganização de Hooks

### 4.1 Estrutura Atual

Hooks estão todos em uma pasta plana:

```
src/hooks/
├── useAdminAnalytics.tsx
├── useAnalytics.tsx
├── useAppAnalytics.tsx
├── useCreatorFollow.tsx
├── useCreatorVideos.tsx
├── useCurrentUser.tsx
├── useDailyMissions.tsx
├── useFinancialData.tsx
├── useGamification.tsx
├── useIntelligentFeed.tsx
├── usePixPayment.tsx
├── usePremiumStatus.tsx
├── useVideoActions.tsx
└── ... (20+ arquivos)
```

**Problemas:**
- Difícil encontrar hooks relacionados
- Sem categorização
- Hooks com nomes similares

---

### 4.2 Estrutura Proposta

```
src/hooks/
├── auth/
│   ├── useUnifiedUserId.ts        ✨ NOVO
│   ├── useCurrentUser.tsx
│   ├── usePremiumStatus.tsx
│   └── useUserRoles.tsx
│
├── feed/
│   ├── useFeedMixture.ts          ✨ NOVO
│   ├── useIntelligentFeed.tsx     ⚠️ DEPRECADO
│   ├── useHybridFeed.tsx
│   └── useDailyViews.tsx
│
├── interaction/
│   ├── useVideoActions.tsx
│   ├── useCreatorFollow.tsx
│   └── useLikes.ts                ✨ NOVO (extraído de useVideoActions)
│
├── creator/
│   ├── useCreatorVideos.tsx
│   └── useCreatorStats.ts         ✨ NOVO
│
├── admin/
│   ├── useAdminAnalytics.tsx
│   ├── useAdminSettings.tsx
│   ├── useFinancialData.tsx
│   └── useRealTimeStats.tsx
│
├── gamification/
│   ├── useGamification.tsx
│   ├── useDailyMissions.tsx
│   └── useRewards.ts              ✨ NOVO
│
├── payment/
│   ├── usePixPayment.tsx
│   └── useSubscriptions.ts        ✨ NOVO
│
└── tracking/
    ├── useAnalytics.tsx
    ├── useAppAnalytics.tsx
    └── useGeolocation.tsx
```

---

## 5. Estrutura de Componentes

### 5.1 Estrutura Atual

Componentes estão organizados mas podem melhorar:

```
src/components/
├── admin/           (30+ arquivos)
├── creator/         (3 arquivos)
├── tiktok/          (20+ arquivos)
└── ui/              (50+ arquivos shadcn)
```

---

### 5.2 Estrutura Proposta

```
src/components/
├── admin/
│   ├── dashboard/
│   │   ├── AdminStats.tsx
│   │   ├── AdminCharts.tsx
│   │   └── SaleNotification.tsx
│   │
│   ├── users/
│   │   ├── AdminUsers.tsx
│   │   ├── AdminRoles.tsx
│   │   └── BulkEmailModal.tsx
│   │
│   ├── content/
│   │   ├── AdminVideos.tsx
│   │   ├── AdminContentTable.tsx
│   │   └── VideoPreviewModal.tsx
│   │
│   ├── creators/
│   │   └── AdminCreatorApplications.tsx
│   │
│   ├── gamification/
│   │   ├── AdminGamification.tsx
│   │   └── AdminDailyMissions.tsx
│   │
│   └── layout/
│       ├── AdminHeader.tsx
│       └── AdminNavigation.tsx
│
├── creator/
│   ├── studio/
│   │   ├── VideoUploadForm.tsx    ✨ NOVO
│   │   ├── VideoManagementTable.tsx
│   │   ├── EditVideoModal.tsx
│   │   └── DeleteVideoDialog.tsx
│   │
│   └── profile/
│       └── CreatorProfileCard.tsx ✨ NOVO
│
├── feed/
│   ├── player/
│   │   ├── VideoPlayer.tsx
│   │   ├── UniversalVideoPlayer.tsx
│   │   ├── VideoProgressBar.tsx
│   │   └── VinylRecord.tsx
│   │
│   ├── interactions/
│   │   ├── LikeButton.tsx         ✨ NOVO (extraído)
│   │   ├── CommentButton.tsx      ✨ NOVO
│   │   ├── ShareButton.tsx        ✨ NOVO
│   │   └── FollowButton.tsx       ✨ NOVO
│   │
│   ├── screens/
│   │   ├── CommentsScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── ChatScreen.tsx
│   │   └── SearchModal.tsx
│   │
│   └── layout/
│       ├── BottomInfo.tsx
│       ├── SideMenu.tsx
│       └── CategoryMenu.tsx
│
├── shared/
│   ├── navigation/
│   │   ├── ProtectedRoute.tsx
│   │   ├── AdminRoute.tsx
│   │   └── BottomNavigation.tsx   ✨ NOVO
│   │
│   ├── modals/
│   │   ├── PremiumModal.tsx
│   │   ├── LoginRequiredModal.tsx
│   │   ├── AgeVerificationModal.tsx
│   │   └── FullscreenVideoModal.tsx
│   │
│   └── carousels/
│       ├── ModelCarousel.tsx
│       ├── AdCarousel.tsx
│       ├── MarketplaceCarousel.tsx
│       └── LocalBusinessCarousel.tsx
│
└── ui/              (shadcn - não mexer)
```

---

## 6. Performance e Otimizações

### 6.1 Lazy Loading de Rotas

```typescript
// App.tsx
import { lazy, Suspense } from 'react';

const TikTokApp = lazy(() => import('@/pages/TikTokApp'));
const AdminDashboard = lazy(() => import('@/components/AdminDashboard'));
const CreatorStudio = lazy(() => import('@/pages/CreatorStudio'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/app" element={<TikTokApp />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/creator-studio" element={<CreatorStudio />} />
      </Routes>
    </Suspense>
  );
}
```

---

### 6.2 Memoização de Componentes Pesados

```typescript
// VideoPlayer.tsx
import { memo } from 'react';

export const VideoPlayer = memo(({ video, isActive }) => {
  // ... código do player
}, (prevProps, nextProps) => {
  // Re-render apenas se vídeo ou estado mudou
  return prevProps.video.id === nextProps.video.id &&
         prevProps.isActive === nextProps.isActive;
});
```

---

### 6.3 Virtualização de Listas

```typescript
// FollowingPage.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function FollowingPage() {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const rowVirtualizer = useVirtualizer({
    count: followedEntities.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });
  
  return (
    <div ref={parentRef} style={{ height: '100vh', overflow: 'auto' }}>
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
        {rowVirtualizer.getVirtualItems().map((virtualItem) => (
          <div key={virtualItem.key} style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: `${virtualItem.size}px`,
            transform: `translateY(${virtualItem.start}px)`,
          }}>
            <EntityCard entity={followedEntities[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### 6.4 Cache de Queries

```typescript
// Configuração global do React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutos
      gcTime: 10 * 60 * 1000,        // 10 minutos
      refetchOnWindowFocus: false,   // Não refetch ao focar janela
      retry: 1,                      // Apenas 1 retry
    },
  },
});
```

---

### 6.5 Image Optimization

```typescript
// Usar srcset para responsividade
<img
  src={thumbnail_url}
  srcSet={`
    ${thumbnail_url}?w=400 400w,
    ${thumbnail_url}?w=800 800w,
    ${thumbnail_url}?w=1200 1200w
  `}
  sizes="(max-width: 768px) 400px, (max-width: 1200px) 800px, 1200px"
  alt={title}
  loading="lazy"
/>
```

---

## 📝 Checklist de Implementação

### Prioridade Alta 🔴
- [ ] Implementar `useUnifiedUserId` hook
- [ ] Migrar todos os componentes para usar novo hook
- [ ] Criar funções RLS helper (`has_role`, `is_admin`, etc)
- [ ] Simplificar todas as políticas RLS usando funções
- [ ] Implementar `useFeedMixture` hook
- [ ] Testar fluxo completo de feed

### Prioridade Média 🟡
- [ ] Reorganizar estrutura de hooks
- [ ] Reorganizar estrutura de componentes
- [ ] Implementar lazy loading de rotas
- [ ] Adicionar memoização em componentes pesados
- [ ] Otimizar queries com cache strategy

### Prioridade Baixa 🟢
- [ ] Implementar virtualização em listas longas
- [ ] Otimizar imagens com srcset
- [ ] Adicionar error boundaries
- [ ] Implementar retry logic em queries
- [ ] Adicionar logs estruturados

---

**Última atualização:** 2025-11-25  
**Versão:** 1.0
