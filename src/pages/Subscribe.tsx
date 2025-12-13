import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Crown, Check, ArrowLeft, Sparkles, Lock, Star, Zap } from 'lucide-react';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';

const Subscribe = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<import('@supabase/supabase-js').Session | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const { setPremiumStatus } = usePremiumStatus();

  // Auth fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // VIP fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Assinatura VIP – Conteúdo premium';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Torne-se VIP para desbloquear vídeos premium.');
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              is_vip: true
            }
          }
        });
        if (err) throw err;
        if (data.user) {
          setPremiumStatus(true, email);
          setSuccess(true);
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
    } catch (e: any) {
      setError(e.message || 'Falha na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  const handleVip = async () => {
    if (!session?.user) return;
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({
        data: { is_vip: true, vip_name: name, vip_phone: phone },
      });
      if (err) throw err;
      setPremiumStatus(true, session.user.email || '');
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Não foi possível concluir sua assinatura.');
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    { icon: Lock, text: 'Acesso a todos os vídeos premium' },
    { icon: Star, text: 'Conteúdo exclusivo de criadores' },
    { icon: Zap, text: 'Sem anúncios ou interrupções' },
    { icon: Sparkles, text: 'Novos vídeos VIP toda semana' },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex flex-col">
      {/* Header */}
      <div className="p-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 mb-4">
              <Crown className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold">Acesso VIP</h1>
            <p className="text-gray-400">Desbloqueie todos os vídeos premium e aproveite conteúdo exclusivo</p>
          </div>

          {/* Benefits */}
          <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30 p-4">
            <div className="space-y-3">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <benefit.icon className="w-4 h-4 text-yellow-500" />
                  </div>
                  <span className="text-sm text-white">{benefit.text}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Main Card */}
          <Card className="bg-gray-900/50 border-gray-700 p-6 space-y-4">
            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md p-3">
                {error}
              </div>
            )}

            {!session ? (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-gray-300">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="seu@email.com"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password" className="text-gray-300">Senha</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="Crie uma senha"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <Button 
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold" 
                  onClick={handleAuth} 
                  disabled={loading}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  {loading ? 'Aguarde...' : mode === 'signup' ? 'Criar conta VIP' : 'Entrar'}
                </Button>
                <button
                  className="w-full text-sm text-gray-400 hover:text-white transition-colors"
                  onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
                >
                  {mode === 'signup' ? 'Já tem conta? Entrar' : 'Novo por aqui? Criar conta'}
                </button>
              </div>
            ) : success ? (
              <div className="text-center space-y-6 py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-2">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">Parabéns! 🎉</h2>
                  <p className="text-gray-400">Seu acesso VIP foi ativado com sucesso.</p>
                </div>
                <Button 
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                  onClick={() => navigate('/app')}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Explorar Conteúdo Premium
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-400 text-center">Complete seu perfil para ativar o VIP</p>
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-gray-300">Nome</Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Seu nome completo"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone" className="text-gray-300">Telefone</Label>
                  <Input 
                    id="phone" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="(11) 99999-9999"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <Button 
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                  onClick={handleVip} 
                  disabled={loading}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  {loading ? 'Ativando...' : 'Ativar VIP Agora'}
                </Button>
                <button 
                  className="w-full text-sm text-gray-400 hover:text-white transition-colors" 
                  onClick={() => supabase.auth.signOut()}
                >
                  Trocar de conta
                </button>
              </div>
            )}
          </Card>

          {/* Price Badge */}
          <div className="text-center">
            <span className="inline-block px-4 py-2 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">
              ✨ Acesso gratuito por tempo limitado
            </span>
          </div>
        </div>
      </div>

      <link rel="canonical" href={window.location.origin + '/subscribe'} />
    </main>
  );
};

export default Subscribe;
