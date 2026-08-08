<div align="center">
  <img src="src/assets/coconudi-logo-white.png" alt="COCONUDI Logo" width="200"/>
  
  # COCONUDI
  
  ### Plataforma de Vídeos Curtos para Conteúdo de Modelos
  
  [![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/yourusername/coconudi)
  [![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
  [![PRD](https://img.shields.io/badge/docs-PRD%20v2.0-orange.svg)](docs/PRD_COCONUDI_V2.md)
  
  [Demo](https://coconudi.lovable.app) · [Documentação](docs/) · [Reportar Bug](https://github.com/yourusername/coconudi/issues)
</div>

---

## 🎯 Sobre o Projeto

**COCONUDI** é uma plataforma moderna de vídeos curtos no estilo TikTok, especializada em conteúdo de modelos. Combinando um feed inteligente de vídeos verticais com sistema de gamificação, monetização premium e ferramentas administrativas avançadas, oferecemos uma experiência completa tanto para usuários finais quanto para criadores de conteúdo.

### ✨ Características Principais

- 🎬 **Feed Inteligente de Vídeos**: Scroll vertical infinito com autoplay e algoritmo de recomendação
- 👤 **Sistema Duplo de Criadores**: Suporte para modelos estáticas e criadores autenticados
- 💎 **Monetização Premium**: Assinaturas VIP com pagamento via PIX
- 🎮 **Gamificação Completa**: Sistema de pontos, níveis, missões diárias e streaks
- 🎁 **Ofertas Integradas**: Sistema de ofertas temporais dentro dos vídeos
- 📊 **Painel Administrativo**: Dashboard completo com analytics em tempo real
- 🎨 **Creator Studio**: Interface dedicada para criadores gerenciarem conteúdo
- 🛍️ **Marketplace**: Sistema de produtos e comércios locais integrado
- 💬 **Interações Sociais**: Likes, comentários, compartilhamentos e seguir criadores
- 📱 **PWA**: Aplicativo instalável com suporte offline

---

## 🚀 Tech Stack

### Frontend
- **Framework**: React 18.3 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Animações**: Framer Motion
- **Roteamento**: React Router DOM v6
- **State Management**: TanStack Query (React Query)
- **Formulários**: React Hook Form + Zod

### Backend & Infraestrutura
- **BaaS**: Supabase
  - PostgreSQL Database
  - Authentication
  - Edge Functions (Deno)
  - Real-time Subscriptions
  - Storage
- **CDN & Streaming**: Bunny.net
- **Pagamentos**: PIX (Sistema brasileiro)

### Ferramentas de Desenvolvimento
- **Package Manager**: npm
- **Linting**: ESLint
- **Type Checking**: TypeScript
- **Version Control**: Git

---

## 📦 Quick Start

### Pré-requisitos

- Node.js 18+ e npm
- Conta no Supabase
- Conta no Bunny.net (para vídeos)

### Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/yourusername/coconudi.git
cd coconudi

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas credenciais

# 4. Inicie o servidor de desenvolvimento
npm run dev

# 5. Acesse no navegador
# http://localhost:5173
```

---

## ⚙️ Configuração de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica

# Bunny.net (CDN de Vídeos)
VITE_BUNNY_CDN_URL=https://seu-cdn.b-cdn.net
VITE_BUNNY_STORAGE_ZONE=sua-storage-zone
VITE_BUNNY_API_KEY=sua-api-key

# PIX (Pagamentos)
VITE_PIX_API_URL=https://api-pix.exemplo.com
VITE_PIX_API_KEY=sua-chave-pix

# App
VITE_APP_URL=http://localhost:5173
```

### Setup do Supabase

1. **Crie um projeto no Supabase**
2. **Execute as migrations SQL** localizadas em `supabase/`:
   ```bash
   # Execute os scripts na ordem:
   # 1. create_tables.sql
   # 2. create_rls_policies.sql
   # 3. create_functions.sql
   # 4. create_triggers.sql
   ```
3. **Configure o Storage**: Crie o bucket `avatars` com políticas públicas de leitura
4. **Deploy das Edge Functions**:
   ```bash
   supabase functions deploy generate-pix
   supabase functions deploy verify-payment
   supabase functions deploy follow-model
   supabase functions deploy process-scheduled-posts
   ```

### Setup do Bunny.net

1. Crie uma Storage Zone para vídeos
2. Configure o CDN Pull Zone
3. Adicione as credenciais no `.env`

---

## 📂 Arquitetura do Projeto

```
coconudi/
├── docs/                          # Documentação
│   ├── PRD_COCONUDI_V2.md        # Product Requirements Document
│   ├── TECHNICAL_IMPROVEMENTS.md # Melhorias técnicas propostas
│   └── IMPLEMENTATION_CHECKLIST.md # Checklist de implementação
│
├── public/                        # Assets públicos
│   ├── lovable-uploads/          # Imagens de modelos
│   ├── manifest.json             # PWA manifest
│   └── sw.js                     # Service Worker
│
├── src/
│   ├── assets/                   # Imagens e recursos estáticos
│   │   ├── ads/                  # Imagens de anúncios
│   │   └── *.png                 # Logos e ícones
│   │
│   ├── components/               # Componentes React
│   │   ├── admin/               # Painel administrativo
│   │   ├── creator/             # Creator Studio
│   │   ├── tiktok/              # Feed de vídeos
│   │   └── ui/                  # Componentes shadcn/ui
│   │
│   ├── hooks/                    # Custom React Hooks
│   │   ├── useIntelligentFeed.tsx
│   │   ├── useVideoActions.tsx
│   │   ├── useGamification.tsx
│   │   └── ...
│   │
│   ├── pages/                    # Páginas da aplicação
│   │   ├── TikTokApp.tsx        # Feed principal
│   │   ├── UserProfile.tsx      # Perfil do usuário
│   │   ├── CreatorStudio.tsx    # Estúdio do criador
│   │   ├── AdminDashboard.tsx   # Dashboard admin
│   │   └── ...
│   │
│   ├── integrations/
│   │   └── supabase/            # Cliente Supabase
│   │
│   ├── types/                    # TypeScript types
│   │   ├── database.ts
│   │   └── feed.ts
│   │
│   ├── utils/                    # Utilitários
│   │   ├── getUserId.ts
│   │   └── fadeInUp.ts
│   │
│   ├── App.tsx                   # Componente raiz
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Estilos globais
│
├── supabase/                     # Configuração Supabase
│   ├── functions/               # Edge Functions
│   ├── migrations/              # SQL Migrations
│   └── config.toml              # Configuração
│
├── .env                          # Variáveis de ambiente (não commitado)
├── vite.config.ts               # Configuração Vite
├── tailwind.config.ts           # Configuração Tailwind
└── tsconfig.json                # Configuração TypeScript
```

### Padrões de Arquitetura

- **Component-Based Architecture**: Componentização granular e reutilizável
- **Custom Hooks Pattern**: Lógica de negócio encapsulada em hooks customizados
- **Protected Routes**: Sistema de autenticação e autorização baseado em roles
- **Real-time Subscriptions**: Atualizações em tempo real via Supabase
- **Optimistic UI Updates**: Feedback instantâneo para melhor UX
- **Edge Functions**: Lógica serverless para operações críticas

---

## 📚 Documentação

A documentação completa do projeto está disponível em:

- 📖 **[PRD v2.0](docs/PRD_COCONUDI_V2.md)**: Product Requirements Document completo
- 🔧 **[Technical Improvements](docs/TECHNICAL_IMPROVEMENTS.md)**: Melhorias técnicas propostas
- ✅ **[Implementation Checklist](docs/IMPLEMENTATION_CHECKLIST.md)**: Roadmap de implementação
- 🔐 **[RLS Implementation Guide](supabase/RLS_IMPLEMENTATION_GUIDE.md)**: Guia de segurança
- 🔑 **[Authentication Setup](AUTHENTICATION_SETUP.md)**: Configuração de autenticação

### Diagramas

**Arquitetura Geral:**
```
┌─────────────┐
│   Client    │
│  (React)    │
└──────┬──────┘
       │
       ├─────────────────────┐
       │                     │
┌──────▼──────┐      ┌──────▼──────┐
│  Supabase   │      │  Bunny.net  │
│  (Backend)  │      │    (CDN)    │
└─────────────┘      └─────────────┘
```

**Fluxo de Feed de Vídeos:**
```
User → TikTokApp → useIntelligentFeed → Supabase
                          ↓
                   [40% Novos]
                   [30% Seguidos]
                   [30% Aleatórios]
                          ↓
                   VideoPlayer → Bunny.net CDN
```

---

## 🛠️ Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Inicia servidor de desenvolvimento (localhost:5173)

# Build
npm run build           # Compila para produção
npm run preview         # Preview da build de produção

# Linting e Type Checking
npm run lint            # Executa ESLint
npm run type-check      # Verifica tipos TypeScript

# Supabase (se instalado localmente)
supabase start          # Inicia Supabase local
supabase db reset       # Reseta banco de dados local
supabase functions serve # Serve edge functions localmente
```

---

## 🚀 Deploy

### Deploy na Lovable

O projeto está configurado para deploy automático na Lovable:

1. Faça commit das alterações
2. Push para o repositório conectado
3. Clique em **"Publish"** no painel Lovable
4. O deploy é automático para o frontend

**Nota**: Edge Functions do Supabase são deployadas automaticamente ao fazer push.

### Deploy Manual (Docker)

```bash
# Build da imagem Docker
docker build -t coconudi .

# Executar container
docker run -p 80:80 coconudi
```

### Deploy em Produção

Para produção, recomendamos:

1. **Frontend**: Vercel, Netlify ou Lovable
2. **Backend**: Supabase Cloud (já configurado)
3. **CDN**: Bunny.net (já configurado)
4. **Domain**: Configure DNS para apontar para seu deploy

---

## 👥 Sistema de Usuários e Roles

O COCONUDI utiliza um sistema de roles baseado em `user_roles`:

| Role      | Descrição                                    | Acesso                          |
|-----------|----------------------------------------------|---------------------------------|
| `user`    | Usuário padrão                              | Feed, perfil, interações        |
| `creator` | Criador de conteúdo aprovado                | Creator Studio, upload vídeos   |
| `admin`   | Administrador da plataforma                 | Painel admin, gestão completa   |
| `moderator`| Moderador de conteúdo                      | Moderação, aprovação de vídeos  |

---

## 🐛 Problemas Conhecidos

Consulte [TECHNICAL_IMPROVEMENTS.md](docs/TECHNICAL_IMPROVEMENTS.md) para uma lista completa de problemas identificados e suas soluções propostas.

### Críticos
- ⚠️ Inconsistência de User IDs (localStorage vs Supabase Auth)
- ⚠️ Feed inteligente desativado (usando feed básico)
- ⚠️ RLS complexo causando recursão infinita

### Em Progresso
- 🔄 Unificação do sistema de IDs
- 🔄 Simplificação de políticas RLS
- 🔄 Reimplementação do feed inteligente

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. **Fork** o projeto
2. Crie uma **branch** para sua feature (`git checkout -b feature/NovaFeature`)
3. **Commit** suas mudanças (`git commit -m 'Add: Nova feature incrível'`)
4. **Push** para a branch (`git push origin feature/NovaFeature`)
5. Abra um **Pull Request**

### Diretrizes de Código

- Use TypeScript para type safety
- Siga os padrões ESLint configurados
- Escreva commits descritivos
- Documente funções e componentes complexos
- Teste suas mudanças antes de criar PR

---

## 📊 Métricas de Sucesso (KPIs)

| Métrica                  | Objetivo Atual | Objetivo v2.0 |
|--------------------------|----------------|---------------|
| Tempo de Sessão          | 8-12 min       | 15-20 min     |
| Taxa de Retenção D7      | 25%            | 40%           |
| Taxa de Conversão Premium| 2%             | 5%            |
| Vídeos Assistidos/Sessão | 15             | 25            |
| Criadores Ativos         | 50             | 200+          |

---

## 📄 Licença

Este projeto está sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 📞 Contato e Suporte

- **Website**: [https://coconudi.com](https://coconudi.com)
- **Email**: suporte@coconudi.com
- **Issues**: [GitHub Issues](https://github.com/yourusername/coconudi/issues)
- **Discord**: [Comunidade COCONUDI](https://discord.gg/coconudi)

---

<div align="center">
  
  **Desenvolvido com ❤️ pela equipe COCONUDI**
  
  ⭐ Se este projeto foi útil, considere dar uma estrela!
  
</div>
