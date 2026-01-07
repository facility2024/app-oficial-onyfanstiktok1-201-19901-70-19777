import { useState, useEffect, useRef } from 'react';
import { useReferralSystem } from '@/hooks/useReferralSystem';
import { useNudixWallet } from '@/hooks/useNudixWallet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Users, Gift, CheckCircle, Clock, Link2, TrendingUp, TrendingDown, Check } from 'lucide-react';
import { toast } from 'sonner';

// Hook para animação de contador
function useAnimatedCounter(targetValue: number, duration: number = 1500) {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (targetValue === 0 || hasAnimated.current) return;
    
    hasAnimated.current = true;
    const startValue = 0;
    
    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }
      
      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth deceleration
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = startValue + (targetValue - startValue) * easeOutQuart;
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetValue);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetValue, duration]);

  return displayValue;
}

export function ReferralSection() {
  const { 
    referrals, 
    stats, 
    loading, 
    referralLink, 
    copyReferralLink
  } = useReferralSystem();
  const { wallet, formatNudix } = useNudixWallet();
  const [showAllReferrals, setShowAllReferrals] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Animações de contador
  const animatedBalance = useAnimatedCounter(wallet.nudix_balance);
  const animatedEarned = useAnimatedCounter(wallet.total_earned, 1200);
  const animatedSpent = useAnimatedCounter(wallet.total_spent, 1200);

  const handleCopyLink = async () => {
    const success = await copyReferralLink();
    if (success) {
      setCopied(true);
      toast.success('Link copiado!', {
        description: 'Compartilhe com seus amigos'
      });
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Erro ao copiar link');
    }
  };


  const displayedReferrals = showAllReferrals ? referrals : referrals.slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Carteira Nudix - Gradiente CocoNudi */}
      <Card className="relative overflow-hidden bg-gradient-to-r from-[#7CB342] via-[#558B2F] to-[#C4842E] border-[#7CB342]/50 shadow-lg shadow-[#7CB342]/20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <CardHeader className="pb-2 relative">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Gift className="w-5 h-5 text-white" />
              </div>
              Minha Carteira Nudix
            </CardTitle>
            <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm font-bold">
              NUDIX
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="text-4xl font-bold text-white mb-3 drop-shadow-lg" style={{ textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>
            {formatNudix(animatedBalance)}
          </div>
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-1.5 text-white/90">
              <TrendingUp className="w-4 h-4 text-green-300" />
              <span>Ganho: <span className="font-semibold">{formatNudix(animatedEarned)}</span></span>
            </div>
            <div className="flex items-center gap-1.5 text-white/90">
              <TrendingDown className="w-4 h-4 text-red-300" />
              <span>Gasto: <span className="font-semibold">{formatNudix(animatedSpent)}</span></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Programa de Afiliados - Gradiente Verde Elegante */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-[#558B2F]/90 via-[#7CB342]/80 to-[#8B4513]/70 border-[#7CB342]/40 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        <CardHeader className="pb-2 relative">
          <CardTitle className="text-lg flex items-center gap-2 text-white">
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            Programa de Afiliados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 relative">
          <p className="text-sm text-white/90">
            Indique amigos e ganhe <span className="text-[#FFD54F] font-bold text-base">N$ 1,00</span> por cada cadastro!
          </p>

          {/* Link de Convite - Estilo Cupom */}
          {referralLink && (
            <div className="relative">
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/80" />
              <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/80" />
              <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm rounded-xl p-4 border-2 border-dashed border-white/30">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="w-4 h-4 text-[#FFD54F] animate-pulse" />
                  <p className="text-xs text-white/70 uppercase tracking-wider font-medium">Seu Link de Convite</p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-sm text-white bg-black/40 px-3 py-2 rounded-lg flex-1 truncate font-mono border border-white/10">
                    {referralLink}
                  </code>
                  <Button 
                    size="sm" 
                    onClick={handleCopyLink}
                    className={`shrink-0 transition-all duration-300 gap-2 px-4 ${
                      copied 
                        ? 'bg-green-500 hover:bg-green-600' 
                        : 'bg-gradient-to-r from-[#C4842E] to-[#8B4513] hover:from-[#D4943E] hover:to-[#9B5513]'
                    } text-white border-0 font-medium`}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </Button>
                </div>
                <p className="text-xs text-white/60 mt-2 text-center">
                  Copie e envie para seus amigos
                </p>
              </div>
            </div>
          )}



          {/* Estatísticas - Glassmorphism */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20 hover:bg-white/20 transition-all cursor-default">
              <div className="text-2xl font-bold text-white">{stats.totalReferrals}</div>
              <div className="text-xs text-white/70 mt-1">Indicações</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20 hover:bg-white/20 transition-all cursor-default">
              <div className="text-2xl font-bold text-green-300">{stats.completedReferrals}</div>
              <div className="text-xs text-white/70 mt-1">Confirmadas</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20 hover:bg-white/20 transition-all cursor-default">
              <div className="text-2xl font-bold text-[#FFD54F]">{formatNudix(stats.totalEarned)}</div>
              <div className="text-xs text-white/70 mt-1">Ganho Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Indicações */}
      {referrals.length > 0 && (
        <Card className="bg-gradient-to-br from-gray-900/80 to-gray-800/60 border-white/10 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-white/90">
              <Users className="w-4 h-4 text-[#7CB342]" />
              Suas Indicações 
              <Badge variant="secondary" className="bg-[#7CB342]/20 text-[#7CB342] border-[#7CB342]/30 ml-auto">
                {referrals.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {loading ? (
                <div className="text-center text-gray-400 py-4">Carregando...</div>
              ) : (
                <>
                  {displayedReferrals.map((referral, index) => (
                    <div 
                      key={referral.id} 
                      className="flex items-center justify-between bg-black/30 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-all"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          referral.status === 'completed' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {referral.status === 'completed' ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <Clock className="w-4 h-4" />
                          )}
                        </div>
                        <span className="text-sm text-white/80 truncate max-w-[140px]">
                          {referral.referred_email}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          className={`text-xs ${
                            referral.status === 'completed' 
                              ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                              : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                          }`}
                        >
                          {referral.status === 'completed' ? 'Confirmada' : 'Pendente'}
                        </Badge>
                        {referral.status === 'completed' && (
                          <span className="text-xs text-[#FFD54F] font-bold">
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
                      className="w-full text-[#7CB342] hover:text-[#8BC34A] hover:bg-[#7CB342]/10 mt-2"
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
