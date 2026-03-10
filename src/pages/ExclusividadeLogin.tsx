import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import rainbowLogo from '@/assets/coconudi-rainbow-logo.png';

const ExclusividadeLogin = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Email inválido');
      return;
    }
    setLoading(true);
    sessionStorage.setItem('exclusividade_user', JSON.stringify({ name: name.trim(), email: email.trim() }));
    toast.success('Bem-vindo(a) à área exclusiva!');
    navigate('/exclusividade/conteudo');
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center relative"
      style={{
        backgroundImage: 'url(https://tiktokonyfans.b-cdn.net/material%20coconudi/destbard.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-black/30" />

      <Card className="w-full max-w-md relative z-10 border-2 border-white/20 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.4)] rounded-3xl overflow-hidden bg-transparent">
        <div className="flex flex-col items-center pt-10 pb-4">
          <img src={rainbowLogo} alt="CocoNudi Exclusivo" className="h-20 object-contain drop-shadow-lg" />
          <h1 className="text-2xl font-bold text-white mt-4 drop-shadow-lg">Área Exclusiva</h1>
          <p className="text-white/80 text-sm mt-1">Acesse conteúdos exclusivos</p>
        </div>

        <CardContent className="px-8 pb-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="exc-name" className="text-white font-semibold text-sm drop-shadow">
                Nome
              </Label>
              <Input
                id="exc-name"
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                className="bg-white/95 border-2 border-white/20 text-black placeholder:text-black/50 focus:border-white/40 focus:bg-white rounded-xl h-12 shadow-inner transition-all duration-200 hover:bg-white focus:shadow-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exc-email" className="text-white font-semibold text-sm drop-shadow">
                Email
              </Label>
              <Input
                id="exc-email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
                className="bg-white/95 border-2 border-white/20 text-black placeholder:text-black/50 focus:border-white/40 focus:bg-white rounded-xl h-12 shadow-inner transition-all duration-200 hover:bg-white focus:shadow-lg"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white hover:bg-black font-semibold py-3 h-12 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? 'Entrando...' : 'Acessar Conteúdo'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExclusividadeLogin;
