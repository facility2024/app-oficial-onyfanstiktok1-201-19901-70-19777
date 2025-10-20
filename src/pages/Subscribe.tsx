import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Subscribe = () => {
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<import('@supabase/supabase-js').Session | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');

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
              is_vip: true // Automaticamente liberar VIP para novos usuários
            }
          }
        });
        if (err) throw err;
        // Se o signup foi bem-sucedido, pular para o sucesso
        if (data.user) {
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
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Não foi possível concluir sua assinatura.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <section className="w-full max-w-md rounded-xl bg-card text-card-foreground shadow-xl p-6 space-y-4">
        <header className="text-center space-y-1">
          <h1 className="text-xl font-semibold">Acesso VIP</h1>
          <p className="text-sm text-muted-foreground">Desbloqueie todos os vídeos premium.</p>
        </header>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-2">
            {error}
          </div>
        )}

        {!session ? (
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Crie uma senha" />
            </div>
            <Button className="w-full" onClick={handleAuth} disabled={loading}>
              {loading ? 'Aguarde...' : mode === 'signup' ? 'Criar conta e entrar' : 'Entrar'}
            </Button>
            <button
              className="w-full text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
            >
              {mode === 'signup' ? 'Já tem conta? Entrar' : 'Novo por aqui? Criar conta'}
            </button>
          </div>
        ) : success ? (
          <div className="text-center space-y-4">
            <div className="text-base font-medium">Pronto! Seu acesso VIP foi ativado.</div>
            <Button asChild className="w-full">
              <a href="/app">Abrir o App</a>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <Button className="w-full" onClick={handleVip} disabled={loading}>
              {loading ? 'Enviando...' : 'Ativar VIP'}
            </Button>
            <button className="w-full text-xs text-muted-foreground hover:text-foreground" onClick={() => supabase.auth.signOut()}>
              Trocar de conta
            </button>
          </div>
        )}
        <link rel="canonical" href={window.location.origin + '/subscribe'} />
      </section>
    </main>
  );
};

export default Subscribe;
