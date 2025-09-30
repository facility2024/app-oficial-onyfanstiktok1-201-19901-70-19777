import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Mail, 
  MessageSquare, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  CreditCard,
  Webhook,
  Send
} from 'lucide-react';
import { BulkEmailModal } from './BulkEmailModal';

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IntegrationsModal = ({ isOpen, onClose }: IntegrationsModalProps) => {
  const [loading, setLoading] = useState(false);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [showBulkEmail, setShowBulkEmail] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchIntegrations();
    }
  }, [isOpen]);

  const [webhookUrl, setWebhookUrl] = useState('');
  const [gmailConfig, setGmailConfig] = useState({
    email: '',
    appPassword: '',
    enabled: false
  });
  const [smsConfig, setSmsConfig] = useState({
    email: 'me@icarotavares.com',
    password: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
    templateId: '3085',
    enabled: false
  });
  const [paymentConfig, setPaymentConfig] = useState({
    stripeKey: '',
    paypalKey: '',
    mercadoPagoKey: ''
  });

  const fetchIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('*');
      
      if (error) throw error;
      
      setIntegrations(data || []);
      
      // Carregar configurações existentes
      data?.forEach((integration: any) => {
        const config = integration.configuration;
        switch (integration.integration_type) {
          case 'gmail':
            setGmailConfig({
              email: config.email || '',
              appPassword: config.appPassword || '',
              enabled: true
            });
            break;
          case 'sms':
            setSmsConfig({
              email: config.email || 'me@icarotavares.com',
              password: config.password || 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
              templateId: config.templateId || '3085',
              enabled: true
            });
            break;
          case 'pagamentos':
            setPaymentConfig({
              stripeKey: config.stripeKey || '',
              paypalKey: config.paypalKey || '',
              mercadoPagoKey: config.mercadoPagoKey || ''
            });
            break;
          case 'webhook':
            setWebhookUrl(config.url || '');
            break;
        }
      });
    } catch (error) {
      console.error('Erro ao buscar integrações:', error);
    }
  };

  const handleSaveIntegration = async (type: string) => {
    setLoading(true);
    try {
      let configData = {};
      
      if (type === 'Gmail') {
        configData = {
          email: gmailConfig.email,
          appPassword: gmailConfig.appPassword
        };
      } else if (type === 'SMS') {
        configData = smsConfig;
      } else if (type === 'Pagamentos') {
        configData = paymentConfig;
      } else if (type === 'Webhook') {
        configData = { url: webhookUrl };
      }

      // Primeiro, verificar se já existe uma integração deste tipo
      const { data: existingIntegration } = await supabase
        .from('integrations')
        .select('id')
        .eq('integration_type', type.toLowerCase())
        .single();

      let error;
      if (existingIntegration) {
        // Atualizar integração existente
        const { error: updateError } = await supabase
          .from('integrations')
          .update({
            name: type,
            configuration: configData,
            is_active: true
          })
          .eq('integration_type', type.toLowerCase());
        error = updateError;
      } else {
        // Criar nova integração
        const { error: insertError } = await supabase
          .from('integrations')
          .insert({
            name: type,
            integration_type: type.toLowerCase(),
            configuration: configData,
            is_active: true
          });
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: `Integração ${type} salva com sucesso`,
      });

      // Recarregar dados
      fetchIntegrations();
    } catch (error) {
      console.error('Erro ao salvar integração:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar integração',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const testIntegration = async (type: string) => {
    try {
      if (type === 'gmail') {
        const { error } = await supabase.functions.invoke('send-email', {
          body: {
            recipient: gmailConfig.email,
            subject: 'Teste de Integração Gmail',
            body: 'Este é um email de teste para verificar se a integração Gmail está funcionando corretamente.',
            provider: 'gmail'
          }
        });

        if (error) throw error;

        toast({
          title: 'Teste realizado!',
          description: 'Email de teste enviado com sucesso',
        });
      } else if (type === 'sms') {
        const { error } = await supabase.functions.invoke('strong-sms', {
          body: {
            name: 'Teste SMS',
            phones: ['+5511999999999'],
            message: 'Teste de integração SMS - funcionando!'
          }
        });

        if (error) throw error;

        toast({
          title: 'Teste realizado!',
          description: 'SMS de teste enviado com sucesso',
        });
      } else if (type === 'webhook') {
        const { error } = await supabase.functions.invoke('trigger-webhook', {
          body: {
            url: webhookUrl,
            data: {
              type: 'test',
              message: 'Teste de webhook',
              timestamp: new Date().toISOString()
            }
          }
        });

        if (error) throw error;

        toast({
          title: 'Teste realizado!',
          description: 'Webhook disparado com sucesso',
        });
      }
    } catch (error) {
      console.error('Erro ao testar integração:', error);
      toast({
        title: 'Erro no teste',
        description: 'Falha ao testar a integração',
        variant: 'destructive'
      });
    }
  };

  const getIntegrationStatus = (type: string) => {
    const integration = integrations.find(i => i.integration_type === type);
    return integration?.is_active || false;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configurações de Integrações
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="gmail" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="gmail" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Gmail
              </TabsTrigger>
              <TabsTrigger value="sms" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                SMS
              </TabsTrigger>
              <TabsTrigger value="payment" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Pagamentos
              </TabsTrigger>
              <TabsTrigger value="webhook" className="flex items-center gap-2">
                <Webhook className="w-4 h-4" />
                Webhook
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gmail" className="mt-6">
              <Card>
                 <CardHeader>
                   <CardTitle className="flex items-center justify-between">
                     <div className="flex items-center space-x-2">
                       <Mail className="w-5 h-5 text-primary" />
                       <span>Configuração de Email</span>
                     </div>
                     <div className="flex items-center space-x-2">
                       {getIntegrationStatus('gmail') ? (
                         <CheckCircle className="w-5 h-5 text-success" />
                       ) : (
                         <AlertCircle className="w-5 h-5 text-warning" />
                       )}
                       <span className={`text-sm font-medium ${getIntegrationStatus('gmail') ? 'text-success' : 'text-warning'}`}>
                         {getIntegrationStatus('gmail') ? 'Ativo' : 'Inativo'}
                       </span>
                     </div>
                   </CardTitle>
                   <CardDescription>
                     Configure sua integração de email usando Resend (mais simples que Gmail)
                   </CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                   <div>
                     <Label htmlFor="resend-key">Chave API do Resend</Label>
                     <Input
                       id="resend-key"
                       type="password"
                       value={gmailConfig.appPassword}
                       onChange={(e) => setGmailConfig(prev => ({ ...prev, appPassword: e.target.value }))}
                       placeholder="re_..."
                     />
                   </div>
                   <div>
                     <Label htmlFor="sender-email">Email Remetente</Label>
                     <Input
                       id="sender-email"
                       type="email"
                       value={gmailConfig.email}
                       onChange={(e) => setGmailConfig(prev => ({ ...prev, email: e.target.value }))}
                       placeholder="noreply@seudominio.com"
                     />
                   </div>
                   <div className="p-3 bg-muted/50 rounded-lg">
                     <p className="text-sm text-muted-foreground">
                       <strong>Como configurar Resend:</strong><br />
                       1. Acesse <a href="https://resend.com" target="_blank" className="text-primary hover:underline">resend.com</a> e crie uma conta grátis<br />
                       2. Configure seu domínio em "Domains"<br />
                       3. Crie uma API Key em "API Keys"<br />
                       4. Use qualquer email do seu domínio como remetente
                     </p>
                   </div>
                  <div className="flex space-x-2">
                    <Button 
                      onClick={() => handleSaveIntegration('Gmail')} 
                      className="flex-1"
                      disabled={loading}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      {loading ? 'Salvando...' : 'Salvar Configuração'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => testIntegration('gmail')}
                      disabled={!getIntegrationStatus('gmail')}
                    >
                      Testar
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={() => setShowBulkEmail(true)}
                      disabled={!getIntegrationStatus('gmail')}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Envio em Massa
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sms" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="w-5 h-5 text-primary" />
                      <span>Configuração SMS</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getIntegrationStatus('sms') ? (
                        <CheckCircle className="w-5 h-5 text-success" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-warning" />
                      )}
                      <span className={`text-sm font-medium ${getIntegrationStatus('sms') ? 'text-success' : 'text-warning'}`}>
                        {getIntegrationStatus('sms') ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Configure Twilio para envio de SMS automático
                  </CardDescription>
                </CardHeader>
                 <CardContent className="space-y-4">
                   <div>
                     <Label htmlFor="strong-email">Email Strong Expert</Label>
                     <Input
                       id="strong-email"
                       value={smsConfig.email}
                       onChange={(e) => setSmsConfig(prev => ({ ...prev, email: e.target.value }))}
                       placeholder="me@icarotavares.com"
                     />
                   </div>
                   <div>
                     <Label htmlFor="strong-password">Senha (hash)</Label>
                     <Input
                       id="strong-password"
                       type="password"
                       value={smsConfig.password}
                       onChange={(e) => setSmsConfig(prev => ({ ...prev, password: e.target.value }))}
                       placeholder="Hash da senha"
                     />
                   </div>
                   <div>
                     <Label htmlFor="template-id">Template ID</Label>
                     <Input
                       id="template-id"
                       value={smsConfig.templateId}
                       onChange={(e) => setSmsConfig(prev => ({ ...prev, templateId: e.target.value }))}
                       placeholder="3085"
                     />
                   </div>
                   <div className="p-3 bg-muted/50 rounded-lg">
                     <p className="text-sm text-muted-foreground">
                       <strong>Strong Expert SMS API:</strong><br />
                       Configure sua conta Strong Expert para envio de SMS em massa.<br />
                       Variável disponível: {"{TEXTO}"} para personalização de mensagens.
                     </p>
                   </div>
                  <div className="flex space-x-2">
                    <Button 
                      onClick={() => handleSaveIntegration('SMS')} 
                      className="flex-1"
                      disabled={loading}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      {loading ? 'Salvando...' : 'Salvar Configuração'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => testIntegration('sms')}
                      disabled={!getIntegrationStatus('sms')}
                    >
                      Testar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payment" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CreditCard className="w-5 h-5 text-primary" />
                      <span>Configuração Pagamentos</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getIntegrationStatus('pagamentos') ? (
                        <CheckCircle className="w-5 h-5 text-success" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-warning" />
                      )}
                      <span className={`text-sm font-medium ${getIntegrationStatus('pagamentos') ? 'text-success' : 'text-warning'}`}>
                        {getIntegrationStatus('pagamentos') ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Configure as chaves de API para processamento de pagamentos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="stripe-key">Chave Secreta Stripe</Label>
                    <Input
                      id="stripe-key"
                      type="password"
                      value={paymentConfig.stripeKey}
                      onChange={(e) => setPaymentConfig(prev => ({ ...prev, stripeKey: e.target.value }))}
                      placeholder="sk_live_..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="mercadopago-key">Access Token MercadoPago</Label>
                    <Input
                      id="mercadopago-key"
                      type="password"
                      value={paymentConfig.mercadoPagoKey}
                      onChange={(e) => setPaymentConfig(prev => ({ ...prev, mercadoPagoKey: e.target.value }))}
                      placeholder="Access Token MercadoPago"
                    />
                  </div>
                  <div>
                    <Label htmlFor="paypal-key">Client Secret PayPal</Label>
                    <Input
                      id="paypal-key"
                      type="password"
                      value={paymentConfig.paypalKey}
                      onChange={(e) => setPaymentConfig(prev => ({ ...prev, paypalKey: e.target.value }))}
                      placeholder="Chave da API PayPal"
                    />
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>URLs de Webhook:</strong><br />
                      • Stripe: https://seu-projeto.supabase.co/functions/v1/payment-webhook<br />
                      • PayPal: https://seu-projeto.supabase.co/functions/v1/payment-webhook<br />
                      • MercadoPago: https://seu-projeto.supabase.co/functions/v1/payment-webhook
                    </p>
                  </div>
                  <Button 
                    onClick={() => handleSaveIntegration('Pagamentos')} 
                    className="w-full"
                    disabled={loading}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    {loading ? 'Salvando...' : 'Salvar Configuração Pagamentos'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="webhook" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Webhook className="w-5 h-5 text-primary" />
                      <span>Configuração Webhook</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getIntegrationStatus('webhook') ? (
                        <CheckCircle className="w-5 h-5 text-success" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-warning" />
                      )}
                      <span className={`text-sm font-medium ${getIntegrationStatus('webhook') ? 'text-success' : 'text-warning'}`}>
                        {getIntegrationStatus('webhook') ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Configure webhooks para receber dados de vendas e integrações
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="webhook-url">URL do Webhook</Label>
                    <Input
                      id="webhook-url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://seu-site.com/webhook"
                    />
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Endpoints disponíveis:</strong><br />
                      • POST /payment-webhook - Recebe eventos de pagamento<br />
                      • POST /trigger-webhook - Dispara webhooks customizados<br />
                      Content-Type: application/json
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      onClick={() => handleSaveIntegration('Webhook')} 
                      className="flex-1"
                      disabled={loading}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      {loading ? 'Salvando...' : 'Salvar Configuração'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => testIntegration('webhook')}
                      disabled={!getIntegrationStatus('webhook')}
                    >
                      Testar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </DialogContent>
        
        <BulkEmailModal 
          isOpen={showBulkEmail}
          onClose={() => setShowBulkEmail(false)}
        />
      </Dialog>
    </>
  );
};