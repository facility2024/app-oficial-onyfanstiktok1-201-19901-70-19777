import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AgeVerificationScreenProps {
  onVerified: () => void;
}

export const AgeVerificationScreen = ({ onVerified }: AgeVerificationScreenProps) => {
  const [email, setEmail] = useState('');
  const [isOver18, setIsOver18] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !isOver18) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Por favor, insira um email válido');
      return;
    }

    setIsLoading(true);

    try {
      // Salvar na base de dados
      const { error } = await supabase
        .from('app_users')
        .insert([
          {
            email: email.toLowerCase(),
            nome: 'Usuário TikTok',
            whatsapp: '',
            maior_idade: isOver18
          }
        ]);

      if (error) {
        // Se já existe, ignorar erro e continuar
        if (error.code === '23505') {
          console.log('Email já cadastrado, liberando acesso...');
        } else {
          throw error;
        }
      }

      // Salvar no localStorage
      localStorage.setItem('tiktok_user_verified', 'true');
      localStorage.setItem('tiktok_user_email', email);
      
      toast.success('Acesso liberado! Aproveite o conteúdo.');
      onVerified();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao processar cadastro. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🔞</div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Conteúdo +18
          </h1>
          <p className="text-gray-400 text-sm">
            Este aplicativo é exclusivo para maiores de 18 anos
          </p>
        </div>

        <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-lg p-4 mb-6">
          <p className="text-white text-sm text-center">
            💎 Digite seu email válido para receber ofertas e prêmios exclusivos!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
            />
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="age"
              checked={isOver18}
              onCheckedChange={(checked) => setIsOver18(checked as boolean)}
              required
              className="mt-1"
            />
            <Label
              htmlFor="age"
              className="text-white text-sm leading-relaxed cursor-pointer"
            >
              Confirmo que tenho mais de 18 anos de idade e concordo em receber conteúdo adulto *
            </Label>
          </div>

          <Button
            type="submit"
            disabled={isLoading || !email || !isOver18}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-6 text-lg"
          >
            {isLoading ? 'Verificando...' : 'Acessar Agora'}
          </Button>
        </form>

        <p className="text-gray-500 text-xs text-center mt-6">
          Seus dados estão protegidos e não serão compartilhados
        </p>
      </div>
    </div>
  );
};
