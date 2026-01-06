import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Crown, Lock, User, Calendar, Clock, Sparkles, RefreshCw, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAllSubscriptions } from '@/hooks/useAllSubscriptions';
import coconudiLogo from '@/assets/coconudi-logo-white.png';

const MySubscriptionsPage = () => {
  const navigate = useNavigate();
  const [historyPeriod, setHistoryPeriod] = useState<string>('all');
  
  const {
    isPremium,
    premiumData,
    vipDaysRemaining,
    modelSubscriptions,
    subscriptionHistory,
    loading,
    totalActiveSubscriptions
  } = useAllSubscriptions();

  // Filtrar histórico por período
  const filteredHistory = useMemo(() => {
    if (historyPeriod === 'all') return subscriptionHistory;
    
    const now = new Date();
    let cutoffDate: Date;
    
    switch (historyPeriod) {
      case '1month':
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case '3months':
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case '1year':
        cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        return subscriptionHistory;
    }
    
    return subscriptionHistory.filter(sub => {
      const endDate = new Date(sub.subscription_end);
      return endDate >= cutoffDate;
    });
  }, [subscriptionHistory, historyPeriod]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getPlanLabel = (type: string) => {
    switch (type) {
      case 'mensal': return 'Mensal';
      case 'trimestral': return 'Trimestral';
      case 'anual': return 'Anual';
      default: return type;
    }
  };

  const getDaysLabel = (days: number) => {
    if (days === 0) return 'Expira hoje';
    if (days === 1) return '1 dia restante';
    return `${days} dias restantes`;
  };

  const getDaysBadgeColor = (days: number) => {
    if (days <= 3) return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (days <= 7) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-green-500/20 text-green-400 border-green-500/30';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Crown className="w-12 h-12 text-amber-400" />
          <p className="text-white/60">Carregando assinaturas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-black via-gray-900 to-black overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/app');
              }
            }}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            <img src={coconudiLogo} alt="Coconudi" className="h-6" />
          </div>
          
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      <div className="p-4 pb-24 max-w-2xl mx-auto space-y-6">
        {/* Título */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-2xl font-bold text-white mb-1">Minhas Assinaturas</h1>
          <p className="text-white/60 text-sm">
            {totalActiveSubscriptions === 0 
              ? 'Você ainda não possui assinaturas ativas'
              : `${totalActiveSubscriptions} assinatura${totalActiveSubscriptions > 1 ? 's' : ''} ativa${totalActiveSubscriptions > 1 ? 's' : ''}`
            }
          </p>
        </motion.div>

        {/* VIP Global Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className={`border ${isPremium ? 'border-amber-500/50 bg-gradient-to-b from-amber-950 to-amber-900' : 'border-white/10 bg-white/5'}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Crown className={`w-5 h-5 ${isPremium ? 'text-amber-400' : 'text-white/40'}`} />
                <span className={isPremium ? 'text-amber-300 font-semibold' : 'text-white/60'}>VIP Global</span>
                {isPremium && (
                  <Badge className="ml-auto bg-amber-500/30 text-amber-200 border-amber-400/50">
                    Ativo
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isPremium ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-amber-200/80">Plano</span>
                    <span className="text-white font-semibold">
                      {getPlanLabel(premiumData?.subscription_type || 'mensal')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-amber-200/80">Início</span>
                    <span className="text-white font-medium">
                      {premiumData?.subscription_start ? formatDate(premiumData.subscription_start) : '-'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-amber-200/80">Renovação</span>
                    <span className="text-white font-medium">
                      {premiumData?.subscription_end ? formatDate(premiumData.subscription_end) : '-'}
                    </span>
                  </div>
                  
                  <div className="pt-2 border-t border-amber-700/50">
                    <Badge className={getDaysBadgeColor(vipDaysRemaining)}>
                      <Clock className="w-3 h-3 mr-1" />
                      {getDaysLabel(vipDaysRemaining)}
                    </Badge>
                  </div>

                  <div className="pt-2 text-xs text-amber-200/70">
                    <Sparkles className="w-3 h-3 inline mr-1" />
                    Acesso a todo conteúdo premium da plataforma
                  </div>

                  {/* Botão Renovar */}
                  <div className="pt-3 border-t border-amber-700/50">
                    <Button
                      onClick={() => navigate('/subscribe')}
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Renovar Assinatura
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-white/60 text-sm mb-4">
                    Desbloqueie todo o conteúdo premium da plataforma
                  </p>
                  <Button
                    onClick={() => navigate('/subscribe')}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Tornar-se VIP
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Assinaturas Individuais */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Assinaturas Individuais</h2>
            <Badge variant="outline" className="ml-auto text-white/60 border-white/20">
              {modelSubscriptions.length}
            </Badge>
          </div>

          {modelSubscriptions.length > 0 ? (
            <div className="grid gap-3">
              {modelSubscriptions.map((sub, index) => (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <Card className="border border-purple-500/20 bg-gradient-to-br from-purple-900/10 to-purple-800/5 hover:border-purple-500/40 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <Avatar 
                          className="w-14 h-14 border-2 border-purple-500/30 cursor-pointer"
                          onClick={() => navigate(`/profile/${sub.model_id}`)}
                        >
                          <AvatarImage src={sub.modelInfo?.avatar_url} />
                          <AvatarFallback className="bg-purple-500/20 text-purple-400">
                            <User className="w-6 h-6" />
                          </AvatarFallback>
                        </Avatar>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">
                            {sub.modelInfo?.name || 'Modelo'}
                          </p>
                          {sub.modelInfo?.username && (
                            <p className="text-white/50 text-sm truncate">
                              @{sub.modelInfo.username}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs text-purple-400 border-purple-500/30">
                              {getPlanLabel(sub.subscription_type)}
                            </Badge>
                            <Badge className={`text-xs ${getDaysBadgeColor(sub.daysRemaining)}`}>
                              {getDaysLabel(sub.daysRemaining)}
                            </Badge>
                          </div>
                        </div>

                        {/* Ação */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/profile/${sub.model_id}`)}
                          className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                        >
                          Ver Perfil
                        </Button>
                      </div>

                      {/* Datas e Ações */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                        <div className="flex items-center gap-4 text-xs text-white/40">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Início: {formatDate(sub.subscription_start)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Expira: {formatDate(sub.subscription_end)}
                          </span>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/profile/${sub.model_id}`)}
                          className="bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Renovar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="border border-white/10 bg-white/5">
              <CardContent className="p-8 text-center">
                <Lock className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/60 mb-4">
                  Você ainda não assina nenhum criador individualmente
                </p>
                <p className="text-white/40 text-sm mb-4">
                  Assine seus criadores favoritos para acessar conteúdo exclusivo
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate('/app')}
                  className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                >
                  Descobrir Criadores
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Histórico de Assinaturas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Histórico</h2>
            
            {/* Filtro de Período */}
            <Select value={historyPeriod} onValueChange={setHistoryPeriod}>
              <SelectTrigger className="w-[140px] ml-auto h-8 text-xs bg-white/5 border-white/10 text-white/70">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/10">
                <SelectItem value="all" className="text-white/80">Todos</SelectItem>
                <SelectItem value="1month" className="text-white/80">Último mês</SelectItem>
                <SelectItem value="3months" className="text-white/80">Últimos 3 meses</SelectItem>
                <SelectItem value="1year" className="text-white/80">Último ano</SelectItem>
              </SelectContent>
            </Select>
            
            <Badge variant="outline" className="text-white/60 border-white/20">
              {filteredHistory.length}
            </Badge>
          </div>

          {filteredHistory.length > 0 ? (
            <div className="grid gap-2">
              {filteredHistory.map((sub) => (
                <Card key={sub.id} className="border border-white/5 bg-white/5">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 opacity-60">
                        <AvatarImage src={sub.modelInfo?.avatar_url} />
                        <AvatarFallback className="bg-gray-700">
                          <User className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-white/70 text-sm truncate">
                          {sub.modelInfo?.name || 'Modelo'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-white/40">
                          <span>{getPlanLabel(sub.subscription_type)}</span>
                          <span>•</span>
                          <span>{formatDate(sub.subscription_start)} - {formatDate(sub.subscription_end)}</span>
                        </div>
                      </div>
                      
                      <Badge className={
                        sub.subscription_status === 'cancelled' 
                          ? 'bg-red-500/20 text-red-400 border-red-500/30'
                          : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      }>
                        {sub.subscription_status === 'cancelled' ? 'Cancelada' : 'Expirada'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border border-white/5 bg-white/5">
              <CardContent className="p-6 text-center">
                <History className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/50 text-sm">
                  Nenhum histórico de assinaturas anteriores
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default MySubscriptionsPage;
