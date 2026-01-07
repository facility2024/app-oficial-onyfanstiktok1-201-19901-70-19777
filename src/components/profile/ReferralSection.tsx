import { useState } from 'react';
import { useReferralSystem } from '@/hooks/useReferralSystem';
import { useNudixWallet } from '@/hooks/useNudixWallet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Share2, Users, Gift, CheckCircle, Clock, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function ReferralSection() {
  const { 
    referrals, 
    stats, 
    loading, 
    referralLink, 
    copyReferralLink, 
    shareReferralLink 
  } = useReferralSystem();
  const { wallet, formatNudix } = useNudixWallet();
  const [showAllReferrals, setShowAllReferrals] = useState(false);

  const handleCopyLink = async () => {
    const success = await copyReferralLink();
    if (success) {
      toast.success('Link copiado!', {
        description: 'Compartilhe com seus amigos'
      });
    } else {
      toast.error('Erro ao copiar link');
    }
  };

  const handleShare = async (platform: 'whatsapp' | 'telegram' | 'native') => {
    await shareReferralLink(platform);
  };

  const displayedReferrals = showAllReferrals ? referrals : referrals.slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Carteira Nudix */}
      <Card className="bg-gradient-to-br from-amber-900/40 to-yellow-900/40 border-amber-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2 text-amber-300">
            <Gift className="w-5 h-5" />
            Minha Carteira Nudix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-amber-400 mb-2">
            {formatNudix(wallet.nudix_balance)}
          </div>
          <div className="flex gap-4 text-sm text-gray-400">
            <span>Ganho: {formatNudix(wallet.total_earned)}</span>
            <span>Gasto: {formatNudix(wallet.total_spent)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Programa de Afiliados */}
      <Card className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2 text-purple-300">
            <Users className="w-5 h-5" />
            Programa de Afiliados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-300">
            Indique amigos e ganhe <span className="text-amber-400 font-bold">N$ 1,00</span> por cada cadastro!
          </p>

          {/* Link de Convite */}
          {referralLink && (
            <div className="bg-black/30 rounded-lg p-3 border border-white/10">
              <p className="text-xs text-gray-400 mb-1">Seu link de convite:</p>
              <div className="flex items-center gap-2">
                <code className="text-xs text-purple-300 bg-black/50 px-2 py-1 rounded flex-1 truncate">
                  {referralLink}
                </code>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleCopyLink}
                  className="shrink-0 border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Botões de Compartilhamento */}
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => handleShare('whatsapp')}
              className="bg-green-600 hover:bg-green-700 text-white flex-1"
            >
              <MessageCircle className="w-4 h-4 mr-1" />
              WhatsApp
            </Button>
            <Button
              size="sm"
              onClick={() => handleShare('telegram')}
              className="bg-blue-500 hover:bg-blue-600 text-white flex-1"
            >
              <Share2 className="w-4 h-4 mr-1" />
              Telegram
            </Button>
            <Button
              size="sm"
              onClick={() => handleShare('native')}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 flex-1"
            >
              <Share2 className="w-4 h-4 mr-1" />
              Mais
            </Button>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="bg-black/30 rounded-lg p-2 text-center">
              <div className="text-xl font-bold text-white">{stats.totalReferrals}</div>
              <div className="text-xs text-gray-400">Indicações</div>
            </div>
            <div className="bg-black/30 rounded-lg p-2 text-center">
              <div className="text-xl font-bold text-green-400">{stats.completedReferrals}</div>
              <div className="text-xs text-gray-400">Confirmadas</div>
            </div>
            <div className="bg-black/30 rounded-lg p-2 text-center">
              <div className="text-xl font-bold text-amber-400">{formatNudix(stats.totalEarned)}</div>
              <div className="text-xs text-gray-400">Ganho</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Indicações */}
      {referrals.length > 0 && (
        <Card className="bg-gray-900/50 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-gray-300">
              Suas Indicações ({referrals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {loading ? (
                <div className="text-center text-gray-400 py-4">Carregando...</div>
              ) : (
                <>
                  {displayedReferrals.map((referral) => (
                    <div 
                      key={referral.id} 
                      className="flex items-center justify-between bg-black/30 rounded-lg p-2"
                    >
                      <div className="flex items-center gap-2">
                        {referral.status === 'completed' ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Clock className="w-4 h-4 text-yellow-400" />
                        )}
                        <span className="text-sm text-gray-300 truncate max-w-[150px]">
                          {referral.referred_email}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={referral.status === 'completed' ? 'default' : 'secondary'}
                          className={referral.status === 'completed' 
                            ? 'bg-green-600/20 text-green-400 border-green-500/30' 
                            : 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30'
                          }
                        >
                          {referral.status === 'completed' ? 'Confirmada' : 'Pendente'}
                        </Badge>
                        {referral.status === 'completed' && (
                          <span className="text-xs text-amber-400 font-medium">
                            +N$ 1,00
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {referrals.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllReferrals(!showAllReferrals)}
                      className="w-full text-purple-400 hover:text-purple-300"
                    >
                      {showAllReferrals ? 'Mostrar menos' : `Ver todas (${referrals.length})`}
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
