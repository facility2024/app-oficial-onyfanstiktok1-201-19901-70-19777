import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Code, Database, Shield, Zap, Globe, Download, ExternalLink, Copy } from 'lucide-react';
import { toast } from 'sonner';

export const AdminDocumentation = () => {
  const guideUrl = `${window.location.origin}/guia-do-sistema.docx`;

  const GuideCard = () => (
    <Card className="mb-6 border-2 border-primary/60 bg-gradient-to-br from-primary/10 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <BookOpen className="w-5 h-5 text-primary" />
          Guia Completo do Sistema COCONUDI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-300">
          Manual completo (DOCX) com 9 capítulos: Feed de Ofertas, Order Bumps, Promos, Checkout PIX, Produtos & Liberações, Postagens, Anúncios, aprilblazeirl e Afiliados.
        </p>
        <div className="flex items-center gap-2 bg-black/40 border border-gray-700 rounded-md px-3 py-2 text-xs text-gray-300 font-mono break-all">
          {guideUrl}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
            <a href="/guia-do-sistema.docx" download>
              <Download className="w-4 h-4 mr-2" /> Baixar Guia
            </a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href="/guia-do-sistema.docx" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" /> Abrir em nova aba
            </a>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(guideUrl);
              toast.success('Link copiado!');
            }}
          >
            <Copy className="w-4 h-4 mr-2" /> Copiar link
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const sections = [
    {
      title: "Início Rápido",
      icon: Zap,
      content: "Bem-vindo ao sistema de gerenciamento OnlyFans & TikTok! Este painel permite monitorar e gerenciar todo o seu conteúdo e vendas.",
      items: [
        "Acesse as estatísticas em tempo real na seção Home",
        "Monitore top 10 usuários, vídeos e rankings",
        "Gerencie configurações do sistema",
        "Acompanhe vendas e receitas"
      ]
    },
    {
      title: "Funcionalidades Principais",
      icon: BookOpen,
      content: "O sistema oferece controle completo sobre sua operação:",
      items: [
        "Dashboard em tempo real com métricas atualizadas",
        "Sistema de notificações de vendas instantâneas",
        "Gestão de usuários e ranking de performance",
        "Análise de vídeos mais populares",
        "Controle financeiro e receitas",
        "Gamificação e sistema de pontos"
      ]
    },
    {
      title: "Integração com Painel de Postagem",
      icon: Code,
      content: "Sistema de sincronização automática com painel de agendamento:",
      items: [
        "📊 Link do painel aparece automaticamente no perfil das modelos",
        "🔗 Atualizações em tempo real quando o painel de postagem enviar dados",
        "🚀 API para receber links de perfis: /functions/v1/update-model-panel",
        "💾 Armazenamento automático do link na base de dados",
        "👤 Exibição do botão 'Painel de Postagem' no perfil da modelo"
      ]
    },
    {
      title: "Navegação",
      icon: Globe,
      content: "Use o menu superior para navegar entre as seções:",
      items: [
        "🏠 Home - Estatísticas gerais e gráficos",
        "👥 Users top10 - Ranking dos melhores usuários",
        "🎮 top10 - Sistema de gamificação e rankings",
        "🎬 Videos top10 - Vídeos mais assistidos",
        "💰 Money top10 - Relatórios financeiros",
        "📖 Documentação - Esta página",
        "⚙️ Config - Configurações do sistema"
      ]
    },
    {
      title: "Segurança",
      icon: Shield,
      content: "O sistema mantém seus dados seguros:",
      items: [
        "Autenticação obrigatória para acesso",
        "Dados criptografados em trânsito",
        "Logs de auditoria das ações",
        "Backup automático dos dados"
      ]
    },
    {
      title: "API e Integrações",
      icon: Code,
      content: "Conectividade com plataformas externas:",
      items: [
        "Integração com OnlyFans API",
        "Conexão com TikTok Analytics",
        "Webhooks para notificações em tempo real",
        "API REST para integrações customizadas"
      ]
    },
    {
      title: "Base de Dados",
      icon: Database,
      content: "Estrutura de dados otimizada:",
      items: [
        "Armazenamento em nuvem Supabase",
        "Sincronização em tempo real",
        "Backup automático diário",
        "Histórico completo de transações"
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-lg">
          <BookOpen className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-primary">Documentação do Sistema</h1>
          <p className="text-muted-foreground">Guia completo para uso do painel administrativo</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {sections.map((section, index) => {
          const Icon = section.icon;
          return (
            <Card key={index} className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg text-primary">{section.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{section.content}</p>
                <ul className="space-y-2">
                  {section.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Status do Sistema */}
      <Card className="border-success/20 bg-success/5">
        <CardHeader>
          <CardTitle className="text-success flex items-center space-x-2">
            <Zap className="w-5 h-5" />
            <span>Status do Sistema</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <Badge variant="secondary" className="mb-2 bg-success/20 text-success">Online</Badge>
              <p className="text-xs text-muted-foreground">Servidor Principal</p>
            </div>
            <div className="text-center">
              <Badge variant="secondary" className="mb-2 bg-success/20 text-success">Conectado</Badge>
              <p className="text-xs text-muted-foreground">Base de Dados</p>
            </div>
            <div className="text-center">
              <Badge variant="secondary" className="mb-2 bg-success/20 text-success">Ativo</Badge>
              <p className="text-xs text-muted-foreground">API OnlyFans</p>
            </div>
            <div className="text-center">
              <Badge variant="secondary" className="mb-2 bg-success/20 text-success">Sincronizado</Badge>
              <p className="text-xs text-muted-foreground">TikTok Analytics</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suporte */}
      <Card className="border-accent/20 bg-accent/5">
        <CardHeader>
          <CardTitle className="text-accent">Precisa de Ajuda?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Se você encontrou algum problema ou tem dúvidas sobre o sistema, entre em contato conosco:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Suporte Técnico</h4>
              <p className="text-sm text-muted-foreground">Email: suporte@sistema.com</p>
              <p className="text-sm text-muted-foreground">WhatsApp: (11) 99999-9999</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Horário de Atendimento</h4>
              <p className="text-sm text-muted-foreground">Segunda a Sexta: 9h às 18h</p>
              <p className="text-sm text-muted-foreground">Sábados: 9h às 14h</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};