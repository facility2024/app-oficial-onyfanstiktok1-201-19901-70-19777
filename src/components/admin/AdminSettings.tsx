import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, Settings, User, Bell, Shield, Database, Palette, Globe, Smartphone, Key, Lock, CreditCard, Webhook, RefreshCw, Download, Eye, Users } from 'lucide-react';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const AdminSettings = () => {
  const {
    platforms,
    settings,
    systemStatus,
    loading,
    updateSetting,
    connectPlatform,
    performBackup,
    getAppStatByType,
    getSecurityLogByType,
    refreshData
  } = useAdminSettings();

  const [connectFormData, setConnectFormData] = useState({
    platform: '',
    apiKey: '',
    apiSecret: '',
    accessToken: '',
    username: ''
  });

  const handleConnect = async (platformName: string) => {
    await connectPlatform(platformName, {
      apiKey: connectFormData.apiKey,
      apiSecret: connectFormData.apiSecret,
      accessToken: connectFormData.accessToken,
      username: connectFormData.username
    });
    setConnectFormData({
      platform: '',
      apiKey: '',
      apiSecret: '',
      accessToken: '',
      username: ''
    });
  };

  const settingsSections = [
    {
      title: 'Configurações da Conta',
      icon: User,
      items: [
        { key: 'two_factor', label: 'Autenticação em Duas Etapas', description: 'Adiciona uma camada extra de segurança' },
        { key: 'email_marketing', label: 'Emails de Marketing', description: 'Receber newsletters e promoções' },
        { key: 'sale_notifications', label: 'Notificações de Vendas', description: 'Receber alertas quando houver vendas' },
        { key: 'online_users_brazil', label: 'Notificação de Usuário Online Brasil', description: 'Alertas de usuários online no Brasil' },
      ]
    },
    {
      title: 'Notificações',
      icon: Bell,
      items: [
        { key: 'notifications', label: 'Notificações Push', description: 'Alertas de vendas e interações' },
        { key: 'auto_post', label: 'Auto-post em Redes Sociais', description: 'Publicar automaticamente novo conteúdo' },
      ]
    },
    {
      title: 'Sistema',
      icon: Database,
      items: [
        { key: 'analytics', label: 'Coleta de Analytics', description: 'Permitir coleta de dados para melhorias' },
        { key: 'webhook', label: 'Webhooks Ativos', description: 'Sincronização automática de dados' },
        { key: 'maintenance', label: 'Modo Manutenção', description: 'Pausar temporariamente o sistema' },
      ]
    },
    {
      title: 'Interface',
      icon: Palette,
      items: [
        { key: 'dark_mode', label: 'Modo Escuro', description: 'Alternar tema da interface' },
      ]
    },
  ];

  const getPlatformRequirements = (platform: string) => {
    switch (platform) {
      case 'OnlyFans':
        return {
          title: 'Conectar OnlyFans',
          icon: Lock,
          requirements: [
            { icon: Key, text: 'API Key do OnlyFans' },
            { icon: User, text: 'Username da conta' },
            { icon: Lock, text: 'Token de autenticação' },
            { icon: Shield, text: 'Verificação em duas etapas ativa' }
          ],
          steps: [
            '1. Acesse as configurações da sua conta OnlyFans',
            '2. Vá em "API Settings" ou "Configurações de Desenvolvedor"',
            '3. Gere uma nova API Key',
            '4. Copie o token de autenticação',
            '5. Cole as credenciais nos campos abaixo'
          ]
        };
      case 'TikTok':
        return {
          title: 'Conectar TikTok',
          icon: Smartphone,
          requirements: [
            { icon: Key, text: 'Client ID da aplicação' },
            { icon: Lock, text: 'Client Secret' },
            { icon: User, text: 'Username TikTok' },
            { icon: Webhook, text: 'URL de callback configurada' }
          ],
          steps: [
            '1. Acesse TikTok for Developers',
            '2. Crie uma nova aplicação',
            '3. Configure as permissões necessárias',
            '4. Copie Client ID e Client Secret',
            '5. Configure a URL de callback'
          ]
        };
      case 'Instagram':
        return {
          title: 'Conectar Instagram',
          icon: Globe,
          requirements: [
            { icon: Key, text: 'Instagram App ID' },
            { icon: Lock, text: 'App Secret' },
            { icon: User, text: 'Conta Instagram Business' },
            { icon: CreditCard, text: 'Facebook Developer Account' }
          ],
          steps: [
            '1. Acesse Facebook Developers',
            '2. Crie uma nova app',
            '3. Adicione Instagram Basic Display',
            '4. Configure as permissões',
            '5. Obtenha o Access Token'
          ]
        };
      case 'Twitter':
        return {
          title: 'Conectar Twitter/X',
          icon: Globe,
          requirements: [
            { icon: Key, text: 'API Key (Consumer Key)' },
            { icon: Lock, text: 'API Secret Key' },
            { icon: User, text: 'Access Token' },
            { icon: Shield, text: 'Access Token Secret' }
          ],
          steps: [
            '1. Acesse Twitter Developer Portal',
            '2. Crie um novo projeto/app',
            '3. Gere as chaves de API',
            '4. Configure as permissões',
            '5. Obtenha os tokens de acesso'
          ]
        };
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-success text-success-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'disconnected': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'connected': return 'Conectado';
      case 'pending': return 'Pendente';
      case 'disconnected': return 'Desconectado';
      default: return 'Desconhecido';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando configurações...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Platform Connections */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-primary" />
            <span>🌐 Conexões de Plataforma</span>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Atualizar</span>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {platforms.map((platform, index) => (
              <div key={index} className="p-4 border border-border rounded-lg hover:bg-card-hover transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-sm">
                      {platform.platform.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{platform.platform}</h3>
                      <Badge className={`text-xs ${getStatusColor(platform.status)}`}>
                        {getStatusLabel(platform.status)}
                      </Badge>
                    </div>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        size="sm" 
                        variant={platform.status === 'connected' ? 'outline' : 'default'}
                        className={platform.status === 'connected' ? '' : 'bg-gradient-primary hover:shadow-glow text-primary-foreground'}
                      >
                        {platform.status === 'connected' ? 'Gerenciar' : 'Conectar'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96 p-6">
                      {(() => {
                        const requirements = getPlatformRequirements(platform.platform);
                        if (!requirements) return null;
                        const Icon = requirements.icon;
                        
                        return (
                          <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                              <Icon className="w-5 h-5 text-primary" />
                              <h3 className="font-semibold text-foreground">{requirements.title}</h3>
                            </div>
                            
                            <div>
                              <h4 className="font-medium text-foreground mb-3">Requisitos Necessários:</h4>
                              <div className="space-y-2">
                                {requirements.requirements.map((req, idx) => {
                                  const ReqIcon = req.icon;
                                  return (
                                    <div key={idx} className="flex items-center space-x-2 text-sm">
                                      <ReqIcon className="w-4 h-4 text-muted-foreground" />
                                      <span className="text-muted-foreground">{req.text}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-medium text-foreground mb-3">Passos para Conectar:</h4>
                              <div className="space-y-1">
                                {requirements.steps.map((step, idx) => (
                                  <p key={idx} className="text-sm text-muted-foreground">{step}</p>
                                ))}
                              </div>
                            </div>

                            {platform.status !== 'connected' && (
                              <div className="space-y-3 pt-3 border-t border-border">
                                <div className="space-y-2">
                                  <Label htmlFor="api-key">API Key</Label>
                                  <Input
                                    id="api-key"
                                    type="password"
                                    placeholder="Insira sua API Key"
                                    value={connectFormData.apiKey}
                                    onChange={(e) => setConnectFormData(prev => ({...prev, apiKey: e.target.value}))}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="username">Username</Label>
                                  <Input
                                    id="username"
                                    placeholder="Seu username na plataforma"
                                    value={connectFormData.username}
                                    onChange={(e) => setConnectFormData(prev => ({...prev, username: e.target.value}))}
                                  />
                                </div>
                                <Button 
                                  className="w-full bg-gradient-primary hover:shadow-glow text-primary-foreground"
                                  onClick={() => handleConnect(platform.platform)}
                                  disabled={!connectFormData.apiKey || !connectFormData.username}
                                >
                                  Conectar {platform.platform}
                                </Button>
                              </div>
                            )}
                            
                            {platform.status === 'connected' && (
                              <div className="pt-3 border-t border-border">
                                <Button variant="outline" className="w-full">
                                  Desconectar
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Usuários</p>
                    <p className="font-bold text-foreground">{platform.users}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Receita/Mês</p>
                    <p className="font-bold text-success">{platform.revenue}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Settings Sections */}
      {settingsSections.map((section, sectionIndex) => {
        const Icon = section.icon;
        
        return (
          <Card key={sectionIndex} className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Icon className="w-5 h-5 text-primary" />
                <span>{section.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {section.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-card-hover transition-colors">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{item.label}</h4>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch
                      checked={settings[item.key] || false}
                      onCheckedChange={(checked) => updateSetting(item.key, checked)}
                      className="ml-4"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* System Status */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-primary" />
            <span>🖥️ Status do Sistema</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {systemStatus.map((service, index) => {
              const isOperational = service.status === 'operational';
              const isDegraded = service.status === 'degraded';
              
              return (
                <div 
                  key={index} 
                  className={`p-4 text-center rounded-lg border ${
                    isOperational 
                      ? 'border-success/20 bg-success/10' 
                      : isDegraded 
                        ? 'border-warning/20 bg-warning/10'
                        : 'border-destructive/20 bg-destructive/10'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full mx-auto mb-2 animate-pulse ${
                    isOperational 
                      ? 'bg-success' 
                      : isDegraded 
                        ? 'bg-warning'
                        : 'bg-destructive'
                  }`}></div>
                  <p className={`font-medium ${
                    isOperational 
                      ? 'text-success' 
                      : isDegraded 
                        ? 'text-warning'
                        : 'text-destructive'
                  }`}>
                    {service.service_name}
                  </p>
                  <p className={`text-xs ${
                    isOperational 
                      ? 'text-success/80' 
                      : isDegraded 
                        ? 'text-warning/80'
                        : 'text-destructive/80'
                  }`}>
                    {isOperational 
                      ? `${service.uptime_percentage}% Uptime` 
                      : isDegraded 
                        ? 'Lenta'
                        : 'Inativo'}
                  </p>
                  {service.response_time && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {service.response_time}ms
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Mobile App Settings */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-primary" />
            <span>📱 App Mobile</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-foreground mb-3">Configurações do App</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <span className="text-sm text-foreground">Notificações Push</span>
                  <Badge className={getAppStatByType('feature') === 'active' ? 'bg-success text-success-foreground' : 'bg-secondary text-secondary-foreground'}>
                    {getAppStatByType('push_notifications') === 'active' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <span className="text-sm text-foreground">Atualizações Automáticas</span>
                  <Badge variant="secondary">
                    {getAppStatByType('auto_updates') === 'active' ? 'Ativo' : 'Desabilitado'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <span className="text-sm text-foreground">Analytics</span>
                  <Badge className={getAppStatByType('analytics_tracking') === 'active' ? 'bg-success text-success-foreground' : 'bg-secondary text-secondary-foreground'}>
                    {getAppStatByType('analytics_tracking') === 'active' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-foreground mb-3">Estatísticas</h4>
              <div className="space-y-3">
                <div className="p-3 border border-border rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Downloads Totais</span>
                    <span className="font-bold text-foreground">{getAppStatByType('downloads') || '0'}</span>
                  </div>
                </div>
                <div className="p-3 border border-border rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Usuários Ativos</span>
                    <span className="font-bold text-foreground">{getAppStatByType('active_users') || '0'}</span>
                  </div>
                </div>
                <div className="p-3 border border-border rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Versão Atual</span>
                    <span className="font-bold text-foreground">{getAppStatByType('version') || 'v1.0.0'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-primary" />
            <span>🔒 Segurança</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-foreground mb-1">Backup Automático</h4>
                  <p className="text-sm text-muted-foreground">
                    {(() => {
                      const backupLog = getSecurityLogByType('backup');
                      if (backupLog) {
                        return `Último backup: ${format(new Date(backupLog.created_at), 'dd/MM/yyyy \'às\' HH:mm', { locale: ptBR })}`;
                      }
                      return 'Nenhum backup realizado';
                    })()}
                  </p>
                </div>
                <Button 
                  size="sm" 
                  className="bg-gradient-primary hover:shadow-glow text-primary-foreground flex items-center space-x-2"
                  onClick={performBackup}
                >
                  <Download className="w-4 h-4" />
                  <span>Fazer Backup</span>
                </Button>
              </div>
            </div>
            
            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-foreground mb-1">Logs de Auditoria</h4>
                  <p className="text-sm text-muted-foreground">
                    {(() => {
                      const auditLog = getSecurityLogByType('audit');
                      if (auditLog?.metadata?.entries) {
                        return `${auditLog.metadata.entries} entradas disponíveis para revisão`;
                      }
                      return 'Monitorar atividades do sistema';
                    })()}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="flex items-center space-x-2">
                  <Eye className="w-4 h-4" />
                  <span>Ver Logs</span>
                </Button>
              </div>
            </div>
            
            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-foreground mb-1">Sessões Ativas</h4>
                  <p className="text-sm text-muted-foreground">
                    {(() => {
                      const sessionLog = getSecurityLogByType('session');
                      if (sessionLog?.metadata?.active_sessions) {
                        return `${sessionLog.metadata.active_sessions} dispositivos conectados`;
                      }
                      return 'Nenhuma sessão ativa';
                    })()}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Gerenciar</span>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};