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
import { Loader2 } from 'lucide-react';

// Schema de validação
const loginSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(100, 'Senha muito longa'),
});

const signupSchema = loginSchema.extend({
  name: z.string().trim().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100, 'Nome muito longo'),
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
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Redirecionar se já estiver logado
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/app');
      }
    });
  }, [navigate]);

  // Detectar modo reset na URL
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
    
    if (modeParam === 'reset-password') {
      setMode('reset-password');
    }
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Validar dados
      const validated = signupSchema.parse({ email, password, name });
      
      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          data: { 
            full_name: validated.name,
          },
          emailRedirectTo: `${window.location.origin}/app`
        }
      });
      
      if (error) throw error;
      
      // Se confirmação de email está desabilitada, já vai ter sessão
      if (data.session) {
        toast.success('Conta criada com sucesso!');
        navigate('/app');
      } else {
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
      navigate('/app');
      
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

  const renderCard = () => (
    <Card className="w-full max-w-[95vw] md:w-[467px] bg-card shadow-2xl border-0 overflow-y-auto max-h-[90vh]">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex flex-col items-center justify-center space-y-1">
          <img src={coconudiLogo} alt="COCONUDI" className="h-10 md:h-12 object-contain animate-float" />
          <h1 className="text-lg md:text-xl font-bold text-foreground tracking-wide">CocoNudi</h1>
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
        className="md:hidden min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://tiktokonyfans.b-cdn.net/ANIMAÇÕES%20ONYFANS/Design%20sem%20nome%20(6).png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="relative p-1 rounded-lg" style={{
          background: 'linear-gradient(135deg, #a855f7, #7c3aed, #6b21a8, #000000)'
        }}>
          {renderCard()}
        </div>
      </div>
      
      {/* Background para Desktop */}
      <div 
        className="hidden md:flex min-h-screen items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${loginBackground})`
        }}
      >
        <div className="relative p-1 rounded-lg" style={{
          background: 'linear-gradient(135deg, #a855f7, #7c3aed, #6b21a8, #000000)'
        }}>
          {renderCard()}
        </div>
      </div>
    </>
  );
};

export default Auth;