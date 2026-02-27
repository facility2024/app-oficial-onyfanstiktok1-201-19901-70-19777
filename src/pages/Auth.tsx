import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { z } from 'zod';
import { toast } from 'sonner';
import coconudiLogo from '@/assets/coconudi-logo-new.png';
import loginBackground from '@/assets/login-background.png';
import loginBackgroundMobile from '@/assets/login-background-mobile.png';
import { Loader2, Mail, RefreshCw } from 'lucide-react';

// Schema de validação
const loginSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(100, 'Senha muito longa'),
});

const signupSchema = loginSchema.extend({
  name: z.string().trim().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100, 'Nome muito longo'),
  phone: z.string().trim().min(10, 'Telefone deve ter no mínimo 10 dígitos').max(20, 'Telefone muito longo'),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
});

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(100, 'Senha muito longa'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

const Auth = () => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot-password' | 'reset-password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const navigate = useNavigate();

  // Preload de imagens críticas
  useEffect(() => {
    const link1 = document.createElement('link');
    link1.rel = 'preload';
    link1.as = 'image';
    link1.href = loginBackground;
    link1.fetchPriority = 'high';
    document.head.appendChild(link1);

    const link2 = document.createElement('link');
    link2.rel = 'preload';
    link2.as = 'image';
    link2.href = coconudiLogo;
    link2.fetchPriority = 'high';
    document.head.appendChild(link2);

    return () => {
      if (link1.parentNode) link1.parentNode.removeChild(link1);
      if (link2.parentNode) link2.parentNode.removeChild(link2);
    };
  }, []);

  // Redirecionar se já estiver logado
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const returnTo = localStorage.getItem('returnTo') || '/app';
        localStorage.removeItem('returnTo');
        localStorage.removeItem('requiresLogin');
        navigate(returnTo);
      }
    });
  }, [navigate]);

  // Mostrar mensagem se veio do app por limite de vídeos
  useEffect(() => {
    const requiresLogin = localStorage.getItem('requiresLogin');
    if (requiresLogin === 'true') {
      toast.info('Faça login para continuar assistindo vídeos ilimitados!', {
        duration: 5000
      });
    }
  }, []);

  // Detectar modo reset e código de referência na URL
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    
    if (type === 'recovery' && accessToken) {
      setMode('reset-password');
      toast.info('Defina sua nova senha abaixo.');
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const modeParam = urlParams.get('mode');
    const refCode = urlParams.get('ref');
    
    if (modeParam === 'reset-password') {
      setMode('reset-password');
    }
    
    // Salvar código de referência para uso no cadastro
    if (refCode) {
      sessionStorage.setItem('referral_code', refCode.toUpperCase());
      setMode('signup');
      toast.info('🎁 Cadastre-se com o convite e ganhe benefícios!', { duration: 5000 });
    }
  }, []);

  const formatPhoneInput = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Normalizar telefone (só números)
      const normalizedPhone = phone.replace(/\D/g, '');
      
      // Recuperar código de referência (se houver)
      const referralCode = sessionStorage.getItem('referral_code');
      
      // Validar dados
      const validated = signupSchema.parse({ email, password, name, phone: normalizedPhone });
      
      console.log('📝 Iniciando cadastro...', { email: validated.email, referralCode });
      
      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          data: { 
            full_name: validated.name,
            phone: validated.phone,
            referral_code: referralCode,
          },
          emailRedirectTo: `${window.location.origin}/app`
        }
      });
      
      if (error) throw error;
      
      // Se tem usuário criado, processar referência
      if (data.user) {
        console.log('✅ Usuário criado:', data.user.id);
        
        // Processar indicação se houver código de referência
        if (referralCode) {
          console.log('🎁 Processando código de referência:', referralCode);
          
          try {
            // Buscar quem indicou pelo código (case-insensitive)
            const { data: referrerProfile, error: refError } = await supabase
              .from('profiles')
              .select('id')
              .ilike('referral_code', referralCode)
              .maybeSingle();
            
            if (refError) {
              console.error('❌ Erro ao buscar referenciador:', refError);
            }
            
            if (referrerProfile?.id) {
              console.log('✅ Referenciador encontrado:', referrerProfile.id);
              
              // Salvar dados para processamento posterior (backup)
              localStorage.setItem('pending_referral', JSON.stringify({
                referrerId: referrerProfile.id,
                referralCode: referralCode,
                userId: data.user.id,
                email: validated.email,
                timestamp: Date.now()
              }));
              
              // Aguardar o perfil ser criado pelo trigger (com retry aumentado)
              let profileUpdated = false;
              for (let attempt = 1; attempt <= 8 && !profileUpdated; attempt++) {
                await new Promise(resolve => setTimeout(resolve, 800 * attempt));
                
                // Verificar se perfil existe
                const { data: existingProfile } = await supabase
                  .from('profiles')
                  .select('id')
                  .eq('id', data.user.id)
                  .maybeSingle();
                
                if (!existingProfile) {
                  console.log(`⏳ Tentativa ${attempt}/8: Perfil ainda não existe`);
                  continue;
                }
                
                const { error: updateError } = await supabase
                  .from('profiles')
                  .update({ 
                    referred_by: referrerProfile.id,
                    phone: validated.phone
                  } as any)
                  .eq('id', data.user.id);
                
                if (!updateError) {
                  profileUpdated = true;
                  console.log('✅ Perfil atualizado com referred_by na tentativa', attempt);
                  
                  // Remover pendente se sucesso
                  localStorage.removeItem('pending_referral');
                } else {
                  console.log(`⏳ Tentativa ${attempt}/8 falhou:`, updateError.message);
                }
              }
              
              // Chamar RPC para processar bônus (independente do update)
              let bonusProcessed = false;
              for (let attempt = 1; attempt <= 5 && !bonusProcessed; attempt++) {
                try {
                  const { data: rpcResult, error: rpcError } = await (supabase.rpc as any)('process_referral_completion', {
                    p_referrer_id: referrerProfile.id,
                    p_referred_id: data.user.id,
                    p_referred_email: validated.email
                  });
                  
                  if (!rpcError && rpcResult === true) {
                    bonusProcessed = true;
                    console.log('✅ Bônus processado via RPC!');
                    localStorage.removeItem('pending_referral');
                    toast.success('🎁 Você foi indicado! Seu amigo ganhou N$ 1,00!');
                  } else {
                    console.log(`⏳ RPC tentativa ${attempt}/5:`, rpcError?.message || 'resultado false');
                    await new Promise(resolve => setTimeout(resolve, 500 * attempt));
                  }
                } catch (rpcError) {
                  console.log(`⏳ RPC tentativa ${attempt}/5 erro:`, rpcError);
                  await new Promise(resolve => setTimeout(resolve, 500 * attempt));
                }
              }
              
              if (!bonusProcessed) {
                // Manter pendente para processar após confirmação de email
                console.log('ℹ️ RPC não confirmou, pendente salvo para reprocessar');
                toast.success('🎁 Você foi indicado! Bem-vindo ao COCONUDI!');
              }
            } else {
              console.warn('⚠️ Código de referência inválido ou não encontrado:', referralCode);
            }
          } catch (refError) {
            console.error('❌ Erro no sistema de referência:', refError);
          }
          
          sessionStorage.removeItem('referral_code');
        } else {
          // Sem código de referência - apenas atualizar telefone
          setTimeout(async () => {
            await supabase
              .from('profiles')
              .update({ phone: validated.phone } as any)
              .eq('id', data.user!.id);
          }, 1000);
        }
      }
      
      // Se confirmação de email está desabilitada, já vai ter sessão
      if (data.session) {
        toast.success('Conta criada com sucesso!');
        const returnTo = localStorage.getItem('returnTo') || '/app';
        localStorage.removeItem('returnTo');
        localStorage.removeItem('requiresLogin');
        navigate(returnTo);
      } else {
        // Email precisa confirmação - mostrar tela de aguarde
        setRegisteredEmail(validated.email);
        setAwaitingConfirmation(true);
        toast.success('Conta criada! Verifique seu email para confirmar.');
      }
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else if (error.message?.includes('already registered')) {
        toast.error('Este email já está cadastrado. Tente fazer login.');
      } else {
        toast.error(error.message || 'Erro ao criar conta');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Validar dados
      const validated = loginSchema.parse({ email, password });
      
      const { error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password
      });
      
      if (error) throw error;
      
      toast.success('Login realizado com sucesso!');
      const returnTo = localStorage.getItem('returnTo') || '/app';
      localStorage.removeItem('returnTo');
      localStorage.removeItem('requiresLogin');
      navigate(returnTo);
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else if (error.message?.includes('Invalid login credentials')) {
        toast.error('Email ou senha incorretos.');
      } else {
        toast.error(error.message || 'Erro ao fazer login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const validated = forgotPasswordSchema.parse({ email });
      
      const { error } = await supabase.auth.resetPasswordForEmail(validated.email, {
        redirectTo: `${window.location.origin}/auth?mode=reset-password`,
      });
      
      if (error) throw error;
      
      toast.success('Se este email estiver cadastrado, você receberá um link de recuperação.');
      
      setTimeout(() => {
        setMode('login');
        setEmail('');
      }, 3000);
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || 'Erro ao enviar email de recuperação');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const validated = resetPasswordSchema.parse({ 
        password: newPassword, 
        confirmPassword 
      });
      
      const { error } = await supabase.auth.updateUser({
        password: validated.password
      });
      
      if (error) throw error;
      
      toast.success('Senha alterada com sucesso! Você já pode fazer login.');
      
      setMode('login');
      setNewPassword('');
      setConfirmPassword('');
      navigate('/auth');
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || 'Erro ao redefinir senha');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: registeredEmail,
      });
      
      if (error) throw error;
      
      toast.success('Email de confirmação reenviado!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao reenviar email');
    } finally {
      setLoading(false);
    }
  };

  const renderAwaitingConfirmation = () => (
    <Card className="w-full max-w-[95vw] md:w-[467px] bg-card shadow-2xl border-0">
      <CardHeader className="space-y-4 text-center pb-2">
        <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
          <Mail className="w-8 h-8 text-green-500" />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-xl font-bold text-foreground">
            Verifique seu Email
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Enviamos um link de confirmação para:
            <br />
            <span className="font-semibold text-foreground">{registeredEmail}</span>
          </CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-2">
        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
          <p>📧 Clique no link enviado para ativar sua conta.</p>
          <p className="mt-2">⚠️ Não recebeu? Verifique a pasta de spam.</p>
        </div>
        
        <Button
          variant="default"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => {
            setAwaitingConfirmation(false);
            setMode('login');
            setEmail(registeredEmail);
            setPassword('');
          }}
        >
          Já confirmei, fazer login
        </Button>
        
        <Button
          variant="ghost"
          className="w-full text-sm"
          onClick={handleResendConfirmation}
          disabled={loading}
        >
          {loading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Reenviando...
            </>
          ) : (
            'Reenviar email de confirmação'
          )}
        </Button>
        
        <div className="text-center">
          <button
            onClick={() => {
              setAwaitingConfirmation(false);
              setMode('signup');
              setEmail('');
              setPassword('');
              setName('');
              setPhone('');
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Usar outro email
          </button>
        </div>
      </CardContent>
    </Card>
  );

  const renderCard = () => (
    <Card className="w-full max-w-[95vw] md:w-[467px] bg-card shadow-2xl border-0">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex flex-col items-center justify-center space-y-2">
          <img 
            src={coconudiLogo} 
            alt="COCONUDI" 
            className="h-16 md:h-20 object-contain" 
            loading="eager"
            fetchPriority="high"
          />
        </div>
        <div className="text-center space-y-1">
          <CardTitle className="text-lg md:text-xl font-bold text-foreground">
            {mode === 'login' && 'Bem-vindo de volta'}
            {mode === 'signup' && 'Criar conta'}
            {mode === 'forgot-password' && 'Recuperar senha'}
            {mode === 'reset-password' && 'Redefinir senha'}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {mode === 'login' && 'Entre para acessar conteúdo exclusivo'}
            {mode === 'signup' && 'Cadastre-se para começar'}
            {mode === 'forgot-password' && 'Enviaremos um link para seu email'}
            {mode === 'reset-password' && 'Digite sua nova senha'}
          </CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 px-4 md:px-6">
        <form onSubmit={
          mode === 'login' ? handleSignIn : 
          mode === 'signup' ? handleSignUp : 
          mode === 'forgot-password' ? handleForgotPassword : 
          handleResetPassword
        } className="space-y-3">
          {mode === 'signup' && (
            <>
              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs md:text-sm text-foreground">Nome Completo</Label>
                <Input 
                  id="name" 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-background border-border text-foreground"
                  placeholder="Seu nome"
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone" className="text-xs md:text-sm text-foreground">Telefone (WhatsApp)</Label>
                <Input 
                  id="phone" 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                  className="bg-background border-border text-foreground"
                  placeholder="(00) 00000-0000"
                  required
                  disabled={loading}
                />
                <p className="text-[10px] text-muted-foreground">Use o mesmo número para pagamentos VIP</p>
              </div>
            </>
          )}
          
          <div className="space-y-1">
            <Label htmlFor="email" className="text-xs md:text-sm text-foreground">Email</Label>
            <Input 
              id="email" 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background border-border text-foreground"
              placeholder="seu@email.com"
              required
              disabled={loading}
            />
          </div>
          
          {mode === 'login' && (
            <>
              <div className="space-y-1">
                <Label htmlFor="password" className="text-xs md:text-sm text-foreground">Senha</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background border-border text-foreground"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot-password');
                    setPassword('');
                  }}
                  className="text-sm text-primary hover:underline transition-colors"
                  disabled={loading}
                >
                  Esqueci minha senha
                </button>
              </div>
            </>
          )}

          {mode === 'signup' && (
            <div className="space-y-1">
              <Label htmlFor="password" className="text-xs md:text-sm text-foreground">Senha</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background border-border text-foreground"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>
          )}

          {mode === 'forgot-password' && (
            <p className="text-xs text-muted-foreground">
              Enviaremos um link de recuperação para este email.
            </p>
          )}

          {mode === 'reset-password' && (
            <>
              <div className="space-y-1">
                <Label htmlFor="newPassword" className="text-xs md:text-sm text-foreground">Nova Senha</Label>
                <Input 
                  id="newPassword" 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-background border-border text-foreground"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="confirmPassword" className="text-xs md:text-sm text-foreground">Confirmar Senha</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-background border-border text-foreground"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>
            </>
          )}
          
          <Button 
            type="submit" 
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === 'forgot-password' ? 'Enviando...' : 
                 mode === 'reset-password' ? 'Redefinindo...' : 
                 'Aguarde...'}
              </>
            ) : (
              <>
                {mode === 'login' && 'Entrar'}
                {mode === 'signup' && 'Criar Conta'}
                {mode === 'forgot-password' && 'Enviar link de recuperação'}
                {mode === 'reset-password' && 'Redefinir Senha'}
              </>
            )}
          </Button>
          
          {mode === 'forgot-password' && (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setMode('login');
                setEmail('');
              }}
              disabled={loading}
            >
              Voltar para login
            </Button>
          )}
        </form>
        
        <div className="mt-4 text-center">
          {(mode === 'login' || mode === 'signup') && (
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setEmail('');
                setPassword('');
                setName('');
                setPhone('');
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              disabled={loading}
            >
              {mode === 'login' 
                ? 'Não tem conta? Cadastre-se' 
                : 'Já tem conta? Entrar'}
            </button>
          )}
          
          {(mode === 'forgot-password' || mode === 'reset-password') && (
            <button
              onClick={() => {
                setMode('login');
                setEmail('');
                setPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              disabled={loading}
            >
              ← Voltar para login
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      {/* Background para Mobile */}
      <div 
        className="md:hidden min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundImage: `url(${loginBackgroundMobile})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          minHeight: '100vh',
          width: '100%'
        }}
      >
        <div className="relative p-1 rounded-lg" style={{
          background: 'linear-gradient(135deg, #a855f7, #7c3aed, #6b21a8, #000000)'
        }}>
          {awaitingConfirmation ? renderAwaitingConfirmation() : renderCard()}
        </div>
      </div>
      
      {/* Background para Desktop */}
      <div 
        className="hidden md:flex min-h-screen items-center justify-center p-4 bg-cover bg-center bg-no-repeat will-change-contents"
        style={{
          backgroundImage: `url(${loginBackground})`,
          imageRendering: 'crisp-edges'
        }}
      >
        <div className="relative p-1 rounded-lg will-change-transform" style={{
          background: 'linear-gradient(135deg, #a855f7, #7c3aed, #6b21a8, #000000)'
        }}>
          {awaitingConfirmation ? renderAwaitingConfirmation() : renderCard()}
        </div>
      </div>
    </>
  );
};

export default Auth;