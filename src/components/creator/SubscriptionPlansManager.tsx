import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Crown, DollarSign, Link, Loader2, Save, Percent } from 'lucide-react';

interface Plan {
  id?: string;
  model_id: string;
  model_type: 'creator';
  plan_type: 'mensal';
  price: number;
  discount_label: string | null;
  payment_url: string | null;
  is_active: boolean;
}

interface SubscriptionPlansManagerProps {
  creatorId: string;
}

export const SubscriptionPlansManager = ({ creatorId }: SubscriptionPlansManagerProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([
    { model_id: creatorId, model_type: 'creator', plan_type: 'mensal', price: 14.90, discount_label: null, payment_url: null, is_active: true },
  ]);

  useEffect(() => {
    fetchPlans();
  }, [creatorId]);

  const fetchPlans = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('model_subscription_plans')
        .select('*')
        .eq('model_id', creatorId)
        .order('price', { ascending: true });

      if (error) {
        console.log('Erro ao buscar planos (tabela pode não existir):', error.message);
        return;
      }

      if (data && data.length > 0) {
        // Filtrar apenas planos mensais
        setPlans(data.filter((p: any) => p.plan_type === 'mensal'));
      }
    } catch (err) {
      console.error('Erro ao buscar planos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = (planType: 'mensal', field: keyof Plan, value: any) => {
    setPlans(prev => prev.map(p => 
      p.plan_type === planType ? { ...p, [field]: value } : p
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const plan of plans) {
        const planData = {
          model_id: creatorId,
          model_type: 'creator',
          plan_type: plan.plan_type,
          price: plan.price,
          discount_label: plan.discount_label,
          payment_url: plan.payment_url,
          is_active: plan.is_active,
        };

        if (plan.id) {
          // Update existing
          const { error } = await (supabase as any)
            .from('model_subscription_plans')
            .update(planData)
            .eq('id', plan.id);
          
          if (error) throw error;
        } else {
          // Check if exists and insert or update
          const { data: existing } = await (supabase as any)
            .from('model_subscription_plans')
            .select('id')
            .eq('model_id', creatorId)
            .eq('plan_type', plan.plan_type)
            .maybeSingle();

          if (existing) {
            const { error } = await (supabase as any)
              .from('model_subscription_plans')
              .update(planData)
              .eq('id', existing.id);
            
            if (error) throw error;
          } else {
            const { error } = await (supabase as any)
              .from('model_subscription_plans')
              .insert(planData);
            
            if (error) throw error;
          }
        }
      }

      toast.success('Planos salvos com sucesso!');
      fetchPlans(); // Reload to get IDs
    } catch (error: any) {
      console.error('Erro ao salvar planos:', error);
      toast.error('Erro ao salvar planos: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const getPlanLabel = (planType: string) => {
    switch (planType) {
      case 'mensal': return 'Mensal';
      case 'trimestral': return 'Trimestral';
      case 'anual': return 'Anual';
      default: return planType;
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700 p-6">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Crown className="w-5 h-5 text-amber-500" />
        Planos de Assinatura Individual
      </h3>

      <p className="text-gray-400 text-sm mb-6">
        Configure os preços e links de pagamento para seus planos de assinatura. 
        Usuários que assinam você terão acesso a todo o seu conteúdo premium.
      </p>

      <div className="space-y-6">
        {plans.map((plan) => (
          <div 
            key={plan.plan_type}
            className={`p-4 rounded-lg border transition-all ${
              plan.is_active 
                ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30' 
                : 'bg-gray-700/50 border-gray-600'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  plan.is_active ? 'bg-amber-500' : 'bg-gray-600'
                }`}>
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-white font-semibold">{getPlanLabel(plan.plan_type)}</h4>
                  {plan.discount_label && (
                    <span className="text-xs text-green-400">{plan.discount_label}</span>
                  )}
                </div>
              </div>
              <Switch
                checked={plan.is_active}
                onCheckedChange={(checked) => handlePlanChange(plan.plan_type, 'is_active', checked)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Preço */}
              <div className="space-y-2">
                <Label className="text-gray-300 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Preço (R$)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={plan.price}
                  onChange={(e) => handlePlanChange(plan.plan_type, 'price', parseFloat(e.target.value) || 0)}
                  className="bg-gray-600 border-gray-500 text-white"
                  disabled={!plan.is_active}
                />
              </div>

              {/* Desconto Label */}
              <div className="space-y-2">
                <Label className="text-gray-300 flex items-center gap-1">
                  <Percent className="w-3 h-3" /> Label de Desconto
                </Label>
                <Input
                  type="text"
                  placeholder="Ex: 17% OFF"
                  value={plan.discount_label || ''}
                  onChange={(e) => handlePlanChange(plan.plan_type, 'discount_label', e.target.value || null)}
                  className="bg-gray-600 border-gray-500 text-white"
                  disabled={!plan.is_active}
                />
              </div>

              {/* Link de Pagamento */}
              <div className="space-y-2">
                <Label className="text-gray-300 flex items-center gap-1">
                  <Link className="w-3 h-3" /> Link de Pagamento (Hoopay)
                </Label>
                <Input
                  type="url"
                  placeholder="https://hoopay.com.br/..."
                  value={plan.payment_url || ''}
                  onChange={(e) => handlePlanChange(plan.plan_type, 'payment_url', e.target.value || null)}
                  className="bg-gray-600 border-gray-500 text-white"
                  disabled={!plan.is_active}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full mt-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Salvando...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Salvar Planos
          </>
        )}
      </Button>

      {/* Info Card */}
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
          <Link className="w-4 h-4" />
          Como obter o link de pagamento
        </h4>
        <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
          <li>Acesse sua conta no Hoopay (hoopay.com.br)</li>
          <li>Crie um produto para o plano mensal</li>
          <li>Copie o link de pagamento gerado</li>
          <li>Cole o link no campo correspondente acima</li>
          <li>Quando um usuário pagar, o acesso será liberado automaticamente</li>
        </ol>
      </div>
    </Card>
  );
};
