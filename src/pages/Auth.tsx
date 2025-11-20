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
import { Loader2 } from 'lucide-react';

// Schema de validação
const loginSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(100, 'Senha muito longa'),
});

const signupSchema = loginSchema.extend({
  name: z.string().trim().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100, 'Nome muito longo'),
});

const Auth = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-border shadow-2xl">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <img src={coconudiLogo} alt="COCONUDI" className="h-16 object-contain" />
          </div>
          <div className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold text-foreground">
              {mode === 'login' ? 'Bem-vindo de volta' : 'Criar conta'}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {mode === 'login' 
                ? 'Entre para acessar conteúdo exclusivo' 
                : 'Cadastre-se para começar'}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={mode === 'login' ? handleSignIn : handleSignUp} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Nome Completo</Label>
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
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
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
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Senha</Label>
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
            
            <Button 
              type="submit" 
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Aguarde...
                </>
              ) : (
                mode === 'login' ? 'Entrar' : 'Criar Conta'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
