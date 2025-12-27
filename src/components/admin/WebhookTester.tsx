import React, { useState } from 'react';
import { Send, CheckCircle, XCircle, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  timestamp: Date;
}

export const WebhookTester = () => {
  const [formData, setFormData] = useState({
    customerName: 'Usuário Teste',
    customerEmail: 'teste@email.com',
    customerPhone: '11999999999',
    planType: 'mensal' as 'mensal' | 'trimestral' | 'anual',
    paymentStatus: 'approved' as 'approved' | 'paid' | 'pending',
  });

  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    vipCreated: boolean;
    vipData: any;
    webhookLogged: boolean;
    webhookData: any;
  } | null>(null);

  const getProductName = (planType: string) => {
    switch (planType) {
      case 'anual': return 'VIP Anual Coconudi';
      case 'trimestral': return 'VIP Trimestral Coconudi';
      default: return 'VIP Mensal Coconudi';
    }
  };

  const generatePayload = () => {
    return {
      event: 'payment.approved',
      status: formData.paymentStatus,
      customer: {
        name: formData.customerName,
        email: formData.customerEmail,
        phone: formData.customerPhone,
        whatsapp: formData.customerPhone,
      },
      product: {
        name: getProductName(formData.planType),
        id: `test_product_${formData.planType}`,
      },
      payment: {
        id: `test_payment_${Date.now()}`,
        amount: formData.planType === 'anual' ? 299.90 : formData.planType === 'trimestral' ? 89.90 : 39.90,
        method: 'pix',
      },
      metadata: {
        source: 'webhook_tester',
        test: true,
        timestamp: new Date().toISOString(),
      }
    };
  };

  const handleTestWebhook = async () => {
    setLoading(true);
    setTestResult(null);
    setVerificationResult(null);

    const payload = generatePayload();

    try {
      // Chamar o webhook diretamente
      const response = await fetch(
        'https://tnzvhwapfhkhqjgyiomk.supabase.co/functions/v1/hoopay-webhook',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setTestResult({
          success: true,
          message: data.message || 'Webhook executado com sucesso!',
          data,
          timestamp: new Date(),
        });
        toast.success('Webhook executado com sucesso!');

        // Verificar se VIP foi criado/atualizado
        await verifyResults();
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Erro ao executar webhook',
          data,
          timestamp: new Date(),
        });
        toast.error('Erro ao executar webhook');
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Erro de conexão',
        timestamp: new Date(),
      });
      toast.error('Erro ao conectar com o webhook');
    } finally {
      setLoading(false);
    }
  };

  const verifyResults = async () => {
    // Verificar se VIP foi criado na tabela premium_users
    const { data: vipData, error: vipError } = await supabase
      .from('premium_users')
      .select('*')
      .eq('email', formData.customerEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Verificar se webhook foi logado
    const { data: webhookData, error: webhookError } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('source', 'hoopay')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setVerificationResult({
      vipCreated: !!vipData && !vipError,
      vipData,
      webhookLogged: !!webhookData && !webhookError,
      webhookData,
    });
  };

  const handleVerifyOnly = async () => {
    setLoading(true);
    await verifyResults();
    setLoading(false);
    toast.info('Verificação concluída');
  };

  return (
    <Card className="bg-gray-900/50 border-amber-500/30">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Send className="w-5 h-5 text-amber-400" />
          Testar Webhook Hoopay
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Formulário */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-300">Nome do Cliente</Label>
            <Input
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              className="bg-gray-800 border-gray-700"
              placeholder="Nome completo"
            />
          </div>
          <div>
            <Label className="text-gray-300">Email</Label>
            <Input
              type="email"
              value={formData.customerEmail}
              onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
              className="bg-gray-800 border-gray-700"
              placeholder="email@exemplo.com"
            />
          </div>
          <div>
            <Label className="text-gray-300">Telefone/WhatsApp</Label>
            <Input
              value={formData.customerPhone}
              onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              className="bg-gray-800 border-gray-700"
              placeholder="11999999999"
            />
          </div>
          <div>
            <Label className="text-gray-300">Tipo de Plano</Label>
            <Select
              value={formData.planType}
              onValueChange={(v: 'mensal' | 'trimestral' | 'anual') => setFormData({ ...formData, planType: v })}
            >
              <SelectTrigger className="bg-gray-800 border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mensal">Mensal (30 dias)</SelectItem>
                <SelectItem value="trimestral">Trimestral (90 dias)</SelectItem>
                <SelectItem value="anual">Anual (365 dias)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-gray-300">Status do Pagamento</Label>
            <Select
              value={formData.paymentStatus}
              onValueChange={(v: 'approved' | 'paid' | 'pending') => setFormData({ ...formData, paymentStatus: v })}
            >
              <SelectTrigger className="bg-gray-800 border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">Aprovado ✅</SelectItem>
                <SelectItem value="paid">Pago ✅</SelectItem>
                <SelectItem value="pending">Pendente ⏳</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Preview do Payload */}
        <div>
          <Label className="text-gray-300 mb-2 block">Preview do Payload</Label>
          <pre className="bg-gray-800 p-4 rounded-lg text-xs text-gray-300 overflow-auto max-h-40">
            {JSON.stringify(generatePayload(), null, 2)}
          </pre>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-3">
          <Button
            onClick={handleTestWebhook}
            disabled={loading}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Enviar Teste
          </Button>
          <Button
            onClick={handleVerifyOnly}
            disabled={loading}
            variant="outline"
            className="border-gray-600"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Verificar Resultados
          </Button>
        </div>

        {/* Resultado do Teste */}
        {testResult && (
          <div className={`p-4 rounded-lg border ${
            testResult.success 
              ? 'bg-green-500/10 border-green-500/30' 
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {testResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
              <span className={`font-medium ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                {testResult.success ? 'Sucesso' : 'Erro'}
              </span>
              <span className="text-xs text-gray-500">
                {testResult.timestamp.toLocaleTimeString()}
              </span>
            </div>
            <p className="text-sm text-gray-300">{testResult.message}</p>
            {testResult.data && (
              <pre className="mt-2 text-xs text-gray-400 bg-black/30 p-2 rounded overflow-auto max-h-32">
                {JSON.stringify(testResult.data, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Verificação de Resultados */}
        {verificationResult && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Verificação do Banco de Dados
            </h4>

            {/* VIP Status */}
            <div className={`p-3 rounded-lg border ${
              verificationResult.vipCreated 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">VIP Criado/Atualizado</span>
                <Badge variant={verificationResult.vipCreated ? 'default' : 'destructive'}>
                  {verificationResult.vipCreated ? 'Sim ✅' : 'Não ❌'}
                </Badge>
              </div>
              {verificationResult.vipData && (
                <div className="mt-2 text-xs text-gray-400">
                  <p>Email: {verificationResult.vipData.email}</p>
                  <p>Status: {verificationResult.vipData.subscription_status}</p>
                  <p>Plano: {verificationResult.vipData.subscription_type}</p>
                  <p>Expira: {verificationResult.vipData.subscription_end}</p>
                </div>
              )}
            </div>

            {/* Webhook Log Status */}
            <div className={`p-3 rounded-lg border ${
              verificationResult.webhookLogged 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-yellow-500/10 border-yellow-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Webhook Logado</span>
                <Badge variant={verificationResult.webhookLogged ? 'default' : 'secondary'}>
                  {verificationResult.webhookLogged ? 'Sim ✅' : 'Não encontrado'}
                </Badge>
              </div>
              {verificationResult.webhookData && (
                <div className="mt-2 text-xs text-gray-400">
                  <p>Source: {verificationResult.webhookData.source}</p>
                  <p>Event: {verificationResult.webhookData.event_type}</p>
                  <p>Processado: {verificationResult.webhookData.processed_at ? 'Sim' : 'Não'}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Endpoint Info */}
        <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
          <p className="text-xs text-gray-400">
            <strong className="text-gray-300">Endpoint:</strong>{' '}
            <code className="text-amber-400">
              https://tnzvhwapfhkhqjgyiomk.supabase.co/functions/v1/hoopay-webhook
            </code>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
