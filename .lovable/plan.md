

# Plano: Remover Fundo Verde e Corrigir Busca

## Resumo das Alterações Solicitadas

1. **Remover fundo verde degradê do header mobile** - Deixar transparente mantendo os ícones (menu, logo, lupa)
2. **Corrigir a busca** - Tanto no mobile quanto no desktop

---

## Análise do Problema de Busca

Após analisar o código e as requisições de rede:

- **O carregamento de modelos funciona** - as requisições retornam status 200
- **Criadores também são carregados** - a query `user_roles` retorna os IDs corretamente
- **O problema pode estar na função `goToModelVideo`** - quando não encontra vídeo ativo para o criador/modelo selecionado, ela simplesmente retorna sem feedback ao usuário

### Problemas Identificados:

1. Se o criador/modelo não tem vídeos ativos, a busca "falha silenciosamente"
2. Não há feedback visual quando a busca não retorna resultados
3. O perfil só abre se encontrar um vídeo associado

---

## Alterações Técnicas

### 1. Arquivo: `src/pages/TikTokApp.tsx`

#### 1.1 Remover fundo verde do header mobile (linhas 2467-2469)

```text
ANTES:
background: 'linear-gradient(to right, rgba(124, 179, 66, 0.95) 0%, rgba(85, 139, 47, 0.95) 35%, rgba(196, 132, 46, 0.95) 70%, rgba(139, 69, 19, 0.95) 100%)'

DEPOIS:
background: 'transparent'
```

#### 1.2 Ajustar cores dos ícones para contraste (linhas 2507-2509)

Os ícones precisarão de um fundo sutil ou sombra para ficarem visíveis sobre o vídeo:

- Adicionar `bg-black/30` no botão da lupa para contraste
- Manter ícones brancos para visibilidade sobre vídeos

### 2. Arquivo: `src/components/tiktok/SearchModal.tsx`

#### 2.1 Adicionar feedback quando não encontra resultados

- Mostrar mensagem "Nenhum resultado encontrado" quando `filteredModels.length === 0`
- Mostrar estado vazio de forma amigável

### 3. Arquivo: `src/pages/TikTokApp.tsx` - Função `goToModelVideo`

#### 3.1 Melhorar tratamento quando não encontra vídeos

- Adicionar toast/notificação informando que o modelo não tem vídeos
- Opcionalmente, abrir perfil mesmo sem vídeo (se possível)

---

## Mudanças Visuais Esperadas

```text
┌─────────────────────────────────────┐
│  ANTES (Mobile Header)              │
│  ┌─────────────────────────────────┐│
│  │ ████ GRADIENTE VERDE ██████████ ││
│  │ ☰    🥥 LOGO 🥥         🔍     ││
│  │ ████████████████████████████████││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  DEPOIS (Mobile Header)             │
│  ┌─────────────────────────────────┐│
│  │                                 ││
│  │ ☰    🥥 LOGO 🥥         🔍     ││
│  │     (fundo transparente)        ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

---

## Resumo das Edições

| Arquivo | Linha(s) | Alteração |
|---------|----------|-----------|
| `TikTokApp.tsx` | 2467-2469 | Remover gradiente verde do header mobile |
| `TikTokApp.tsx` | 2507-2509 | Ajustar estilo do botão da lupa para contraste |
| `SearchModal.tsx` | ~165-217 | Adicionar feedback "Nenhum resultado" |
| `TikTokApp.tsx` | 2110-2113 | Adicionar toast quando criador não tem vídeos |
| `TikTokApp.tsx` | 2161-2163 | Adicionar toast quando modelo não encontrada |

