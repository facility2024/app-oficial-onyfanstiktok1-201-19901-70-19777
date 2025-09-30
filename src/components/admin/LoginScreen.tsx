import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

const TypewriterText = ({ text, delay = 100 }: { text: string; delay?: number }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, delay);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, delay, text]);

  return <span>{displayedText}</span>;
};

export const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error('Email ou senha incorretos!');
        return;
      }

      if (data.user) {
        // Verificar se o usuário é admin
        const { data: isAdminData, error: adminError } = await supabase.rpc('is_admin');
        
        if (adminError || !isAdminData) {
          await supabase.auth.signOut();
          toast.error('Acesso negado. Apenas administradores podem entrar.');
          return;
        }

        toast.success('Login realizado com sucesso!');
        onLogin(data.user);
      }
    } catch (error) {
      toast.error('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: 'url("/lovable-uploads/e93594ee-908d-46f2-a59d-4000b64079a4.png")'
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      
      {/* Card with glass effect and depth */}
      <Card className="w-full max-w-md relative z-10 animate-fade-in border-2 border-white/20 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.1)] rounded-3xl overflow-hidden">
        
        {/* Header with typewriter effect */}
        <div 
          className="rounded-t-3xl p-8 border-b border-white/10"
          style={{
            backgroundImage: 'linear-gradient(135deg, #ffb200, #fdb410, #fbb61b, #fab724, #f8b92b)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)'
          }}
        >
          <CardHeader className="p-0">
            <CardTitle className="text-3xl text-black font-bold text-center mb-2 min-h-[36px]">
              <TypewriterText text="Facility-SOFTWARE" delay={80} />
            </CardTitle>
            <p className="text-black/80 text-center text-sm font-medium">
              Área Restrita - Admin Panel
            </p>
          </CardHeader>
        </div>
        
        {/* Content with enhanced styling */}
        <CardContent 
          className="p-8"
          style={{
            backgroundImage: 'linear-gradient(135deg, #ffb200, #fdb410, #fbb61b, #fab724, #f8b92b)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)'
          }}
        >
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="email" className="text-black font-semibold text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Digite seu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/95 border-2 border-black/10 text-black placeholder:text-black/50 focus:border-black/30 focus:bg-white rounded-xl h-12 shadow-inner transition-all duration-200 hover:bg-white focus:shadow-lg"
              />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="password" className="text-black font-semibold text-sm">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/95 border-2 border-black/10 text-black placeholder:text-black/50 focus:border-black/30 focus:bg-white rounded-xl h-12 shadow-inner transition-all duration-200 hover:bg-white focus:shadow-lg"
              />
            </div>
            
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-black/90 text-white hover:bg-black font-semibold py-3 h-12 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-black/60 font-medium">
              © 2024 Facility Software - Todos os direitos reservados
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};