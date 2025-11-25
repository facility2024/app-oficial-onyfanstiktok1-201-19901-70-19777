# ✅ IMPLEMENTATION CHECKLIST - COCONUDI
## Lista de Tarefas Priorizadas

**Versão:** 1.0  
**Data:** 2025-11-25

---

## 📋 Como usar este checklist

1. **Prioridades:**
   - 🔴 **Alta** - Bugs críticos, problemas de segurança
   - 🟡 **Média** - Melhorias de UX, otimizações
   - 🟢 **Baixa** - Nice to have, refinamentos

2. **Status:**
   - ⏳ **A fazer** - Não iniciado
   - 🚧 **Em progresso** - Trabalhando nisso
   - ✅ **Concluído** - Implementado e testado
   - ⚠️ **Bloqueado** - Aguardando dependência

3. **Estimativas:**
   - 🕐 Rápido (< 2h)
   - 🕑 Médio (2-6h)
   - 🕒 Longo (> 6h)

---

## 🔴 FASE 1: ESTABILIZAÇÃO (Crítico)

### 1.1 Unificação do Sistema de IDs

**Objetivo:** Eliminar inconsistências de user IDs entre localStorage, sessionStorage e auth.

| Task | Status | Prioridade | Estimativa | Responsável |
|------|--------|------------|------------|-------------|
| Criar hook `useUnifiedUserId` | ✅ | 🔴 Alta | 🕑 Médio | - |
| Implementar função de migração de dados | ⏳ | 🔴 Alta | 🕑 Médio | - |
| Atualizar `TikTokApp.tsx` para usar novo hook | ⏳ | 🔴 Alta | 🕐 Rápido | - |
| Atualizar `FollowingPage.tsx` para usar novo hook | ⏳ | 🔴 Alta | 🕐 Rápido | - |
| Atualizar `ProfileScreen.tsx` para usar novo hook | ⏳ | 🔴 Alta | 🕐 Rápido | - |
| Atualizar `CommentsScreen.tsx` para usar novo hook | ⏳ | 🔴 Alta | 🕐 Rápido | - |
| Atualizar `useVideoActions.tsx` para usar novo hook | ⏳ | 🔴 Alta | 🕐 Rápido | - |
| Atualizar `useCreatorFollow.tsx` para usar novo hook | ⏳ | 🔴 Alta | 🕐 Rápido | - |
| Remover `src/utils/getUserId.ts` | ⏳ | 🔴 Alta | 🕐 Rápido | - |
| Testar migração de dados anônimo → autenticado | ⏳ | 🔴 Alta | 🕑 Médio | - |
| Testar follows após login | ⏳ | 🔴 Alta | 🕐 Rápido | - |
| Testar likes/comentários após login | ⏳ | 🔴 Alta | 🕐 Rápido | - |

**Dependências:** Nenhuma  
**Prazo:** 1 semana

---

### 1.2 Simplificação de RLS (Row-Level Security)

**Objetivo:** Eliminar recursão infinita e erros de permissão.

| Task | Status | Prioridade | Estimativa | Responsável |
|------|--------|------------|------------|-------------|
| Criar função `public.has_role()` | ⏳ | 🔴 Alta | 🕐 Rápido | - |
| Criar função `public.is_admin()` | ⏳ | 🔴 Alta | 🕐 Rápido | - |
| Criar função `public.is_creator()` | ⏳ | 🔴 Alta | 🕐 Rápido | - |
| Criar função `public.is_video_owner()` | ⏳ | 🔴 Alta | 🕐 Rápido | - |
| Atualizar políticas RLS de `user_roles` | ⏳ | 🔴 Alta | 🕐 Rápido | - |
| Atualizar políticas RLS de `videos` | ⏳ | 🔴 Alta | 🕑 Médio | - |
| Atualizar políticas RLS de `likes` | ⏳ | 🔴 Alta | 🕐 Rápido | - |
| Atualizar políticas RLS de `comments` | ⏳ | 🔴 Alta | 🕐 Rápido | - |
| Atualizar políticas RLS de `user_follows` | ⏳ | 🔴 Alta | 🕐 Rápido | - |
| Atualizar políticas RLS de `model_followers` | ⏳ | 🔴 Alta | 🕐 Rápido | - |
| Atualizar políticas RLS de `analytics_events` | ⏳ | 🔴 Alta | 🕐 Rápido | - |
| Testar acesso de admin | ⏳ | 🔴 Alta | 🕐 Rápido | - |
| Testar CRUD de creators | ⏳ | 🔴 Alta | 🕐 Rápido | - |
| Testar acesso de usuários comuns | ⏳ | 🔴 Alta | 🕐 Rápido | - |
| Verificar que não há recursão | ⏳ | 🔴 Alta | 🕐 Rápido | - |

**Dependências:** Nenhuma  
**Prazo:** 1 semana

---

### 1.3 Feed Inteligente Simplificado

**Objetivo:** Implementar feed personalizado sem complexidade excessiva.

| Task | Status | Prioridade | Estimativa | Responsável |
|------|--------|------------|------------|-------------|
| Criar hook `useFeedMixture` | ⏳ | 🔴 Alta | 🕒 Longo | - |
| Implementar query de vídeos recentes (40%) | ⏳ | 🔴 Alta | 🕐 Rápido | - |
| Implementar query de seguidos (30%) | ⏳ | 🔴 Alta | 🕑 Médio | - |
| Implementar query de aleatórios (30%) | ⏳ | 🔴 Alta | 🕐 Rápido | - |
| Implementar shuffle estratégico | ⏳ | 🔴 Alta | 🕐 Rápido | - |
| Atualizar `TikTokApp.tsx` para usar novo hook | ⏳ | 🔴 Alta | 🕐 Rápido | - |
| Implementar exclusão de vídeos já vistos | ⏳ | 🔴 Alta | 🕑 Médio | - |
| Testar mix de conteúdo | ⏳ | 🔴 Alta | 🕐 Rápido | - |
| Testar feed de usuário anônimo | ⏳ | 🔴 Alta | 🕐 Rápido | - |
| Testar feed de usuário autenticado | ⏳ | 🔴 Alta | 🕐 Rápido | - |
| Deprecar `useIntelligentFeed.tsx` | ⏳ | 🟡 Média | 🕐 Rápido | - |

**Dependências:** 1.1 (useUnifiedUserId)  
**Prazo:** 1 semana

---

## 🟡 FASE 2: MELHORIAS DE UX

### 2.1 Onboarding de Usuário

**Objetivo:** Guiar novos usuários e personalizar feed inicial.

| Task | Status | Prioridade | Estimativa | Responsável |
|------|--------|------------|------------|-------------|
| Criar componente `OnboardingScreen.tsx` | ⏳ | 🟡 Média | 🕑 Médio | - |
| Criar slides de boas-vindas (3-5 slides) | ⏳ | 🟡 Média | 🕑 Médio | - |
| Criar componente `InterestSelector.tsx` | ⏳ | 🟡 Média | 🕑 Médio | - |
| Criar tabela `user_interests` no Supabase | ⏳ | 🟡 Média | 🕐 Rápido | - |
| Implementar salvamento de interesses | ⏳ | 🟡 Média | 🕐 Rápido | - |
| Atualizar `useFeedMixture` para usar interesses | ⏳ | 🟡 Média | 🕑 Médio | - |
| Adicionar flag `has_completed_onboarding` no perfil | ⏳ | 🟡 Média | 🕐 Rápido | - |
| Testar fluxo completo de onboarding | ⏳ | 🟡 Média | 🕐 Rápido | - |

**Dependências:** Fase 1  
**Prazo:** 2 semanas

---

### 2.2 Perfil de Criador Dedicado

**Objetivo:** Diferenciar criadores de usuários comuns.

| Task | Status | Prioridade | Estimativa | Responsável |
|------|--------|------------|------------|-------------|
| Criar página `CreatorProfile.tsx` | ⏳ | 🟡 Média | 🕒 Longo | - |
| Adicionar badge "✨ Criador Certificado" | ⏳ | 🟡 Média | 🕐 Rápido | - |
| Mostrar estatísticas públicas (views, likes) | ⏳ | 🟡 Média | 🕑 Médio | - |
| Implementar grade de vídeos do criador | ⏳ | 🟡 Média | 🕑 Médio | - |
| Adicionar botão "Assinar" | ⏳ | 🟡 Média | 🕐 Rápido | - |
| Implementar rota `/creator/:username` | ⏳ | 🟡 Média | 🕐 Rápido | - |
| Testar navegação para perfil de criador | ⏳ | 🟡 Média | 🕐 Rápido | - |

**Dependências:** Fase 1  
**Prazo:** 2 semanas

---

### 2.3 Sistema de Notificações

**Objetivo:** Notificar usuários sobre eventos importantes.

| Task | Status | Prioridade | Estimativa | Responsável |
|------|--------|------------|------------|-------------|
| Criar tabela `notifications` no Supabase | ⏳ | 🟡 Média | 🕐 Rápido | - |
| Criar hook `useNotifications` | ⏳ | 🟡 Média | 🕑 Médio | - |
| Criar componente `NotificationBell.tsx` | ⏳ | 🟡 Média | 🕑 Médio | - |
| Criar componente `NotificationsList.tsx` | ⏳ | 🟡 Média | 🕑 Médio | - |
| Implementar notificação de novo seguidor | ⏳ | 🟡 Média | 🕐 Rápido | - |
| Implementar notificação de novo comentário | ⏳ | 🟡 Média | 🕐 Rápido | - |
| Implementar notificação de like | ⏳ | 🟡 Média | 🕐 Rápido | - |
| Implementar notificação de vídeo novo | ⏳ | 🟡 Média | 🕐 Rápido | - |
| Implementar marcação como lida | ⏳ | 🟡 Média | 🕐 Rápido | - |
| Adicionar badge com contador | ⏳ | 🟡 Média | 🕐 Rápido | - |
| Testar fluxo completo de notificações | ⏳ | 🟡 Média | 🕑 Médio | - |

**Dependências:** Fase 1  
**Prazo:** 2-3 semanas

---

### 2.4 Dark Mode Completo

**Objetivo:** Tema escuro em toda a aplicação.

| Task | Status | Prioridade | Estimativa | Responsável |
|------|--------|------------|------------|-------------|
| Instalar `next-themes` | ⏳ | 🟡 Média | 🕐 Rápido | - |
| Configurar `ThemeProvider` | ⏳ | 🟡 Média | 🕐 Rápido | - |
| Atualizar `index.css` com variáveis dark | ⏳ | 🟡 Média | 🕑 Médio | - |
| Criar componente `ThemeToggle.tsx` | ⏳ | 🟡 Média | 🕐 Rápido | - |
| Adicionar toggle no menu lateral | ⏳ | 🟡 Média | 🕐 Rápido | - |
| Testar todos os componentes em dark mode | ⏳ | 🟡 Média | 🕒 Longo | - |
| Corrigir contraste insuficiente | ⏳ | 🟡 Média | 🕑 Médio | - |
| Persistir preferência do usuário | ⏳ | 🟡 Média | 🕐 Rápido | - |

**Dependências:** Nenhuma  
**Prazo:** 1 semana

---

## 🟢 FASE 3: NOVAS FUNCIONALIDADES

### 3.1 Stories (24h)

**Objetivo:** Stories temporários que desaparecem em 24h.

| Task | Status | Prioridade | Estimativa | Responsável |
|------|--------|------------|------------|-------------|
| Criar tabela `stories` no Supabase | ⏳ | 🟢 Baixa | 🕐 Rápido | - |
| Criar hook `useStories` | ⏳ | 🟢 Baixa | 🕑 Médio | - |
| Criar componente `StoriesBar.tsx` | ⏳ | 🟢 Baixa | 🕒 Longo | - |
| Criar componente `StoryViewer.tsx` | ⏳ | 🟢 Baixa | 🕒 Longo | - |
| Implementar upload de story | ⏳ | 🟢 Baixa | 🕑 Médio | - |
| Implementar expiração automática (Edge Function) | ⏳ | 🟢 Baixa | 🕑 Médio | - |
| Implementar contador de visualizações | ⏳ | 🟢 Baixa | 🕐 Rápido | - |
| Adicionar ring colorido para não vistas | ⏳ | 🟢 Baixa | 🕐 Rápido | - |
| Implementar gestos (tap, hold) | ⏳ | 🟢 Baixa | 🕑 Médio | - |
| Testar fluxo completo de stories | ⏳ | 🟢 Baixa | 🕑 Médio | - |

**Dependências:** Fase 1 e 2  
**Prazo:** 3-4 semanas

---

### 3.2 Duets/Reacts

**Objetivo:** Permitir reações e duetos em vídeos.

| Task | Status | Prioridade | Estimativa | Responsável |
|------|--------|------------|------------|-------------|
| Criar tabela `video_responses` | ⏳ | 🟢 Baixa | 🕐 Rápido | - |
| Adicionar botão "Dueto" no player | ⏳ | 🟢 Baixa | 🕐 Rápido | - |
| Adicionar botão "Reagir" no player | ⏳ | 🟢 Baixa | 🕐 Rápido | - |
| Implementar gravação de dueto (split screen) | ⏳ | 🟢 Baixa | 🕒 Longo | - |
| Implementar gravação de react (picture-in-picture) | ⏳ | 🟢 Baixa | 🕒 Longo | - |
| Implementar upload para Bunny.net | ⏳ | 🟢 Baixa | 🕑 Médio | - |
| Mostrar vídeo original linkado | ⏳ | 🟢 Baixa | 🕐 Rápido | - |
| Testar fluxo completo | ⏳ | 🟢 Baixa | 🕑 Médio | - |

**Dependências:** Fase 1 e 2  
**Prazo:** 4-6 semanas

---

### 3.3 Hashtags e Trends

**Objetivo:** Sistema de hashtags para descoberta de conteúdo.

| Task | Status | Prioridade | Estimativa | Responsável |
|------|--------|------------|------------|-------------|
| Criar tabelas `hashtags` e `video_hashtags` | ⏳ | 🟢 Baixa | 🕐 Rápido | - |
| Criar hook `useTrendingHashtags` | ⏳ | 🟢 Baixa | 🕑 Médio | - |
| Criar página `TrendingPage.tsx` | ⏳ | 🟢 Baixa | 🕑 Médio | - |
| Implementar autocomplete de hashtags | ⏳ | 🟢 Baixa | 🕑 Médio | - |
| Implementar busca por hashtag | ⏳ | 🟢 Baixa | 🕐 Rápido | - |
| Atualizar contador de uso | ⏳ | 🟢 Baixa | 🕐 Rápido | - |
| Mostrar hashtags no player | ⏳ | 🟢 Baixa | 🕐 Rápido | - |
| Testar fluxo completo | ⏳ | 🟢 Baixa | 🕐 Rápido | - |

**Dependências:** Fase 1  
**Prazo:** 2-3 semanas

---

### 3.4 Live Streaming

**Objetivo:** Transmissões ao vivo.

| Task | Status | Prioridade | Estimativa | Responsável |
|------|--------|------------|------------|-------------|
| Pesquisar integração com Bunny.net Stream | ⏳ | 🟢 Baixa | 🕑 Médio | - |
| Criar tabela `live_streams` | ⏳ | 🟢 Baixa | 🕐 Rápido | - |
| Implementar início de live (creator) | ⏳ | 🟢 Baixa | 🕒 Longo | - |
| Implementar player de live (viewers) | ⏳ | 🟢 Baixa | 🕒 Longo | - |
| Implementar chat ao vivo | ⏳ | 🟢 Baixa | 🕒 Longo | - |
| Implementar contador de espectadores | ⏳ | 🟢 Baixa | 🕐 Rápido | - |
| Implementar presentes virtuais | ⏳ | 🟢 Baixa | 🕒 Longo | - |
| Implementar gravação automática | ⏳ | 🟢 Baixa | 🕑 Médio | - |
| Testar latência e qualidade | ⏳ | 🟢 Baixa | 🕑 Médio | - |

**Dependências:** Fase 1, 2 e 3  
**Prazo:** 6-8 semanas

---

## 🔧 FASE 4: REFATORAÇÃO E OTIMIZAÇÃO

### 4.1 Reorganização de Código

**Objetivo:** Melhorar manutenibilidade do código.

| Task | Status | Prioridade | Estimativa | Responsável |
|------|--------|------------|------------|-------------|
| Reorganizar estrutura de hooks | ⏳ | 🟡 Média | 🕑 Médio | - |
| Reorganizar estrutura de componentes | ⏳ | 🟡 Média | 🕑 Médio | - |
| Extrair lógica de interações (like, comment) | ⏳ | 🟡 Média | 🕑 Médio | - |
| Criar componentes atômicos reutilizáveis | ⏳ | 🟡 Média | 🕑 Médio | - |
| Documentar hooks principais | ⏳ | 🟡 Média | 🕑 Médio | - |
| Adicionar JSDoc em funções críticas | ⏳ | 🟡 Média | 🕑 Médio | - |

**Dependências:** Fase 1  
**Prazo:** 2 semanas

---

### 4.2 Performance

**Objetivo:** Otimizar carregamento e responsividade.

| Task | Status | Prioridade | Estimativa | Responsável |
|------|--------|------------|------------|-------------|
| Implementar lazy loading de rotas | ⏳ | 🟡 Média | 🕐 Rápido | - |
| Adicionar memoização em componentes pesados | ⏳ | 🟡 Média | 🕑 Médio | - |
| Implementar virtualização em listas longas | ⏳ | 🟢 Baixa | 🕑 Médio | - |
| Otimizar queries com cache strategy | ⏳ | 🟡 Média | 🕐 Rápido | - |
| Otimizar imagens com srcset | ⏳ | 🟢 Baixa | 🕑 Médio | - |
| Adicionar prefetch de vídeos | ⏳ | 🟡 Média | 🕑 Médio | - |
| Medir Core Web Vitals | ⏳ | 🟡 Média | 🕐 Rápido | - |
| Otimizar bundle size | ⏳ | 🟡 Média | 🕑 Médio | - |

**Dependências:** Nenhuma  
**Prazo:** 2-3 semanas

---

### 4.3 Testes

**Objetivo:** Garantir qualidade e prevenir regressões.

| Task | Status | Prioridade | Estimativa | Responsável |
|------|--------|------------|------------|-------------|
| Setup de testes E2E (Playwright) | ⏳ | 🟡 Média | 🕑 Médio | - |
| Criar testes E2E de autenticação | ⏳ | 🟡 Média | 🕑 Médio | - |
| Criar testes E2E de feed | ⏳ | 🟡 Média | 🕑 Médio | - |
| Criar testes E2E de interações | ⏳ | 🟡 Média | 🕑 Médio | - |
| Criar testes E2E de Creator Studio | ⏳ | 🟡 Média | 🕑 Médio | - |
| Criar testes E2E de Admin | ⏳ | 🟡 Média | 🕑 Médio | - |
| Setup de CI/CD para rodar testes | ⏳ | 🟡 Média | 🕑 Médio | - |

**Dependências:** Fase 1  
**Prazo:** 3-4 semanas

---

### 4.4 Monitoramento

**Objetivo:** Rastrear erros e performance em produção.

| Task | Status | Prioridade | Estimativa | Responsável |
|------|--------|------------|------------|-------------|
| Setup Sentry para error tracking | ⏳ | 🟡 Média | 🕐 Rápido | - |
| Adicionar breadcrumbs personalizados | ⏳ | 🟡 Média | 🕐 Rápido | - |
| Setup analytics de performance | ⏳ | 🟡 Média | 🕐 Rápido | - |
| Criar dashboard de métricas | ⏳ | 🟢 Baixa | 🕑 Médio | - |
| Configurar alertas críticos | ⏳ | 🟡 Média | 🕐 Rápido | - |

**Dependências:** Nenhuma  
**Prazo:** 1 semana

---

## 📊 Resumo de Prioridades

| Fase | Prioridade | Tasks Total | Estimativa Total |
|------|------------|-------------|------------------|
| **Fase 1** | 🔴 Alta | 38 tasks | 3-4 semanas |
| **Fase 2** | 🟡 Média | 34 tasks | 6-8 semanas |
| **Fase 3** | 🟢 Baixa | 32 tasks | 12-16 semanas |
| **Fase 4** | 🟡 Média | 28 tasks | 8-10 semanas |

**Total:** 132 tasks | **29-38 semanas** (~7-9 meses)

---

## 🎯 Milestone Goals

### Milestone 1: Estabilização (Mês 1)
- ✅ Sistema de IDs unificado
- ✅ RLS simplificado e seguro
- ✅ Feed inteligente funcional

### Milestone 2: UX Melhorado (Mês 2-3)
- ✅ Onboarding implementado
- ✅ Perfis de criadores diferenciados
- ✅ Sistema de notificações
- ✅ Dark mode completo

### Milestone 3: Features Avançadas (Mês 4-7)
- ✅ Stories funcionando
- ✅ Duets/Reacts implementados
- ✅ Hashtags e trends
- ✅ Live streaming (beta)

### Milestone 4: Produção Pronta (Mês 8-9)
- ✅ Código refatorado e documentado
- ✅ Performance otimizada
- ✅ Testes E2E completos
- ✅ Monitoramento ativo

---

**Última atualização:** 2025-11-25  
**Versão:** 1.0
