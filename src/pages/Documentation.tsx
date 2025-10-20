import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, BarElement } from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { 
  Users, 
  TrendingUp, 
  MapPin, 
  Video, 
  Gift, 
  Settings, 
  BarChart3, 
  Crown, 
  Coins, 
  Trophy,
  Globe,
  Smartphone,
  Monitor,
  Eye,
  Download,
  Upload,
  Star,
  Heart,
  Share2,
  MessageSquare,
  Calendar,
  Clock,
  Target,
  Zap,
  Shield,
  Webhook,
  Database,
  Code,
  Palette,
  Layout,
  Navigation,
  Bell,
  Lock,
  Key,
  Mail,
  Phone,
  CreditCard,
  DollarSign,
  Percent,
  MoreHorizontal
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, BarElement);

const Documentation = () => {
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);

  const systemFeatures = [
    {
      category: "Dashboard Principal",
      icon: <BarChart3 className="h-6 w-6" />,
      features: [
        {
          name: "Estatísticas em Tempo Real",
          description: "Visualização de métricas principais como usuários online, vídeos assistidos, engajamento",
          preview: "Cards com números dinâmicos e ícones coloridos",
          color: "bg-gradient-to-r from-blue-500 to-purple-600"
        },
        {
          name: "Gráficos Interativos",
          description: "Análise visual de dados com diferentes tipos de gráficos",
          preview: "Line charts, bar charts, doughnut charts",
          color: "bg-gradient-to-r from-green-500 to-blue-500"
        },
        {
          name: "Mapa do Brasil Interativo",
          description: "Visualização geográfica de usuários por estado",
          preview: "Mapa 2D/3D com pins e tooltips informativos",
          color: "bg-gradient-to-r from-yellow-500 to-orange-500"
        }
      ]
    },
    {
      category: "Gestão de Usuários",
      icon: <Users className="h-6 w-6" />,
      features: [
        {
          name: "Lista de Usuários",
          description: "Visualização e gerenciamento de todos os usuários da plataforma",
          preview: "Tabela com dados de perfil, status e ações",
          color: "bg-gradient-to-r from-purple-500 to-pink-500"
        },
        {
          name: "Análise Demográfica",
          description: "Estatísticas de idade, gênero, localização dos usuários",
          preview: "Gráficos demográficos e mapas de calor",
          color: "bg-gradient-to-r from-indigo-500 to-purple-500"
        },
        {
          name: "Atividade dos Usuários",
          description: "Monitoramento de engajamento e comportamento",
          preview: "Timeline de atividades e métricas de engajamento",
          color: "bg-gradient-to-r from-teal-500 to-cyan-500"
        }
      ]
    },
    {
      category: "Gestão de Vídeos",
      icon: <Video className="h-6 w-6" />,
      features: [
        {
          name: "Biblioteca de Vídeos",
          description: "Upload, organização e moderação de conteúdo de vídeo",
          preview: "Grid de vídeos com thumbnails e metadados",
          color: "bg-gradient-to-r from-red-500 to-pink-500"
        },
        {
          name: "Analytics de Vídeo",
          description: "Métricas de visualização, curtidas, compartilhamentos",
          preview: "Gráficos de performance e engagement",
          color: "bg-gradient-to-r from-orange-500 to-red-500"
        },
        {
          name: "Moderação de Conteúdo",
          description: "Ferramentas para aprovação e remoção de vídeos",
          preview: "Interface de moderação com filtros",
          color: "bg-gradient-to-r from-amber-500 to-orange-500"
        }
      ]
    },
    {
      category: "Sistema de Gamificação",
      icon: <Trophy className="h-6 w-6" />,
      features: [
        {
          name: "Missões e Desafios",
          description: "Criação e gerenciamento de missões para usuários",
          preview: "Lista de missões com progresso e recompensas",
          color: "bg-gradient-to-r from-yellow-500 to-amber-500"
        },
        {
          name: "Sistema de Pontos",
          description: "Controle de pontuação e ranking dos usuários",
          preview: "Leaderboard e histórico de pontos",
          color: "bg-gradient-to-r from-emerald-500 to-teal-500"
        },
        {
          name: "Recompensas e Prêmios",
          description: "Gestão de ofertas e benefícios para usuários",
          preview: "Catálogo de recompensas disponíveis",
          color: "bg-gradient-to-r from-violet-500 to-purple-500"
        }
      ]
    },
    {
      category: "Sistema Financeiro",
      icon: <DollarSign className="h-6 w-6" />,
      features: [
        {
          name: "Dashboard Financeiro",
          description: "Visão geral de receitas, despesas e lucros",
          preview: "Gráficos financeiros e KPIs principais",
          color: "bg-gradient-to-r from-green-600 to-emerald-600"
        },
        {
          name: "Gestão de Pagamentos",
          description: "Controle de transações e métodos de pagamento",
          preview: "Lista de transações e status de pagamentos",
          color: "bg-gradient-to-r from-blue-600 to-indigo-600"
        },
        {
          name: "Relatórios Financeiros",
          description: "Geração de relatórios detalhados por período",
          preview: "Relatórios em PDF e Excel",
          color: "bg-gradient-to-r from-slate-600 to-gray-600"
        }
      ]
    },
    {
      category: "Configurações e Integrações",
      icon: <Settings className="h-6 w-6" />,
      features: [
        {
          name: "Configurações Gerais",
          description: "Personalização da plataforma e preferências",
          preview: "Painel de configurações com switches e inputs",
          color: "bg-gradient-to-r from-gray-500 to-slate-500"
        },
        {
          name: "Integrações API",
          description: "Conexão com serviços externos via webhooks",
          preview: "Lista de integrações ativas e configurações",
          color: "bg-gradient-to-r from-cyan-500 to-blue-500"
        },
        {
          name: "Backup e Segurança",
          description: "Gestão de backups e configurações de segurança",
          preview: "Status de backups e logs de segurança",
          color: "bg-gradient-to-r from-red-600 to-pink-600"
        }
      ]
    }
  ];

  const modalExamples = [
    {
      name: "Modal de Criação de Conteúdo",
      description: "Interface para upload e configuração de novos vídeos",
      component: "ContentModal"
    },
    {
      name: "Modal de Missões",
      description: "Criação e edição de missões gamificadas",
      component: "MissionModal"
    },
    {
      name: "Modal de Ofertas",
      description: "Configuração de recompensas e ofertas especiais",
      component: "OffersModal"
    },
    {
      name: "Modal de Preview de Vídeo",
      description: "Visualização e moderação de conteúdo de vídeo",
      component: "VideoPreviewModal"
    },
    {
      name: "Modal de Integrações",
      description: "Configuração de webhooks e APIs externas",
      component: "IntegrationsModal"
    }
  ];

  const chartData = {
    users: {
      labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
      datasets: [{
        label: 'Usuários Ativos',
        data: [1200, 1900, 3000, 5000, 4000, 6000],
        borderColor: 'hsl(var(--primary))',
        backgroundColor: 'hsl(var(--primary) / 0.1)',
        tension: 0.4
      }]
    },
    engagement: {
      labels: ['Curtidas', 'Comentários', 'Compartilhamentos', 'Visualizações'],
      datasets: [{
        data: [45, 25, 15, 15],
        backgroundColor: [
          'hsl(var(--primary))',
          'hsl(var(--secondary))',
          'hsl(var(--accent))',
          'hsl(var(--muted))'
        ]
      }]
    },
    revenue: {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      datasets: [{
        label: 'Receita (R$)',
        data: [65000, 95000, 88000, 120000],
        backgroundColor: 'hsl(var(--primary) / 0.8)'
      }]
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Crown className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Documentação do Sistema
                </h1>
                <p className="text-muted-foreground">
                  Visão completa de todas as funcionalidades da plataforma
                </p>
              </div>
            </div>
            <Button variant="outline" asChild>
              <a href="/">← Voltar ao Painel</a>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="features">Funcionalidades</TabsTrigger>
            <TabsTrigger value="modals">Interfaces Pop-up</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Visão Geral do Sistema
                </CardTitle>
                <CardDescription>
                  Plataforma completa de gestão com múltiplos módulos integrados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {systemFeatures.map((category, index) => (
                    <Card key={index} className="border-l-4 border-l-primary/60">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          {category.icon}
                          {category.category}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Badge variant="secondary" className="w-fit">
                          {category.features.length} funcionalidades
                        </Badge>
                        <div className="space-y-2">
                          {category.features.map((feature, featureIndex) => (
                            <div key={featureIndex} className="p-2 rounded-lg bg-muted/30">
                              <p className="font-medium text-sm">{feature.name}</p>
                              <p className="text-xs text-muted-foreground">{feature.description}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6">
            {systemFeatures.map((category, categoryIndex) => (
              <Card key={categoryIndex}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {category.icon}
                    {category.category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {category.features.map((feature, featureIndex) => (
                      <Card key={featureIndex} className="relative overflow-hidden">
                        <div className={`absolute inset-0 opacity-10 ${feature.color}`} />
                        <CardHeader className="relative">
                          <CardTitle className="text-lg">{feature.name}</CardTitle>
                          <CardDescription>{feature.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="relative">
                          <div className="space-y-3">
                            <Badge variant="outline">{feature.preview}</Badge>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full"
                              onClick={() => setSelectedDemo(feature.name)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Demonstração
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Modals Tab */}
          <TabsContent value="modals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="h-5 w-5" />
                  Interfaces Pop-up do Sistema
                </CardTitle>
                <CardDescription>
                  Modais e diálogos interativos para diferentes funcionalidades
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {modalExamples.map((modal, index) => (
                    <Card key={index} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-lg">{modal.name}</CardTitle>
                        <CardDescription>{modal.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <Badge variant="secondary">{modal.component}</Badge>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" className="w-full">
                                <Eye className="h-4 w-4 mr-2" />
                                Visualizar Modal
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>{modal.name}</DialogTitle>
                                <DialogDescription>
                                  Esta é uma demonstração do {modal.name.toLowerCase()}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="h-32 bg-gradient-to-br from-muted to-muted/50 rounded-lg flex items-center justify-center">
                                  <p className="text-muted-foreground">Preview do {modal.component}</p>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" className="flex-1">Salvar</Button>
                                  <Button size="sm" variant="outline" className="flex-1">Cancelar</Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Crescimento de Usuários</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <Line 
                      data={chartData.users} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top' as const,
                          }
                        }
                      }} 
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribuição de Engajamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <Doughnut 
                      data={chartData.engagement}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom' as const,
                          }
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Receita Trimestral</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <Bar 
                      data={chartData.revenue}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top' as const,
                          }
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Usuários Totais</p>
                      <p className="text-2xl font-bold">124.5K</p>
                    </div>
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Vídeos Publicados</p>
                      <p className="text-2xl font-bold">8.9K</p>
                    </div>
                    <Video className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Receita Mensal</p>
                      <p className="text-2xl font-bold">R$ 89.2K</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Taxa de Engajamento</p>
                      <p className="text-2xl font-bold">92.4%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Demo Modal */}
      <Dialog open={!!selectedDemo} onOpenChange={() => setSelectedDemo(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Demonstração: {selectedDemo}</DialogTitle>
            <DialogDescription>
              Visualização da funcionalidade em ação
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="h-64 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Zap className="h-12 w-12 text-primary mx-auto mb-2" />
                <p className="text-lg font-medium">Demo de {selectedDemo}</p>
                <p className="text-sm text-muted-foreground">Interface interativa em funcionamento</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedDemo(null)}>
                Fechar
              </Button>
              <Button>
                Ver Implementação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Documentation;