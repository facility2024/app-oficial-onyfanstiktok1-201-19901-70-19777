import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Crown, Calendar, DollarSign, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format, differenceInDays, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import coconudiLogo from '@/assets/coconudi-logo-white.png';

interface ModelSubscription {
  id: string;
  model_id: string;
  subscription_value: number;
  subscribed_at: string;
  renewal_date: string;
  is_active: boolean;
  payment_frequency: 'monthly' | 'quarterly' | 'yearly';
  model: {
    id: string;
    username: string;
    avatar_url: string;
    bio?: string;
  };
}

const SubscriptionsPage = () => {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<ModelSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUserId(session.user.id);
      fetchSubscriptions(session.user.id);
    } else {
      setIsLoading(false);
      toast.error('Você precisa estar logado para ver suas assinaturas');
    }
  };

  const fetchSubscriptions = async (uid: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('model_subscriptions' as any)
        .select(`
          id,
          model_id,
          subscription_value,
          subscribed_at,
          renewal_date,
          is_active,
          payment_frequency,
          model:models (
            id,
            username,
            avatar_url,
            bio
          )
        `)
        .eq('user_id', uid)
        .order('subscribed_at', { ascending: false });

      if (error) throw error;

      setSubscriptions((data as any) || []);
    } catch (error) {
      console.error('Erro ao buscar assinaturas:', error);
      toast.error('Erro ao carregar suas assinaturas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    try {
      const { error } = await supabase
        .from('model_subscriptions' as any)
        .update({ is_active: false })
        .eq('id', subscriptionId);

      if (error) throw error;

      setSubscriptions(prev =>
        prev.map(sub =>
          sub.id === subscriptionId ? { ...sub, is_active: false } : sub
        )
      );
      toast.success('Assinatura cancelada com sucesso');
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      toast.error('Erro ao cancelar assinatura');
    }
  };

  const handleRenewSubscription = async (subscriptionId: string) => {
    try {
      const { error } = await supabase
        .from('model_subscriptions' as any)
        .update({ 
          is_active: true,
          renewal_date: addMonths(new Date(), 1).toISOString()
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      toast.success('Assinatura renovada com sucesso');
      if (userId) fetchSubscriptions(userId);
    } catch (error) {
      console.error('Erro ao renovar assinatura:', error);
      toast.error('Erro ao renovar assinatura');
    }
  };

  const getDaysUntilRenewal = (renewalDate: string) => {
    return differenceInDays(new Date(renewalDate), new Date());
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels = {
      monthly: 'Mensal',
      quarterly: 'Trimestral',
      yearly: 'Anual'
    };
    return labels[frequency as keyof typeof labels] || 'Mensal';
  };

  const getTotalSpent = () => {
    return subscriptions
      .filter(sub => sub.is_active)
      .reduce((sum, sub) => sum + sub.subscription_value, 0);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div 
        className="sticky top-0 z-10 text-white shadow-lg"
        style={{
          background: 'linear-gradient(to right, rgba(0, 245, 212, 0.95) 0%, rgba(0, 229, 204, 0.95) 25%, rgba(191, 234, 124, 0.95) 50%, rgba(254, 228, 64, 0.95) 75%, rgba(255, 217, 61, 0.95) 100%)'
        }}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft size={24} />
              </Button>
              <div className="flex items-center gap-2">
                <Crown size={24} className="fill-yellow-400 text-yellow-400" />
                <h1 className="text-2xl font-bold">Minhas Assinaturas</h1>
              </div>
            </div>
            
            {/* Logo CocoNudi */}
            <img 
              src={coconudiLogo} 
              alt="CocoNudi" 
              className="h-8 md:h-10 opacity-90 drop-shadow-lg"
            />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-3">
              <div className="flex items-center gap-2 text-white/80 text-xs mb-1">
                <Crown size={14} />
                <span>Assinaturas Ativas</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {subscriptions.filter(sub => sub.is_active).length}
              </p>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-3">
              <div className="flex items-center gap-2 text-white/80 text-xs mb-1">
                <DollarSign size={14} />
                <span>Gasto Mensal</span>
              </div>
              <p className="text-2xl font-bold text-white">
                R$ {getTotalSpent().toFixed(2)}
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-20">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4 bg-gray-900/50 border-white/10">
                <div className="flex gap-4 animate-pulse">
                  <div className="w-16 h-16 rounded-full bg-gray-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-800 rounded w-32" />
                    <div className="h-3 bg-gray-800 rounded w-24" />
                    <div className="h-3 bg-gray-800 rounded w-40" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : subscriptions.length === 0 ? (
          <Card className="p-12 text-center bg-gray-900/50 border-white/10">
            <Crown size={64} className="mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Nenhuma assinatura ainda
            </h2>
            <p className="text-gray-400 mb-6">
              Assine suas modelos favoritas para ter acesso a conteúdo exclusivo
            </p>
            <Button onClick={() => navigate('/app')}>
              Explorar Modelos
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {subscriptions.map((subscription) => {
              const daysUntilRenewal = getDaysUntilRenewal(subscription.renewal_date);
              const isExpiringSoon = daysUntilRenewal <= 7 && daysUntilRenewal >= 0;
              const isExpired = daysUntilRenewal < 0;

              return (
                <Card
                  key={subscription.id}
                  className={`p-4 bg-gray-900/50 border border-white/10 transition-all hover:shadow-lg hover:border-white/20 ${
                    !subscription.is_active ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Avatar */}
                    <div
                      className="relative cursor-pointer shrink-0"
                      onClick={() => navigate(`/profile/${subscription.model_id}`)}
                    >
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/30">
                        <img
                          src={subscription.model.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                          alt={subscription.model.username}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {subscription.is_active && (
                        <div className="absolute -top-1 -right-1 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full p-1">
                          <Crown size={12} className="fill-white text-white" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div
                          className="cursor-pointer"
                          onClick={() => navigate(`/profile/${subscription.model_id}`)}
                        >
                          <h3 className="font-bold text-white text-lg truncate">
                            @{subscription.model.username}
                          </h3>
                          {subscription.model.bio && (
                            <p className="text-sm text-gray-400 line-clamp-1">
                              {subscription.model.bio}
                            </p>
                          )}
                        </div>
                        
                        <Badge
                          variant={subscription.is_active ? 'default' : 'secondary'}
                          className="shrink-0"
                        >
                          {subscription.is_active ? (
                            <CheckCircle2 size={12} className="mr-1" />
                          ) : (
                            <AlertCircle size={12} className="mr-1" />
                          )}
                          {subscription.is_active ? 'Ativa' : 'Cancelada'}
                        </Badge>
                      </div>

                      {/* Subscription Details */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign size={14} className="text-green-600" />
                          <span className="font-semibold text-green-600">
                            R$ {subscription.subscription_value.toFixed(2)}/mês
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {getFrequencyLabel(subscription.payment_frequency)}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Calendar size={14} />
                          <span>
                            Assinado em {format(new Date(subscription.subscribed_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </span>
                        </div>

                        {subscription.is_active && (
                          <div className="flex items-center gap-2 text-sm">
                            <RefreshCw size={14} className={isExpiringSoon ? 'text-orange-500' : 'text-gray-400'} />
                            <span className={isExpiringSoon ? 'text-orange-500 font-medium' : 'text-gray-400'}>
                              {isExpired ? (
                                'Renovação vencida'
                              ) : daysUntilRenewal === 0 ? (
                                'Renova hoje'
                              ) : (
                                `Renova em ${daysUntilRenewal} ${daysUntilRenewal === 1 ? 'dia' : 'dias'} (${format(new Date(subscription.renewal_date), "dd/MM/yyyy")})`
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/profile/${subscription.model_id}`)}
                          className="flex-1"
                        >
                          Ver Perfil
                        </Button>
                        
                        {subscription.is_active ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleCancelSubscription(subscription.id)}
                          >
                            Cancelar
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleRenewSubscription(subscription.id)}
                          >
                            Renovar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionsPage;
